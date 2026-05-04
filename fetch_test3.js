fetch("https://xonotice.vercel.app/xoproject.m3u8").then(r=>{console.log(r.status, r.headers.get("content-type")); return r.text()}).then(t=>console.log(t.substring(0,50)));
