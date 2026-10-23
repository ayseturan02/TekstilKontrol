const demoProfile = {id: 'demo', firstName: 'Demo', lastName: 'Kullanıcı', email: 'demo@tekstil.com', role: 'user'};
async function apiRequest(api, path, options = {}) {
  const request = options.fetchImpl || fetch;
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await request(api + path, {
          method: options.method || 'GET',
          headers: {'Content-Type': 'application/json', ...(options.token ? {Authorization: 'Bearer ' + options.token} : {})},
          ...(options.body !== undefined ? {body: JSON.stringify(options.body)} : {}),
          signal: controller.signal,
        });
        let data;
        try { data = await response.json(); } catch { throw new Error('Sunucudan geçerli bir yanıt alınamadı.'); }
        if (!response.ok) {
          const error = new Error(data?.error || 'İşlem tamamlanamadı.');
          error.status = response.status;
          throw error;
        }
        return data;
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {controller.abort(); reject(new Error('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.'));}, options.timeoutMs ?? 12000);
      }),
    ]);
  } finally { clearTimeout(timer); }
}
async function authenticate(email, password, options = {}) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (normalizedEmail === demoProfile.email) {
    if (String(password || '').trim() !== 'Demo123') throw new Error('Demo e-posta veya şifre yanlış.');
    options.onProfile?.({...demoProfile});
    return 'demo-session';
  }
  if (!normalizedEmail || !password) throw new Error('E-posta ve şifreyi girin.');
  const data = await apiRequest(options.api, '/login', {...options, method: 'POST', body: {email: normalizedEmail, password}});
  if (typeof data?.token !== 'string' || !data.token) throw new Error('E-posta veya şifre yanlış.');
  options.onProfile?.(data.user || {id: '', firstName: '', lastName: '', email: normalizedEmail, role: 'user'});
  return data.token;
}
async function getProfile(api, token) {
  if (token === 'demo-session') return {...demoProfile};
  const data = await apiRequest(api, '/me', {token});
  return data.user;
}
module.exports = {authenticate, apiRequest, getProfile};
