fetch("http://localhost:3000/public/001.mpd|User-Agent=Mozilla/5.0%20(Windows%20NT%2010.0;%20Win64;%20x64)").then(r=>{console.log(r.status, r.headers.get("Location"))});
