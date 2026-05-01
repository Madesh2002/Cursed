import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'stalker-config.json');

const defaultConfig = {
    host: 'tv.saartv.cc',
    mac_address: '00:1A:79:00:4D:84',
    serial_number: '58E6A1E78FB02',
    device_id: '6AD7860A1E2D78D9961D17DFA34D4C70D06CFFC1F807B8115F627648121C4339',
    device_id_2: '6AD7860A1E2D78D9961D17DFA34D4C70D06CFFC1F807B8115F627648121C4339',
    stb_type: 'MAG250',
    api_signature: '263',
    hw_version: '',
    hw_version_2: ''
};

function getStalkerConfigSync() {
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Error reading local config:", e);
    }
    return defaultConfig;
}

const app = express();
app.use(express.json());

const tokensPath = path.join(process.cwd(), 'active_tokens.json');

function syncTokenStorage(token: string, expiryTime: number, username?: string) {
    try {
        let tokens: any = {};
        if (fs.existsSync(tokensPath)) {
            tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        }
        
        const existingData = tokens[token] || {};
        
        // Preserve username if it exists and a new one isn't provided
        let currentUsername = existingData.username || '';
        if (username !== undefined) {
           currentUsername = username;
        }

        tokens[token] = { 
            expiryTime, 
            username: currentUsername,
            blocked: existingData.blocked || false,
            devices: existingData.devices || {}
        };
        
        // Cleanup expired tokens
        const now = Date.now();
        for (const t in tokens) {
            // backward compatibility check
            const expiry = typeof tokens[t] === 'number' ? tokens[t] : tokens[t]?.expiryTime;
            if (expiry && expiry < now) delete tokens[t];
        }
        fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
    } catch (e) {
        console.error("Error setting token:", e);
    }
}

function verifyToken(token: string): boolean {
    if (!token) return false;
    try {
        if (!fs.existsSync(tokensPath)) return false;
        const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        const tokenData = tokens[token];
        if (!tokenData) return false;
        
        const expiry = typeof tokenData === 'number' ? tokenData : tokenData.expiryTime;
        if (!expiry) return false;
        if (Date.now() > expiry) return false;
        if (tokenData.blocked) return false;
        return true;
    } catch (e) {
        return false;
    }
}

function trackAndVerifyDevice(token: string, ip: string, ua: string): boolean {
    if (!token) return false;
    try {
        if (!fs.existsSync(tokensPath)) return false;
        const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        let tokenData = tokens[token];
        
        if (!tokenData) return false;
        
        if (typeof tokenData === 'number') {
            tokens[token] = { expiryTime: tokenData, username: '', blocked: false, devices: {} };
            tokenData = tokens[token];
        }
        
        const expiry = tokenData.expiryTime;
        if (!expiry || Date.now() > expiry) return false;
        
        if (tokenData.blocked) return false;

        if (!tokenData.devices) tokenData.devices = {};
        
        const deviceId = crypto.createHash('md5').update(`${ip}-${ua}`).digest('hex');
        
        if (!tokenData.devices[deviceId]) {
            const deviceCount = Object.keys(tokenData.devices).length;
            if (deviceCount >= 4) {
               tokenData.blocked = true;
               fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
               console.log(`Token ${token} blocked due to >4 devices. IP: ${ip}`);
               return false;
            }
        }
        
        tokenData.devices[deviceId] = {
           ip,
           userAgent: ua,
           lastSeen: Date.now()
        };
        
        console.log(`[Token: ${token}] Accessed by Device: ${ip} | UA: ${ua}`);
        fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
        return true;

    } catch (e) {
        console.error("Device track error:", e);
        return false;
    }
}

function checkRecovery(token: string, username: string): boolean {
    if (!token || !username) return false;
    try {
        if (!fs.existsSync(tokensPath)) return false;
        const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        const tokenData = tokens[token];
        if (!tokenData) return false;
        return tokenData.username === username;
    } catch (e) {
        return false;
    }
}

function isAllowedUserAgent(ua: string | undefined): boolean {
    if (!ua) return true; // Many IPTV players send empty headers
    const lowerUA = ua.toLowerCase();
    
    // Explicitly allowed even if it contains "mozilla"
    if (lowerUA.includes('ott') || lowerUA.includes('tivimate') || lowerUA.includes('ns player') || lowerUA.includes('iptv') || lowerUA.includes('exoplayer')) {
        return true;
    }

    // Block typical browsers
    if (lowerUA.includes('mozilla') && (lowerUA.includes('chrome') || lowerUA.includes('safari') || lowerUA.includes('edge') || lowerUA.includes('opera'))) {
        return false;
    }
    
    // Allow others
    return true; 
}

