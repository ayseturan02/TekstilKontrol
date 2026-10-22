// A local demo session grants UI access only; the server still requires a signed JWT.
async function authenticate(email, password, options = {}) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (normalizedEmail === 'demo@tekstil.com') {
    if (String(password || '').trim() !== 'Demo123') throw new Error('Demo e-posta veya şifre yanlış.');
    return 'demo-session';
  }
  if (!normalizedEmail || !password) throw new Error('E-posta ve şifreyi girin.');
  const request = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs ?? 12000;
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await request(options.api + '/login', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email: normalizedEmail, password}), signal: controller.signal,
        });
        let data;
        try { data = await response.json(); }
        catch { throw new Error('Sunucudan geçerli bir yanıt alınamadı.'); }
        if (!response.ok || typeof data?.token !== 'string' || !data.token) {
          throw new Error(data?.error || 'E-posta veya şifre yanlış.');
        }
        return data.token;
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.'));
          controller.abort();
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
module.exports = {authenticate};
