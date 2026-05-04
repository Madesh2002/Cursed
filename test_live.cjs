const http = require('http');
http.get("http://localhost:3000/public/001.mpd", (res) => {
  console.log('STATUS:', res.statusCode);
});
