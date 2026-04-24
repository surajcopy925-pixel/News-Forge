import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import casparClient from './caspar-client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = 3030;
const MAIN_APP_URL = process.env.MAIN_APP_URL || 'http://192.168.1.126:3000';

app.use(cors());
app.use(express.json());

// ─── CasparCG Status & Control ─────────────────────────────

app.get('/api/status', (req, res) => {
  res.json({
    connected: casparClient.isConnected(),
    host: casparClient.getHost(),
  });
});

app.post('/api/connect', async (req, res) => {
  try {
    const host = req.body.host || process.env.CASPAR_HOST || '192.168.1.232';
    const port = req.body.port || Number(process.env.CASPAR_PORT) || 5250;
    await casparClient.connect(host, port);
    res.json({ ok: true, host: `${host}:${port}` });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/disconnect', async (req, res) => {
  try {
    await casparClient.disconnect();
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/play', async (req, res) => {
  try {
    const { channel, layer, file, loop } = req.body;
    console.log(`[Server] PLAY request: ch=${channel} layer=${layer} file=${file} loop=${loop}`);
    if (loop) {
      const result = await casparClient.playLoop(channel, layer, file);
      return res.json({ ok: true, result });
    }
    const result = await casparClient.play(channel, layer, file);
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/stop', async (req, res) => {
  try {
    const { channel, layer } = req.body;
    const result = await casparClient.stop(channel, layer);
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/pause', async (req, res) => {
  try {
    const { channel, layer } = req.body;
    const result = await casparClient.pause(channel, layer);
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/resume', async (req, res) => {
  try {
    const { channel, layer } = req.body;
    const result = await casparClient.resume(channel, layer);
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/clear', async (req, res) => {
  try {
    const { channel, layer } = req.body;
    const result = await casparClient.clear(channel, layer);
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/load', async (req, res) => {
  try {
    const { channel, layer, file, auto } = req.body;
    const result = await casparClient.loadBG(channel, layer, file, auto);
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/info/:channel/:layer', async (req, res) => {
  try {
    const ch = parseInt(req.params.channel);
    const layer = parseInt(req.params.layer);
    const raw = await casparClient.info(ch, layer);
    const parsed = casparClient.parseInfoToChannelInfo(raw);
    res.json(parsed);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/media', async (req, res) => {
  try {
    const raw = await casparClient.listMedia();
    const parsed = casparClient.parseMediaList(raw);
    res.json({ files: parsed });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Proxy Routes to Main App (port 3000) ──────────────────

app.get('/api/rundowns/live', async (req, res) => {
  try {
    const url = new URL('/api/rundowns/live', MAIN_APP_URL);
    const rundownId = req.query.rundownId;
    if (rundownId) {
      url.searchParams.set('rundownId', rundownId as string);
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Main app returned ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (e: any) {
    console.error('[Proxy] Failed to fetch rundowns from main app:', e.message);
    res.status(502).json({
      error: 'Cannot reach main app',
      detail: e.message,
      mainAppUrl: MAIN_APP_URL,
    });
  }
});

// ─── Static Files (Production Build) ───────────────────────

app.use(express.static(path.join(__dirname, 'dist/client')));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist/client', 'index.html'));
  }
});

// ─── Start Server ───────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎬 News Forge Playout Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Main app proxy target: ${MAIN_APP_URL}`);
  console.log(`🎥 CasparCG target: ${process.env.CASPAR_HOST || '192.168.1.232'}:${process.env.CASPAR_PORT || 5250}\n`);
});
