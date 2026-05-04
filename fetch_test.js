fetch("https://xocietypro.live/Cursed/mpd.php?id=146", { headers: {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"} }).then(r=>r.text()).then(t=>console.log(t.substring(0,200)));
