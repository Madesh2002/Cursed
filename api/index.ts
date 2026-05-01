import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const configPath = path.join(process.cwd(), 'playlist-config.json');
const tmpConfigPath = '/tmp/playlist-config.json';
let memoryConfig: any = null;

const defaultConfig = {
    playlist_url: ''
};

function getPlaylistConfigSync() {
    if (memoryConfig) return { ...memoryConfig };
    try {
        if (fs.existsSync(configPath)) {
            memoryConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return { ...memoryConfig };
        }
        if (fs.existsSync(tmpConfigPath)) {
            memoryConfig = JSON.parse(fs.readFileSync(tmpConfigPath, 'utf8'));
            return { ...memoryConfig };
        }
    } catch (e) {
        console.error("Error reading local config:", e);
    }
    return { ...defaultConfig };
}

function savePlaylistConfigSync(config: any) {
    memoryConfig = config;
    try { fs.writeFileSync(configPath, JSON.stringify(config, null, 2)); } catch(e) {
        try { fs.writeFileSync(tmpConfigPath, JSON.stringify(config, null, 2)); } catch(e2) {}
    }
}

const app = express();
app.use(cors());
app.use(express.json());

let memoryTokens: any = null;
const tokensPath = path.join(process.cwd(), 'active_tokens.json');
const tmpTokensPath = '/tmp/active_tokens.json';

function getTokensFromDisk() {
    if (memoryTokens) return memoryTokens;
    try {
        if (fs.existsSync(tokensPath)) {
            memoryTokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
            return memoryTokens;
        }
        if (fs.existsSync(tmpTokensPath)) {
            memoryTokens = JSON.parse(fs.readFileSync(tmpTokensPath, 'utf8'));
            return memoryTokens;
        }
    } catch (e) {}
    return {};
}

function saveTokensToDisk(tokens: any) {
    memoryTokens = tokens;
    try { fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2)); } catch(e) {
        try { fs.writeFileSync(tmpTokensPath, JSON.stringify(tokens, null, 2)); } catch(e2) {}
    }
}

function syncTokenStorage(token: string, expiryTime: number, username?: string) {
    try {
        let tokens: any = getTokensFromDisk();
        const existingData = tokens[token] || {};
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
        const now = Date.now();
        for (const t in tokens) {
            const expiry = typeof tokens[t] === 'number' ? tokens[t] : tokens[t]?.expiryTime;
            if (expiry && expiry < now) delete tokens[t];
        }
        saveTokensToDisk(tokens);
    } catch (e) {
        console.error("Error setting token:", e);
    }
}

function trackAndVerifyDevice(token: string, ip: string, ua: string): boolean {
    if (!token) return false;
    try {
        const tokens = getTokensFromDisk();
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
               saveTokensToDisk(tokens);
               return false;
            }
        }
        tokenData.devices[deviceId] = { ip, userAgent: ua, lastSeen: Date.now() };
        saveTokensToDisk(tokens);
        return true;
    } catch (e) {
        return false;
    }
}

function checkRecovery(token: string, username: string): boolean {
    if (!token || !username) return false;
    try {
        const tokens = getTokensFromDisk();
        const tokenData = tokens[token];
        if (!tokenData) return false;
        return tokenData.username === username;
    } catch (e) {
        return false;
    }
}

