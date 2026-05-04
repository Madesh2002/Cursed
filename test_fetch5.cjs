const http = require('http');
http.get("http://localhost:3000/public/001.mpd|User-Agent=Mozilla/5.0", (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', res.headers);
});
