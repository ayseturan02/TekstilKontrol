async function apiRequest(api, path, options = {}) {
  const request = options.fetchImpl || fetch;
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await request(api + path, {
          method: options.method || 'GET',
          headers: {'Content-Type': 'application/json'},
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
module.exports = {apiRequest};
