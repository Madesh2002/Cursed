fetch("https://xonotice.vercel.app/xoproject.mpd").then(r=>{console.log(r.status, r.headers.get("content-type"))});
