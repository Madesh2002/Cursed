const { spawn } = require('child_process');
const http = require('http');

const server = spawn('npx', ['tsx', 'test_server.ts']);

server.stdout.on('data', (d) => {
    const s = d.toString();
    console.log('[SERVER]', s);
    if (s.includes('running 3001')) {
        http.get("http://localhost:3001/public/001.mpd%7CUser-Agent=Mozilla/5.0", (res) => {
            console.log('STATUS:', res.statusCode);
            server.kill();
        });
    }
});
server.stderr.on('data', d => console.log('[ERR]', d.toString()));