function isAllowedUserAgent(ua: string | undefined): boolean {
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
        const tokens = getTokensFromDisk();
        if (Object.keys(tokens).length === 0) return res.json({ error: 'No tokens found' });
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
        const tokens = getTokensFromDisk();
        if (Object.keys(tokens).length === 0) return res.status(404).json({ error: 'No tokens found' });
        const tokenData = tokens[token];
        if (tokenData && tokenData.devices && tokenData.devices[deviceId]) {
            delete tokenData.devices[deviceId];
            if (Object.keys(tokenData.devices).length < 4) {
                tokenData.blocked = false;
            }
            saveTokensToDisk(tokens);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Device not found' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/settings/config', (req, res) => {
    res.json(getPlaylistConfigSync());
});

app.post('/api/settings/config', (req, res) => {
    try {
        savePlaylistConfigSync(req.body);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

function parseM3U(m3uText: string) {
    const lines = m3uText.split(/\r?\n/);
    const channels = [];
    const genresSet = new Set<string>();
    let currentExtinf = "";
    let currentGroup = "Other";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXTINF')) {
            currentExtinf = line;
            const groupMatch = line.match(/group-title="([^"]+)"/);
            if (groupMatch) {
                currentGroup = groupMatch[1];
            } else {
                currentGroup = "Other";
            }
            genresSet.add(currentGroup);
        } else if (line !== '' && !line.startsWith('#')) {
            channels.push({
                extinf: currentExtinf,
                url: line,
                group: currentGroup
            });
            currentExtinf = "";
            currentGroup = "Other";
        }
    }
    return { channels, genres: Array.from(genresSet) };
}

const handlePlaylist = async (req: express.Request, res: express.Response) => {
    const providedToken = req.params.token || 'public';
    const scheme = req.get('x-forwarded-proto') || req.protocol;
    const origin = `${scheme}://${req.get('host')}`;

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (providedToken === 'src' || providedToken === 'lib' || providedToken === 'node_modules' || providedToken === 'assets' || providedToken === 'api') {
      return res.status(404).send('Not Found');
    }
    
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const generateErrorM3U = (message: string) => {
        const cleanMessage = message.replace(/"/g, "'").replace(/\n/g, ' ');
        return `#EXTM3U\r\n#EXTINF:-1 tvg-id="error" tvg-name="ERROR: ${cleanMessage}" tvg-logo="" group-title="Error",${cleanMessage}\r\nhttps://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8\r\n`;
    };

    if (!isAllowedUserAgent(req.headers['user-agent'])) {
        res.setHeader('Content-Type', 'application/x-mpegURL');
        return res.status(200).send(generateErrorM3U('Error: Browser detected or invalid player. Please use a dedicated IPTV player.'));
    }

    if (!req.params.token) {
        res.setHeader('Content-Type', 'application/x-mpegURL');
        return res.status(200).send(generateErrorM3U('Error: Invalid or missing token. Please use a valid token URL.'));
    }

    if (req.params.token !== 'public' && !trackAndVerifyDevice(providedToken, ipAddress, userAgent)) {
        res.setHeader('Content-Type', 'application/x-mpegURL');
        return res.status(200).send(generateErrorM3U('Error: Token is expired, invalid, or device limit reached.'));
    }

    try {
        const channelsPath = path.join(process.cwd(), 'channels.json');
        if (!fs.existsSync(channelsPath)) {
            res.setHeader('Content-Type', 'application/x-mpegURL');
            return res.status(200).send(generateErrorM3U('channels.json not found'));
        }
        
        const channelsRaw = fs.readFileSync(channelsPath, 'utf8');
        const channels = JSON.parse(channelsRaw);
        
        const requestedGenres = req.query.genres ? (req.query.genres as string).split(',') : null;
        
        // Count total channels
        const totalChannels = channels.length;
        
        let m3u = ['#EXTM3U'];

        channels.forEach((ch: any) => {
             if (requestedGenres && !requestedGenres.includes(ch.group)) {
                 return;
             }
             if (ch.extinf) {
                 m3u.push(ch.extinf);
             } else {
                 m3u.push(`#EXTINF:-1 group-title="${ch.group || 'Other'}",Channel`);
             }
             const targetPath = req.params.token ? `/${providedToken}/${ch.channel_id}.m3u8` : `/${ch.channel_id}.m3u8`;
             m3u.push(`${origin}${targetPath}`);
        });
        
        res.setHeader('Content-Type', 'application/x-mpegURL');
        res.setHeader('Content-Disposition', 'attachment; filename="playlist.m3u"');
        res.send(m3u.join('\r\n'));
    } catch (e: any) {
        res.status(500).send(`Internal Server Error: ${e.message}`);
    }
};

app.get('/api/metadata', async (req, res) => {
    try {
        const channelsPath = path.join(process.cwd(), 'channels.json');
        if (!fs.existsSync(channelsPath)) {
            return res.json({ genres: [], totalChannels: 0 });
        }
        
        const channelsRaw = fs.readFileSync(channelsPath, 'utf8');
        const channels = JSON.parse(channelsRaw);
        
        const genreCounts: Record<string, number> = {};
        const genresSet = new Set<string>();
        
        channels.forEach((ch: any) => {
           let group = ch.group || 'Other';
           genresSet.add(group);
           genreCounts[group] = (genreCounts[group] || 0) + 1;
        });

        const formattedGenres = Array.from(genresSet).map(g => ({
            id: g,
            title: g,
            count: genreCounts[g] || 0
        }));
        
        res.json({ genres: formattedGenres, totalChannels: channels.length });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/playlist.m3u', handlePlaylist);
app.get('/playlist.m3u8', handlePlaylist);
app.get('/:token/playlist.m3u', handlePlaylist);
app.get('/:token/playlist.m3u8', handlePlaylist);

app.get(['/:token/:id.m3u8', '/:id.m3u8'], async (req, res) => {
    const id = req.params.id;
    const providedToken = req.params.token || 'public';
    if (!id || id === 'playlist') {
        return;
    }
    
    // allow CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!isAllowedUserAgent(req.headers['user-agent'])) {
        return res.status(200).send('<html><head><title>Access Denied</title></head><body style="background:#000;color:#fff;text-align:center;padding:50px;font-family:sans-serif;"><h1>Error: Access Denied</h1><p>Detection: Browser detected. This stream only works in <b>OTT Navigator</b>, <b>TiviMate</b>, and <b>NS Player</b>.</p></body></html>');
    }

    if (!req.params.token) {
        return res.status(200).send('Error: Invalid or missing token. Please use a valid token URL.');
    }

    if (req.params.token !== 'public' && !trackAndVerifyDevice(providedToken, ipAddress, userAgent)) {
        return res.status(200).send('Error: Token is expired, invalid, or device limit reached.');
    }

    try {
        const channelsPath = path.join(process.cwd(), 'channels.json');
        if (!fs.existsSync(channelsPath)) {
             return res.status(500).send("Database missing");
        }
        
        const channelsRaw = fs.readFileSync(channelsPath, 'utf8');
        const channels = JSON.parse(channelsRaw);
        
        const channelId = id.replace(/\.m3u8$/, '');
        let targetUrl = '';
        
        for (const ch of channels) {
             if (String(ch.channel_id) === String(channelId)) {
                  targetUrl = ch.channel_url;
                  break;
             }
        }
        
        if (!targetUrl) {
            return res.status(404).send("Channel not found");
        }
        
        res.writeHead(302, {
            'Location': targetUrl,
            'Content-Type': 'application/x-mpegURL',
            'Access-Control-Allow-Origin': '*'
        });
        res.end();
    } catch (e: any) {
        res.status(500).send(`Internal Server Error: ${e.message}`);
    }
});

export default app;
