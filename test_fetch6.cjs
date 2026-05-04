const http = require('http');
http.get("http://localhost:3000/public/001.mpd|User-Agent=Mozilla/5.0", (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log(d));
});
