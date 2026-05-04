fetch("https://xocietypro.live/Cursed/mpd.php?id=146", { headers: {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"} }).then(r=>console.log(r.status, [...r.headers.entries()]));