app.post('/api/tokens', (req, res) => {
    const { token, expiryTime, username } = req.body;
    if (token && expiryTime) {
        syncTokenStorage(token, expiryTime, username);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Missing token or expiryTime' });
    }
});

app.post('/api/recover', (req, res) => {
    const { token, username } = req.body;
    if (checkRecovery(token, username)) {
        res.json({ success: true });
    } else {
        res.status(403).json({ error: 'Invalid token or username' });
    }
});

app.get('/api/tokens/:token', (req, res) => {
    const { token } = req.params;
    try {
        if (!fs.existsSync(tokensPath)) {
            return res.json({ error: 'No tokens found' });
        }
        const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        const tokenData = tokens[token];
        
        if (tokenData) {
           const devices = tokenData.devices || {};
           const formattedDevices = Object.keys(devices).map(deviceId => ({
               id: deviceId,
               ip: devices[deviceId].ip,
               userAgent: devices[deviceId].userAgent,
               lastSeen: devices[deviceId].lastSeen
           }));
           
           res.json({
               expiryTime: tokenData.expiryTime,
               username: tokenData.username || '',
               blocked: tokenData.blocked || false,
               devices: formattedDevices
           });
        } else {
           res.status(404).json({ error: 'Token not found' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/tokens/:token/devices/:deviceId', (req, res) => {
    const { token, deviceId } = req.params;
    try {
        if (!fs.existsSync(tokensPath)) {
            return res.status(404).json({ error: 'No tokens found' });
        }
        const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        const tokenData = tokens[token];
        
        if (tokenData && tokenData.devices && tokenData.devices[deviceId]) {
            delete tokenData.devices[deviceId];
            // If device limit drops below 4, optionally unblock?
            if (Object.keys(tokenData.devices).length < 4) {
                tokenData.blocked = false;
            }
            fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Device not found' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/settings/config', (req, res) => {
    res.json(getStalkerConfigSync());
});

app.post('/api/settings/config', (req, res) => {
    try {
        fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

async function getStalkerConfig() {
    return getStalkerConfigSync();
}

async function hash(str: string) {
    return crypto.createHash('md5').update(str).digest('hex');
}

async function generateHardwareVersions(config: any) {
    config.hw_version = '1.7-BD-' + (await hash(config.mac_address)).substring(0, 2).toUpperCase();
    config.hw_version_2 = await hash(config.serial_number.toLowerCase() + config.mac_address.toLowerCase());
}

function getHeaders(config: any, token = '') {
    const headers: Record<string, string> = {
        'Cookie': `mac=${config.mac_address}; stb_lang=en; timezone=GMT`,
        'Referer': `http://${config.host}/stalker_portal/c/`,
        'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
        'X-User-Agent': `Model: ${config.stb_type}; Link: WiFi`
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function getToken(config: any) {
    const url = `http://${config.host}/stalker_portal/server/load.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
    try {
        const response = await fetch(url, { headers: getHeaders(config) });
        if (!response.ok) return '';
        const text = await response.text();
        const data = JSON.parse(text);
        return data.js?.token || '';
    } catch (e) {
        return '';
    }
}

async function auth(config: any, token: string) {
    const metrics = { mac: config.mac_address, model: '', type: 'STB', uid: '', device: '', random: '' };
    const metricsEncoded = encodeURIComponent(JSON.stringify(metrics));

    const url = `http://${config.host}/stalker_portal/server/load.php?type=stb&action=get_profile`
        + `&hd=1&ver=ImageDescription:%200.2.18-r14-pub-250;`
        + `%20PORTAL%20version:%205.5.0;%20API%20Version:%20328;`
        + `&num_banks=2&sn=${config.serial_number}`
        + `&stb_type=${config.stb_type}&client_type=STB&image_version=218&video_out=hdmi`
        + `&device_id=${config.device_id}&device_id2=${config.device_id_2}`
        + `&signature=&auth_second_step=1&hw_version=${config.hw_version}`
        + `&not_valid_token=0&metrics=${metricsEncoded}`
        + `&hw_version_2=${config.hw_version_2}&api_signature=${config.api_signature}`
        + `&prehash=&JsHttpRequest=1-xml`;

    try {
        const response = await fetch(url, { headers: getHeaders(config, token) });
        if (!response.ok) return [];
        const text = await response.text();
        const data = JSON.parse(text);
        return data.js || [];
    } catch (e) {
        return [];
    }
}

async function handShake(config: any, token: string) {
    const url = `http://${config.host}/stalker_portal/server/load.php?type=stb&action=handshake&token=${token}&JsHttpRequest=1-xml`;
    try {
        const response = await fetch(url, { headers: getHeaders(config) });
        if (!response.ok) return '';
        const text = await response.text();
        const data = JSON.parse(text);
        return data.js?.token || '';
    } catch (e) {
        return '';
    }
}

async function getAccountInfo(config: any, token: string) {
    const url = `http://${config.host}/stalker_portal/server/load.php?type=account_info&action=get_main_info&JsHttpRequest=1-xml`;
    try {
        const response = await fetch(url, { headers: getHeaders(config, token) });
        if (!response.ok) return [];
        const text = await response.text();
        const data = JSON.parse(text);
        return data.js || [];
    } catch (e) {
        return [];
    }
}

async function getGenres(config: any, token: string) {
    const url = `http://${config.host}/stalker_portal/server/load.php?type=itv&action=get_genres&JsHttpRequest=1-xml`;
    try {
        const response = await fetch(url, { headers: getHeaders(config, token) });
        if (!response.ok) return [];
        const text = await response.text();
        const data = JSON.parse(text);
        return data.js || [];
    } catch (e) {
        return [];
    }
}

async function getStreamURL(config: any, id: string, token: string) {
    const url = `http://${config.host}/stalker_portal/server/load.php?type=itv&action=create_link&cmd=ffrt%20http://localhost/ch/${id}&JsHttpRequest=1-xml`;
    try {
        const response = await fetch(url, { headers: getHeaders(config, token) });
        if (!response.ok) return '';
        const text = await response.text();
        const data = JSON.parse(text);
        return data.js?.cmd || '';
    } catch (e) {
        return '';
    }
}

async function genToken(config: any) {
    await generateHardwareVersions(config);
    const token = await getToken(config);
    if (!token) return { token: '', profile: [], account_info: [] };
    
    const profile = await auth(config, token);
    const newToken = await handShake(config, token);
    if (!newToken) return { token: '', profile, account_info: [] };
    
    const account_info = await getAccountInfo(config, newToken);
    return { token: newToken, profile, account_info };
}

async function convertJsonToM3U(config: any, channels: any[], profile: any, account_info: any, origin: string, providedToken: string) {
    let m3u = [
        '#EXTM3U',
        `# Total Channels => ${channels.length}`,
        '# Script => @TheCursedCelestiaI',
        ''
    ];

    m3u.push('#EXTINF:-1 tvg-name="Telegram: @xocietylive" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/1024px-Telegram_logo.svg.png?20220101141644" group-title="𝐓𝐄𝐋𝐄𝐆𝐑𝐀𝐌" "group-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/1024px-Telegram_logo.svg.png?20220101141644" ,Telegram • @xocietylive');
    m3u.push('https://xociety-intro.vercel.app/xociety.m3u8');

    if (channels.length) {
        channels.forEach((channel) => {
            let cmd = channel.cmd || '';
            let real_cmd = cmd.replace('ffrt http://localhost/ch/', '');
            if (!real_cmd) {
                real_cmd = 'unknown';
            }
            let logo_url = '';
            if (channel.logo) {
                if (channel.logo.startsWith('http')) {
                    logo_url = channel.logo;
                } else {
                    logo_url = `http://${config.host}/stalker_portal/misc/logos/320/${channel.logo}`;
                }
            }
            m3u.push(`#EXTINF:-1 tvg-id="${channel.tvgid}" tvg-name="${channel.name}" tvg-logo="${logo_url}" group-title="${channel.title}",${channel.name}`);
            
            // Format URL with token
            const channel_stream_url = `${origin}/${providedToken}/${real_cmd}.m3u8`;
            m3u.push(channel_stream_url);
        });
    }

    return m3u.join('\n');
}

const handlePlaylist = async (req: express.Request, res: express.Response) => {
    const providedToken = req.params.token;
    // req.get('host') inside Vercel gives the deployed domain.
    const scheme = req.get('x-forwarded-proto') || req.protocol;
    const origin = `${scheme}://${req.get('host')}`;

    if (providedToken === 'src' || providedToken === 'lib' || providedToken === 'node_modules' || providedToken === 'assets' || providedToken === 'api') {
      return res.status(404).send('Not Found');
    }
    
    // Get device info
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const generateErrorM3U = (message: string) => `#EXTM3U\n#EXTINF:-1 tvg-id="" tvg-name="Error" tvg-logo="" group-title="Error",${message}\nhttp://localhost/error.m3u8\n`;

    if (!isAllowedUserAgent(req.headers['user-agent'])) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        return res.status(200).send(generateErrorM3U('Error: Browser detected or invalid player. Please use a dedicated IPTV player.'));
    }

    if (!trackAndVerifyDevice(providedToken, ipAddress, userAgent)) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        return res.status(200).send(generateErrorM3U('Error: Token is expired, invalid, or device limit reached.'));
    }

    try {
        const config = await getStalkerConfig();
        const { token, profile, account_info } = await genToken(config);
        if (!token) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            return res.status(200).send(generateErrorM3U('Internal Server Error: Failed to generate token from stalker portal'));
        }

        const channelsUrl = `http://${config.host}/stalker_portal/server/load.php?type=itv&action=get_all_channels&JsHttpRequest=1-xml`;
        let channelsData;
        try {
            const response = await fetch(channelsUrl, { headers: getHeaders(config, token) });
            if (!response.ok) {
                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                return res.status(200).send(generateErrorM3U(`Failed to fetch channels from stalker portal: ${response.status}`));
            }
            channelsData = JSON.parse(await response.text());
        } catch (e: any) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            return res.status(200).send(generateErrorM3U(`Error fetching channels: ${e.message}`));
        }

        const genres = await getGenres(config, token);

        let channels: any[] = [];
        if (channelsData.js?.data) {
            channels = channelsData.js.data.map((item: any) => ({
                name: item.name || 'Unknown',
                cmd: item.cmd || '',
                tvgid: item.xmltv_id || '',
                id: item.tv_genre_id || '',
                logo: item.logo || ''
            }));
        }

        const groupTitleMap: Record<string, string> = {};
        genres.forEach((group: any) => {
            groupTitleMap[group.id] = group.title || 'Other';
        });

        channels = channels.map((channel: any) => ({
            ...channel,
            title: groupTitleMap[channel.id] || 'Other'
        }));

        const requestedGenres = req.query.genres ? (req.query.genres as string).split(',') : null;
        if (requestedGenres && requestedGenres.length > 0) {
            channels = channels.filter((channel: any) => requestedGenres.includes(channel.id));
        }

        const m3uContent = await convertJsonToM3U(config, channels, profile, account_info, origin, providedToken);

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Content-Disposition', 'attachment; filename="playlist.m3u"');
        res.send(m3uContent);
    } catch (e: any) {
        res.status(500).send(`Internal Server Error: ${e.message}`);
    }
};

app.get('/api/metadata', async (req, res) => {
    try {
        const config = await getStalkerConfig();
        const { token } = await genToken(config);
        if (!token) {
            return res.status(500).json({ error: 'Failed to generate token' });
        }

        const channelsUrl = `http://${config.host}/stalker_portal/server/load.php?type=itv&action=get_all_channels&JsHttpRequest=1-xml`;
        let channelsData;
        try {
            const response = await fetch(channelsUrl, { headers: getHeaders(config, token) });
            if (!response.ok) {
                return res.status(500).json({ error: `Failed to fetch channels: ${response.status}` });
            }
            channelsData = JSON.parse(await response.text());
        } catch (e: any) {
            return res.status(500).json({ error: `Error fetching channels: ${e.message}` });
        }

        const genres = await getGenres(config, token);

        let channels: any[] = [];
        if (channelsData.js?.data) {
            channels = channelsData.js.data.map((item: any) => ({
                id: item.tv_genre_id || '',
            }));
        }

        const genreCounts: Record<string, number> = {};
        channels.forEach(ch => {
            if (ch.id) {
                genreCounts[ch.id] = (genreCounts[ch.id] || 0) + 1;
            }
        });

        const formattedGenres = genres.map((g: any) => ({
            id: g.id,
            title: g.title,
            count: genreCounts[g.id] || 0
        })).filter((g: any) => g.count > 0);

        res.json({ genres: formattedGenres, totalChannels: channels.length });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/:token/playlist.m3u', handlePlaylist);
app.get('/:token/playlist.m3u8', handlePlaylist);

app.get('/:token/:id.m3u8', async (req, res) => {
    const providedToken = req.params.token;
    const id = req.params.id;
    if (!id || id === 'playlist') {
        return;
    }
    
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!isAllowedUserAgent(req.headers['user-agent'])) {
        return res.status(200).send('<html><head><title>Access Denied</title></head><body style="background:#000;color:#fff;text-align:center;padding:50px;font-family:sans-serif;"><h1>Error: Access Denied</h1><p>Detection: Browser detected. This stream only works in <b>OTT Navigator</b>, <b>TiviMate</b>, and <b>NS Player</b>.</p></body></html>');
    }

    if (!trackAndVerifyDevice(providedToken, ipAddress, userAgent)) {
        return res.status(200).send('Error: Token is expired, invalid, or device limit reached.');
    }

    try {
        const config = await getStalkerConfig();
        const { token } = await genToken(config);
        if (!token) {
            return res.status(500).send('Internal Server Error: Failed to generate token');
        }

        let stream = await getStreamURL(config, id, token);
        if (!stream) {
            return res.status(500).send('No stream URL received');
        }

        const httpMatch = stream.match(/(http[s]?:\/\/[^\s]+)/);
        if (httpMatch) {
            stream = httpMatch[1];
        }

        res.redirect(302, stream);
    } catch (e: any) {
        res.status(500).send(`Internal Server Error: ${e.message}`);
    }
});

export default app;
