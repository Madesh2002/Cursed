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

app.post('/api/sync-channels', async (req, res) => {
    try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        const { stdout, stderr } = await execAsync('npx tsx playlist.ts');
        console.log('Sync stdout:', stdout);
        if (stderr) console.error('Sync stderr:', stderr);
        
        const channelsPath = path.join(process.cwd(), 'channels.json');
        if (fs.existsSync(channelsPath)) {
            const channels = JSON.parse(fs.readFileSync(channelsPath, 'utf8'));
            if (channels.length === 0) {
                return res.json({ success: false, message: 'Sync completed but 0 channels found. Server might be blocking requests.' });
            }
            res.json({ success: true, count: channels.length });
        } else {
            res.status(500).json({ error: 'channels.json not created after sync' });
        }
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
        return `#EXTM3U\r\n#EXTINF:-1 tvg-id="error" tvg-name="ERROR: ${cleanMessage}" tvg-logo="" group-title="Error",${cleanMessage}\r\nhttps://xonotice.vercel.app/xoproject.m3u8\r\n`;
    };

    const ERROR_STREAM = "https://xonotice.vercel.app/xoproject.m3u8";

    if (!isAllowedUserAgent(req.headers['user-agent'])) {
        res.setHeader('Content-Type', 'application/x-mpegURL');
        return res.status(200).send(`#EXTM3U\r\n#EXTINF:-1 tvg-id="error" group-title="Error",Browser Detected\r\n${ERROR_STREAM}\r\n`);
    }

    if (!req.params.token) {
        res.setHeader('Content-Type', 'application/x-mpegURL');
        return res.status(200).send(`#EXTM3U\r\n#EXTINF:-1 tvg-id="error" group-title="Error",Missing Token\r\n${ERROR_STREAM}\r\n`);
    }

    // We still call trackAndVerifyDevice to record the device request, but we don't block the playlist download
    // This allows the playlist to update genres correctly even if expired
    const isExpiredToken = req.params.token !== 'public' && !trackAndVerifyDevice(providedToken, ipAddress, userAgent);

    try {
        const channelsPath = path.join(process.cwd(), 'channels.json');
        if (!fs.existsSync(channelsPath)) {
            res.setHeader('Content-Type', 'application/x-mpegURL');
            return res.status(200).send(generateErrorM3U('channels.json not found'));
        }
        
        const channelsRaw = fs.readFileSync(channelsPath, 'utf8');
        const channels = JSON.parse(channelsRaw);
        
        const requestedGenres = req.query.genres ? (req.query.genres as string).split(',') : null;
        const requestedChannels = req.query.channels ? (req.query.channels as string).split(',') : null;
        
        // Count total channels
        const totalChannels = channels.length;
        
        let m3u = ['#EXTM3U'];

        channels.forEach((ch: any) => {
             let include = false;
             if (requestedGenres && requestedGenres.includes(ch.group || 'Other')) {
                 include = true;
             }
             if (requestedChannels && requestedChannels.includes(String(ch.channel_id))) {
                 include = true;
             }
             if (!requestedGenres && !requestedChannels) {
                 include = true;
             }
             if (!include) {
                 return;
             }
             if (ch.extinf) {
                 m3u.push(ch.extinf);
             } else {
                 m3u.push(`#EXTINF:-1 group-title="${ch.group || 'Other'}",Channel`);
             }
             if (isExpiredToken) {
                 m3u.push(`${ERROR_STREAM}`);
             } else {
                 const uaSnippet = '|User-Agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
                 if (ch.type === "clearkey") {
                     m3u.push(`#KODIPROP:inputstream.adaptive.manifest_type=mpd`);
                     m3u.push(`#KODIPROP:inputstream.adaptive.license_type=clearkey`);
                     
                     const licenseProxyPath = req.params.token ? `/${providedToken}/${ch.channel_id}.key` : `/${ch.channel_id}.key`;
                     const licenseUrl = `${origin}${licenseProxyPath}${uaSnippet}`;
                     
                     m3u.push(`#KODIPROP:inputstream.adaptive.license_key=${licenseUrl}`);
                     m3u.push(`#EXT-X-LICENSE-URL: ${licenseUrl}`);
                     m3u.push(`#EXT-X-DRM-ID: ${ch.channel_id}`);
                     
                     const targetPath = req.params.token ? `/${providedToken}/${ch.channel_id}.mpd` : `/${ch.channel_id}.mpd`;
                     m3u.push(`${origin}${targetPath}${uaSnippet}`);
                 } else if (ch.kid && ch.key) {
                     m3u.push(`#KODIPROP:inputstream.adaptive.manifest_type=mpd`);
                     m3u.push(`#KODIPROP:inputstream.adaptive.license_type=clearkey`);
                     
                     // Format as KID:KEY for inputstream.adaptive
                     const licenseKey = `${ch.kid}:${ch.key}`;
                     m3u.push(`#KODIPROP:inputstream.adaptive.license_key=${licenseKey}`);
                     m3u.push(`#EXT-X-DRM-ID: clearkey`);
                     
                     const targetPath = req.params.token ? `/${providedToken}/${ch.channel_id}.mpd` : `/${ch.channel_id}.mpd`;
                     m3u.push(`${origin}${targetPath}${uaSnippet}`);
                 } else {
                     const targetPath = req.params.token ? `/${providedToken}/${ch.channel_id}.m3u8` : `/${ch.channel_id}.m3u8`;
                     m3u.push(`${origin}${targetPath}${uaSnippet}`);
                 }
             }
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
        const genreChannels: Record<string, any[]> = {};
        const genresSet = new Set<string>();
        
        channels.forEach((ch: any) => {
           let group = ch.group || 'Other';
           genresSet.add(group);
           genreCounts[group] = (genreCounts[group] || 0) + 1;
           if (!genreChannels[group]) genreChannels[group] = [];
           
           let name = ch.channel_id;
           let logo = '';
           if (ch.extinf) {
               const nameMatch = ch.extinf.match(/,(.+)$/);
               if (nameMatch) name = nameMatch[1];
               const logoMatch = ch.extinf.match(/tvg-logo="([^"]+)"/);
               if (logoMatch) logo = logoMatch[1];
           }
           
           genreChannels[group].push({
               id: ch.channel_id,
               name,
               logo
           });
        });

        const formattedGenres = Array.from(genresSet).map(g => ({
            id: g,
            title: g,
            count: genreCounts[g] || 0,
            channels: genreChannels[g] || []
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

app.get(['/:token/:id(*)', '/:id(*)'], async (req, res, next) => {
    const idParam = req.params.id;
    if (!idParam) return next();
    
    // If it's a frontend asset or the playlist endpoint, skip this route handler
    const isAsset = idParam.startsWith('playlist.m3u') || 
        idParam.startsWith('src/') || 
        idParam.startsWith('app/') || 
        idParam.startsWith('node_modules/') ||
        idParam.startsWith('@vite/') ||
        idParam.startsWith('@fs/') ||
        idParam.startsWith('@id/') ||
        idParam.startsWith('@/') ||
        idParam.endsWith('.tsx') ||
        idParam.endsWith('.ts') ||
        idParam.endsWith('.css') ||
        idParam.endsWith('.js') ||
        idParam.endsWith('.html') ||
        idParam.endsWith('.ico') ||
        idParam.endsWith('.png') ||
        idParam.endsWith('.jpg') ||
        idParam.endsWith('.svg') ||
        idParam.endsWith('.json') ||
        idParam.endsWith('.map');

    const acceptHeader = req.headers.accept || '';
    if (isAsset || (acceptHeader.includes('text/html') && !idParam.includes('.'))) {
        return next();
    }
    
    const rawId = idParam.split('|')[0];
    const id = rawId.replace(/\.(m3u8|mpd|ts)$/, '');
    const providedToken = req.params.token || 'public';
    
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
        if (idParam.includes('.mpd')) {
             return res.status(403).send('Error: Token is expired, invalid, or device limit reached.');
        }
        res.writeHead(302, {
            'Location': 'https://xonotice.vercel.app/xoproject.m3u8',
            'Content-Type': 'application/x-mpegURL',
            'Access-Control-Allow-Origin': '*'
        });
        return res.end();
    }

    try {
        const channelsPath = path.join(process.cwd(), 'channels.json');
        if (!fs.existsSync(channelsPath)) {
             return res.status(500).send("Database missing");
        }
        
        const channelsRaw = fs.readFileSync(channelsPath, 'utf8');
        const channels = JSON.parse(channelsRaw);
        
        const channelId = id;
        let channel: any = null;
        
        for (const ch of channels) {
             if (String(ch.channel_id) === String(channelId)) {
                  channel = ch;
                  break;
             }
        }
        
        if (!channel || !channel.channel_url) {
            return res.status(404).send("Channel not found");
        }
        
        const targetUrl = channel.channel_url;
        const isManifest = targetUrl.includes('.mpd') || targetUrl.includes('.m3u8') || idParam.includes('.mpd') || idParam.includes('.m3u8');
        const isLicense = idParam.includes('license') || idParam.includes('key');

        // Proxy for manifests and licenses to avoid UA detection and CORS issues
        if (isManifest || isLicense) {
            let finalUrl = targetUrl;
            if (isLicense && channel.license_url) {
                finalUrl = channel.license_url;
            }

            try {
                const response = await fetch(finalUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        'Accept': '*/*',
                        'Referer': finalUrl
                    }
                });

                if (!response.ok) {
                    res.writeHead(302, { 'Location': finalUrl, 'Access-Control-Allow-Origin': '*' });
                    return res.end();
                }

                let contentType = response.headers.get('content-type') || '';
                if (isManifest && !contentType) {
                    contentType = finalUrl.includes('.mpd') ? 'application/dash+xml' : 'application/x-mpegURL';
                }
                if (isLicense) {
                    contentType = 'application/octet-stream';
                    res.setHeader('Access-Control-Allow-Origin', '*');
                }
                
                if (contentType) res.setHeader('Content-Type', contentType);
                res.setHeader('Access-Control-Allow-Origin', '*');
                
                const data = await response.arrayBuffer();
                const buffer = Buffer.from(data);
                
                // Security: If we expect a manifest but get HTML, it's an error/blocking page
                if (isManifest && buffer.slice(0, 10).toString().includes('<') && !buffer.slice(0, 10).toString().includes('<?xml')) {
                    console.error(`Blocked by remote server for channel ${id}: Returned HTML instead of manifest`);
                    return res.status(503).send("Service Unavailable: Remote server blocking");
                }

                // If it's a manifest, rewrite relative URLs to absolute
                if (isManifest) {
                    let content = buffer.toString();
                    const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
                    
                    if (finalUrl.includes('.m3u8')) {
                        // For HLS, rewrite lines that don't start with # or http
                        content = content.split('\n').map(line => {
                            const trimmed = line.trim();
                            if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('http')) {
                                return baseUrl + trimmed;
                            }
                            return line;
                        }).join('\n');
                    } else if (finalUrl.includes('.mpd')) {
                        // For DASH, add BaseURL if missing or fix relative paths
                        if (!content.includes('<BaseURL>')) {
                             content = content.replace('<Period', `<BaseURL>${baseUrl}</BaseURL>\n<Period`);
                        }
                    }
                    return res.send(content);
                }

                return res.send(buffer);
            } catch (proxyError) {
                console.error("Proxy error:", proxyError);
                res.writeHead(302, { 'Location': finalUrl, 'Access-Control-Allow-Origin': '*' });
                return res.end();
            }
        }
        
        res.writeHead(302, {
            'Location': targetUrl,
            'Content-Type': targetUrl.includes('.mpd') ? 'application/dash+xml' : 'application/x-mpegURL',
            'Access-Control-Allow-Origin': '*'
        });
        res.end();
    } catch (e: any) {
        res.status(500).send(`Internal Server Error: ${e.message}`);
    }
});

export default app;
