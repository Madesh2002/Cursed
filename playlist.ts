import fs from 'fs/promises';
import path from 'path';

async function fetchRemoteData(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    } catch (err: any) {
      console.error(`Attempt ${i + 1} failed for ${url}:`, err.message);
      if (i === retries - 1) return null;
      await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2s before retry
    }
  }
  return null;
}

async function updateChannels() {
  const output: any[] = [];
  let count = 1;

  // --- SECTION 1: SUNNXT (JSON SOURCE) ---
  console.log("Fetching SUNNXT data...");
  const sunnxtUrl = "https://xocietypro.live/XoSunnxt/sunnxt.php";
  const sunnxtRaw = await fetchRemoteData(sunnxtUrl);
  
  if (sunnxtRaw) {
    try {
      const sunnxtData = JSON.parse(sunnxtRaw);
      if (Array.isArray(sunnxtData)) {
        for (const channel of sunnxtData) {
          const formattedId = count.toString().padStart(3, '0');
          output.push({
            channel_id: formattedId,
            extinf: `#EXTINF:-1 tvg-id="${formattedId}" tvg-logo="${channel.logo}" tvg-name="${channel.name}",${channel.name}`,
            channel_url: channel.url || "",
            group: "SUNNXT",
            kid: channel.kid || "",
            key: channel.key || ""
          });
          count++;
        }
      }
    } catch (e) {
      console.error("Error parsing SUNNXT JSON:", e);
    }
  }

  // --- SECTION 2: CURSED (M3U SOURCE - MPD & LICENSE URL) ---
  console.log("Fetching CURSED data...");
  const cursedUrl = "https://xocietypro.live/Cursed/playlist.php";
  const m3uData = await fetchRemoteData(cursedUrl);

  if (m3uData) {
    /**
     * REGEX Explanation:
     * Captures tvg-id, name, logo, group, license_key URL, and final MPD URL
     */
    const regex = /#EXTINF.*tvg-id="([^"]*)".*tvg-name="([^"]*)".*tvg-logo="([^"]*)".*group-title="([^"]*)",(.*)\n#KODIPROP:inputstream\.adaptive\.manifest_type=mpd\n#KODIPROP:inputstream\.adaptive\.license_type=clearkey\n#KODIPROP:inputstream\.adaptive\.license_key=(.*)\n(?:#.*\n)*?(http.*)/gm;
    
    let match;
    while ((match = regex.exec(m3uData)) !== null) {
      const formattedId = count.toString().padStart(3, '0');
      output.push({
        channel_id: formattedId,
        extinf: `#EXTINF:-1 tvg-id="${match[1]}" tvg-logo="${match[3]}" tvg-name="${match[2]}",${match[5]}`,
        channel_url: match[7].trim(),
        group: match[4],
        license_url: match[6].trim(),
        type: "clearkey"
      });
      count++;
    }
  }

  // Final output of both sources combined
  try {
    const outputPath = path.join(process.cwd(), 'channels.json');
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(`Successfully saved ${output.length} channels to ${outputPath}`);
  } catch (e) {
    console.error("Failed to write channels.json:", e);
  }
}

updateChannels();
