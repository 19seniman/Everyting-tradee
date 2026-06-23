require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'https://hp-sbt.everything.co';

// Semua kredensial sesi dikumpulkan di satu tempat agar mudah dicek/diperbarui
const session = {
  token: process.env.TOKEN,
  cookie: process.env.COOKIE,
  deviceId: process.env.DEVICE_ID,
  visitorId: process.env.VISITOR_ID,
};

function assertSessionComplete() {
  const missing = Object.entries(session)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    console.error(`❌ Variabel .env berikut belum diisi: ${missing.join(', ')}`);
    console.error('   Lihat petunjuk "SAAT TOKEN/COOKIE EXPIRED" di atas file ini.');
    process.exit(1);
  }
}

// Header dasar yang dipakai semua request ke hp-sbt.everything.co
function buildHeaders(extra = {}) {
  return {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'channel': 'minApp',
    'cookie': session.cookie,
    'device-id': session.deviceId,
    'device-name': 'telegram',
    'device-type': 'web',
    'edition': '1.0.0',
    'origin': 'https://tg.everything.co',
    'platformtype': 'web',
    'referer': 'https://tg.everything.co/',
    'token': session.token,
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0',
    'visitor-id': session.visitorId,
    ...extra,
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers || {}),
  });

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  // Token/cookie kemungkinan sudah expired
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `Sesi tampaknya sudah expired (HTTP ${response.status}). ` +
      `Ambil ulang token/cookie dari browser dan update .env. Detail: ${JSON.stringify(body)}`
    );
  }

  if (!response.ok) {
    throw new Error(`Request gagal (${response.status}): ${JSON.stringify(body)}`);
  }

  return body;
}

// Klaim reward check-in harian
async function dailyCheckin() {
  return apiRequest('/api/etoken/daily-checkin', {
    method: 'POST',
    headers: { 'content-length': '0' },
  });
}

// Cek saldo / poin akun
async function getPointAccount() {
  return apiRequest('/api/etoken/point/account', {
    method: 'GET',
  });
}

// ============================================================
// RUNNER — jalankan sesuai kebutuhan
// ============================================================
(async () => {
  assertSessionComplete();

  console.log('🎁 Melakukan daily check-in...');
  try {
    const checkin = await dailyCheckin();
    console.log('✅ Check-in:', JSON.stringify(checkin, null, 2));
  } catch (err) {
    console.error('❌ Check-in gagal:', err.message);
  }

  console.log('\n💰 Mengambil info saldo/poin...');
  try {
    const account = await getPointAccount();
    console.log('✅ Saldo/Poin:', JSON.stringify(account, null, 2));
  } catch (err) {
    console.error('❌ Gagal ambil saldo:', err.message);
  }
})();
