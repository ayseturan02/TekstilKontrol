const defaultRecipients = [
  {name: 'Kalite Ekibi', email: 'kalite@example.com'},
  {name: 'Üretim Ekibi', email: 'uretim@example.com'},
  {name: 'Müşteri Temsilcisi', email: 'musteri@example.com'},
];
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const isValidEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
// Phone-stored address book: newest first, unique, capped so storage stays small.
const MAX_SAVED_EMAILS = 100;
const parseSavedEmails = value => {
  let list;
  try { list = JSON.parse(value || '[]'); } catch { return []; }
  return Array.isArray(list) ? mergeEmails([], list) : [];
};
const mergeEmails = (saved, added) => {
  const result = [];
  for (const email of [...(added || []), ...(saved || [])].map(normalizeEmail)) if (isValidEmail(email) && !result.includes(email)) result.push(email);
  return result.slice(0, MAX_SAVED_EMAILS);
};
const mailSubject = d => 'Kontrol Raporu - ' + (d.customer || 'Yeni');
const mailBody = (d, mediaCount) => ['Merhaba,', '', 'Doldurulmuş kontrol raporu ekteki Kontrol-Raporu.html dosyasındadır.' + (mediaCount ? ' Ayrıca ' + mediaCount + ' fotoğraf/video eklidir.' : ''), '',
  ...[['Müşteri', d.customer], ['Sipariş No', d.order], ['Artikel', d.article], ['Kontrol Tarihi', d.date], ['Rapor No', d.reportNo]].filter(([, value]) => String(value || '').trim()).map(([label, value]) => label + ': ' + String(value).trim())].join('\n').trim();
module.exports = {defaultRecipients, normalizeEmail, isValidEmail, parseSavedEmails, mergeEmails, mailSubject, mailBody};
