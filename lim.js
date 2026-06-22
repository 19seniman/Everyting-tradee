require('dotenv').config();

const BASE_URL = process.env.BASE_URL;
const BEARER_TOKEN = process.env.BEARER_TOKEN;

if (!BASE_URL || !BEARER_TOKEN) {
  console.error('❌ BASE_URL atau BEARER_TOKEN belum diatur di file .env');
  process.exit(1);
}

// Buat instance fetch dengan header otorisasi standar
async function apiRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${BEARER_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Request gagal (${response.status} ${response.statusText}): ${text}`);
  }

  // Beberapa API mengembalikan body kosong (misal: 204 No Content)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

// Contoh fungsi: cek saldo / info akun
// Ganti '/account/balance' dengan endpoint yang sesuai dengan API tujuanmu
async function getAccountBalance() {
  return apiRequest('/account/balance', {
    method: 'GET',
  });
}

// Fungsi: daily check-in (klaim reward harian)
// Endpoint ini butuh header tambahan (token, cookie, device-id, dll)
// yang diambil dari request browser asli (lihat .env.example)
async function dailyCheckin() {
  const requiredEnv = ['TOKEN', 'COOKIE', 'DEVICE_ID', 'VISITOR_ID'];
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Variabel .env berikut belum diisi: ${missing.join(', ')}`);
  }

  const response = await fetch(`${BASE_URL}/api/etoken/daily-checkin`, {
    method: 'POST',
    headers: {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9',
      'channel': 'minApp',
      'content-length': '0',
      'cookie': process.env.COOKIE,
      'device-id': process.env.DEVICE_ID,
      'device-name': 'telegram',
      'device-type': 'web',
      'edition': '1.0.0',
      'origin': 'https://tg.everything.co',
      'platformtype': 'web',
      'referer': 'https://tg.everything.co/',
      'token': process.env.TOKEN,
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0',
      'visitor-id': process.env.VISITOR_ID,
    },
  });

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`Check-in gagal (${response.status}): ${JSON.stringify(body)}`);
  }

  return body;
}

// ============================================================
// Jalankan salah satu fungsi di bawah sesuai kebutuhan.
// Komentari/hapus baris yang tidak dipakai.
// ============================================================
(async () => {
  try {
    console.log('🎁 Melakukan daily check-in...');
    const result = await dailyCheckin();
    console.log('✅ Check-in berhasil:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Terjadi kesalahan:', err.message);
  }

  // Contoh fungsi lain (nonaktifkan komentar jika ingin pakai):
  // const balance = await getAccountBalance();
  // console.log(balance);
})();
