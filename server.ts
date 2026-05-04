import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import apiApp from './api/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Background script to update playlist
function startPlaylistUpdater() {
  console.log("Starting automatic playlist updater (every 24 hours).");
  
  const updatePlaylist = () => {
    console.log(`[${new Date().toISOString()}] Running automatic playlist update...`);
    exec('npm run update-channels', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error updating playlist: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Playlist updater stderr: ${stderr}`);
      }
      console.log(`Playlist updater output: ${stdout}`);
    });
  };

  // Run immediately on boot
  updatePlaylist();

  // Run every 24 hours (24 * 60 * 60 * 1000 ms)
  setInterval(updatePlaylist, 86400000);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(apiApp);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startPlaylistUpdater();
  });
}

startServer();
