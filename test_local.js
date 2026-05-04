fetch("http://localhost:3000/public/playlist.m3u").then(r=>r.text()).then(t=>console.log(t.substring(0,500)));
