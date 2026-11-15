// api/proxy.js
export default async function handler(req, res) {
  // URL target asli dari kode index.js Anda
  const API_BASE = 'https://api.tempmail.lol/v3';
  
  // Ambil path dari query. Contoh: /api/proxy?path=/inboxes
  let targetPath = req.query.path || '/';
  
  // Validasi path agar hanya mengizinkan endpoint tertentu (sesuai index.js Anda)
  if (!/^\/inboxes(?:\/[^/]+(?:\/emails)?)?$/.test(targetPath)) {
    return res.status(404).json({ error: { message: 'API route not found' } });
  }
  
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  // Siapkan URL tujuan
  const targetUrl = API_BASE + targetPath;

  try {
    const fetchOptions = {
      method: req.method,
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        // User-Agent wajib agar tidak diblokir Cloudflare
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(20000)
    };

    // Teruskan body untuk request POST
    if (req.method === 'POST' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    // Tembak API tempmail.lol
    const upstream = await fetch(targetUrl, fetchOptions);
    const text = await upstream.text();

    // Kirim balik response ke frontend
    res.setHeader('Content-Type', 'application/json');
    res.status(upstream.status).send(text || '{}');

  } catch (err) {
    res.status(502).json({ 
      error: { message: 'Gagal menghubungi TempMail API: ' + err.message } 
    });
  }
}
