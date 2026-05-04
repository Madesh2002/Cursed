fetch("http://localhost:3000/public/001.mpd|User-Agent=Mozilla/5.0", {redirect: "manual"}).then(r=>{console.log(r.status, r.headers.get("Location"))});
