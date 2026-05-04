fetch("https://xocietypro.live/Cursed/playlist.php", { headers: {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"} }).then(r=>r.text()).then(t=>{
console.log(t.substring(0, 1000));
let firstMatch = /#EXTINF.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*/m.exec(t);
console.log(firstMatch ? firstMatch[0] : 'no match');
});
