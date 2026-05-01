const fs = require("fs");

async function test() {
    try {
        const h = {
            "Cookie": "mac=00:1A:79:00:4D:84; stb_lang=en; timezone=GMT",
            "Referer": "http://tv.saartv.cc/stalker_portal/c/",
            "User-Agent": "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3",
            "X-User-Agent": "Model: MAG250; Link: WiFi"
        };
        const tokenRes = await fetch("http://tv.saartv.cc/stalker_portal/server/load.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml", {headers: h});
        const tokenData = await tokenRes.text();
        fs.writeFileSync("debug.html", tokenData);
        console.log("Written");
    } catch (e) {
        console.log(e);
    }
}
test();
