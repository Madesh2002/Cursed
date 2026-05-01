import express from 'express';
import crypto from 'crypto';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDdowv0IXhJikRNoy3riJqjcz1rX1vmc5Y",
    authDomain: "xotoken-a0d60.firebaseapp.com",
    projectId: "xotoken-a0d60",
    storageBucket: "xotoken-a0d60.firebasestorage.app",
    messagingSenderId: "332885529359",
    appId: "1:332885529359:web:fe51ca50a1d452e91a247a",
    measurementId: "G-V0NYB4SG6M"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

let cachedConfig: any = null;
let lastConfigFetch = 0;

async function getStalkerConfig() {
    if (cachedConfig && Date.now() - lastConfigFetch < 5 * 60 * 1000) {
        return cachedConfig;
    }
    try {
        const configDoc = await getDoc(doc(db, 'settings', 'stalkerConfig'));
        if (configDoc.exists()) {
            cachedConfig = configDoc.data();
            lastConfigFetch = Date.now();
            return cachedConfig;
        }
    } catch (e) {
        console.error("Error fetching config from Firebase:", e);
    }
    return {
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

const app = express();

const handlePlaylist = async (req: express.Request, res: express.Response) => {
    const providedToken = req.params.token;
    // req.get('host') inside Vercel gives the deployed domain.
    const scheme = req.get('x-forwarded-proto') || req.protocol;
    const origin = `${scheme}://${req.get('host')}`;

    if (providedToken === 'src' || providedToken === 'lib' || providedToken === 'node_modules' || providedToken === 'assets' || providedToken === 'api') {
      return res.status(404).send('Not Found');
    }

    try {
        const config = await getStalkerConfig();
        const { token, profile, account_info } = await genToken(config);
        if (!token) {
            return res.status(500).send('Internal Server Error: Failed to generate token');
        }

        const channelsUrl = `http://${config.host}/stalker_portal/server/load.php?type=itv&action=get_all_channels&JsHttpRequest=1-xml`;
        let channelsData;
        try {
            const response = await fetch(channelsUrl, { headers: getHeaders(config, token) });
            if (!response.ok) {
                return res.status(500).send(`Failed to fetch channels: ${response.status}`);
            }
            channelsData = JSON.parse(await response.text());
        } catch (e: any) {
            return res.status(500).send(`Error fetching channels: ${e.message}`);
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

        channels = channels.map(channel => ({
            ...channel,
            title: groupTitleMap[channel.id] || 'Other'
        }));

        const m3uContent = await convertJsonToM3U(config, channels, profile, account_info, origin, providedToken);

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Content-Disposition', 'attachment; filename="playlist.m3u"');
        res.send(m3uContent);
    } catch (e: any) {
        res.status(500).send(`Internal Server Error: ${e.message}`);
    }
};

app.get('/:token/playlist.m3u', handlePlaylist);
app.get('/:token/playlist.m3u8', handlePlaylist);

app.get('/:token/:id.m3u8', async (req, res) => {
    const id = req.params.id;
    if (!id || id === 'playlist') {
        return;
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
