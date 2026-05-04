const fs = require('fs');
let content = fs.readFileSync('api/index.ts', 'utf8');
content = content.replace("m3u.push(`#KODIPROP:inputstream.adaptive.license_key=${ch.license_url || ''}${uaSnippet}`);", "m3u.push(`#KODIPROP:inputstream.adaptive.license_key=${ch.license_url || ''}${uaSnippet}`);\n                     if (ch.license_url) { m3u.push(`#EXT-X-LICENSE-URL: ${ch.license_url}`); }\n                     m3u.push(`#EXT-X-DRM-ID: ${ch.channel_id}`);");
fs.writeFileSync('api/index.ts', content);
