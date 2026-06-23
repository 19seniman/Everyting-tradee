require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'https://hp-sbt.everything.co';

// Baca semua akun dari .env berdasarkan pola ACCOUNT_<n>_*
function loadAccounts() {
  const accounts = [];
  let i = 1;

  while (process.env[`ACCOUNT_${i}_TOKEN`]) {
    accounts.push({
      label: process.env[`ACCOUNT_${i}_LABEL`] || `Akun ${i}`,
      token: process.env[`ACCOUNT_${i}_TOKEN`],
      cookie: process.env[`ACCOUNT_${i}_COOKIE`],
      deviceId: process.env[`ACCOUNT_${i}_DEVICE_ID`],
      visitorId: process.env[`ACCOUNT_${i}_VISITOR_ID`],
    });
    i++;
  }

  return accounts;
}

function assertAccountComplete(account) {
  const required = ['token', 'cookie', 'deviceId', 'visitorId'];
  const missing = required.filter((key) => !account[key]);
  if (missing.length) {
    throw new Error(
      `${account.label}: variabel berikut belum diisi di .env -> ${missing.join(', ')}`
    );
  }
}

function buildHeaders(account, extra = {}) {
  return {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9',
    'channel': 'minApp',
    'cookie': account.cookie,
    'device-id': account.deviceId,
    'device-name': 'telegram',
    'device-type': 'web',
    'edition': '1.0.0',
    'origin': 'https://tg.everything.co',
    'platformtype': 'web',
    'referer': 'https://tg.everything.co/',
    'token': account.token,
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0',
    'visitor-id': account.visitorId,
    ...extra,
  };
}

async function apiRequest(account, path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(account, options.headers || {}),
  });

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `Sesi ${account.label} tampaknya sudah expired (HTTP ${response.status}). ` +
      `Ambil ulang token/cookie dari browser dan update .env.`
    );
  }

  if (!response.ok) {
    throw new Error(`Request gagal (${response.status}): ${JSON.stringify(body)}`);
  }

  return body;
}

async function dailyCheckin(account) {
  return apiRequest(account, '/api/etoken/daily-checkin', {
    method: 'POST',
    headers: { 'content-length': '0' },
  });
}

async function getPointAccount(account) {
  return apiRequest(account, '/api/etoken/point/account', {
    method: 'GET',
  });
}

// Cari field username di response, nama field bisa beda-beda antar endpoint
function extractUsername(data) {
  if (!data || typeof data !== 'object') return null;
  const payload = data.data || data;
  return (
    payload.nickName ||
    payload.nickname ||
    payload.userName ||
    payload.username ||
    payload.contactId ||
    null
  );
}

async function processAccount(account) {
  console.log(`\n========== ${account.label} ==========`);

  try {
    assertAccountComplete(account);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    return;
  }

  console.log('🎁 Daily check-in...');
  try {
    const checkin = await dailyCheckin(account);
    console.log('✅ Check-in:', JSON.stringify(checkin, null, 2));
  } catch (err) {
    console.error('❌ Check-in gagal:', err.message);
  }

  console.log('💰 Cek saldo/poin...');
  try {
    const pointAccount = await getPointAccount(account);
    const username = extractUsername(pointAccount);
    if (username) {
      console.log(`👤 Username: ${username}`);
    }
    console.log('✅ Saldo/Poin:', JSON.stringify(pointAccount, null, 2));
  } catch (err) {
    console.error('❌ Gagal ambil saldo:', err.message);
  }
}

// ============================================================
// RUNNER — proses semua akun yang terdaftar di .env secara berurutan
// ============================================================
(async () => {
  const accounts = loadAccounts();

  if (accounts.length === 0) {
    console.error('❌ Tidak ada akun ditemukan di .env. Lihat format di .env.example');
    process.exit(1);
  }

  console.log(`🔄 Memproses ${accounts.length} akun...`);

  for (const account of accounts) {
    await processAccount(account);
  }

  console.log('\n✅ Selesai memproses semua akun.');
})();
