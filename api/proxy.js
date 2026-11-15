// api/proxy.js
// Serverless Function untuk Vercel sebagai jembatan ke mail.tm (Bypass CORS)

export default async function handler(req, res) {
  // 1. Ambil path tujuan dari query parameter (?path=/domains, ?path=/messages, dll)
  const targetPath = req.query.path;
  
  if (!targetPath) {
    return res.status(400).json({ 
      error: "Parameter 'path' wajib diisi. Contoh: /api/proxy?path=/domains" 
    });
  }

  // 2. Susun URL tujuan ke mail.tm
  // Pastikan targetPath selalu diawali dengan garis miring (/)
  const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  const url = `https://api.mail.tm${cleanPath}`;

  try {
    // 3. Siapkan Headers yang akan diteruskan ke mail.tm
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      // Gunakan User-Agent browser agar tidak diblokir oleh Cloudflare mail.tm
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    // Teruskan token Authorization jika ada (untuk request inbox/pesan)
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    // 4. Siapkan opsi Fetch
    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    // Teruskan body jika method-nya POST/PUT/PATCH (seperti saat buat email / login)
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      // Vercel otomatis mem-parsing JSON body, kita stringify ulang untuk dikirim ke mail.tm
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    // 5. Lakukan request ke mail.tm
    const response = await fetch(url, fetchOptions);

    // 6. Baca response dari mail.tm
    let data;
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      // Jika response bukan JSON (misal error HTML dari Cloudflare), ambil sebagai teks
      data = await response.text();
      // Jika status error, kembalikan dalam format JSON agar frontend bisa membacanya
      if (!response.ok) {
        return res.status(response.status).json({ 
          error: "Provider Error", 
          detail: data.substring(0, 200) // Potong jika terlalu panjang
        });
      }
    }

    // 7. Kirim balik response ke frontend dengan status code yang sama persis
    res.status(response.status).json(data);

  } catch (error) {
    console.error("Proxy Error:", error);
    // Tangani jika server mail.tm down atau tidak bisa dihubungi
    res.status(500).json({ 
      error: "Gagal menghubungi mail.tm dari server proxy", 
      detail: error.message 
    });
  }
}
