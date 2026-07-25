import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Serve static files from the root of the project
app.use(express.static(__dirname));

// Send index.html for any other requests (SPA-like fallback)
app.get('/api/youdao', async (req, res) => {
  const word = req.query.q;
  if (!word) return res.status(400).json({ error: 'Missing query word' });
  try {
    const response = await fetch(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) return res.status(response.status).json({ error: 'Failed from Youdao' });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
