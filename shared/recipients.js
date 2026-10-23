const defaultRecipients = [
  {name: 'Kalite Ekibi', email: 'kalite@example.com'},
  {name: 'Üretim Ekibi', email: 'uretim@example.com'},
  {name: 'Müşteri Temsilcisi', email: 'musteri@example.com'},
];
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const isValidEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
module.exports = {defaultRecipients, normalizeEmail, isValidEmail};
