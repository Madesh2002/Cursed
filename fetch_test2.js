fetch("https://xonotice.vercel.app/xoproject.m3u8").then(r=>r.text()).then(t=>console.log(t.substring(0,200)));
