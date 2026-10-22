require('dotenv').config();
const {htmlFor} = require('../shared/reportTemplate');
const express = require('express'),
  cors = require('cors'),
  bcrypt = require('bcryptjs'),
  jwt = require('jsonwebtoken'),
  multer = require('multer'),
  nodemailer = require('nodemailer');
const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: 25 * 1024 * 1024, files: 40},
});
const secret = process.env.JWT_SECRET;
if (!secret || !process.env.USER_EMAIL || !process.env.USER_PASSWORD_HASH) {
  console.error(
    'Eksik .env: JWT_SECRET, USER_EMAIL, USER_PASSWORD_HASH gerekli',
  );
  process.exit(1);
}
app.post('/login', async (req, res) => {
  const {email, password} = req.body;
  const ok =
    String(email || '').toLowerCase() ===
      process.env.USER_EMAIL.toLowerCase() &&
    (await bcrypt.compare(
      String(password || ''),
      process.env.USER_PASSWORD_HASH,
    ));
  if (!ok) return res.status(401).json({error: 'E-posta veya şifre yanlış'});
  res.json({token: jwt.sign({email}, secret, {expiresIn: '8h'})});
});
app.post(
  '/send',
  (req, res, next) => {
    try {
      const t = (req.headers.authorization || '').replace('Bearer ', '');
      req.user = jwt.verify(t, secret);
      next();
    } catch {
      return res.status(401).json({error: 'Oturum geçersiz'});
    }
  },
  upload.array('files', 40),
  async (req, res) => {
    try {
      const d = JSON.parse(req.body.report);
      const to = String(d.recipient || '')
        .split(',')
        .map(x => x.trim())
        .filter(x => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
      if (!to.length || to.length !== String(d.recipient || '').split(',').map(x => x.trim()).filter(Boolean).length)
        return res.status(400).json({error: 'Geçerli alıcı e-postası gerekli'});
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD},
      });
      const html = htmlFor(d);
      await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: 'Kontrol Raporu - ' + (d.customer || 'Yeni'),
        html,
        attachments: [
          {filename: 'Kontrol-Raporu.html', content: html, contentType: 'text/html; charset=utf-8'},
          ...(req.files || []).map(f => ({filename: f.originalname, content: f.buffer, contentType: f.mimetype})),
        ],
      });
      res.json({ok: true});
    } catch (e) {
      console.error(e);
      res
        .status(500)
        .json({
          error: 'SMTP gönderimi başarısız. Sunucu ayarlarını kontrol edin.',
        });
    }
  },
);
app.listen(Number(process.env.PORT || 4000), '0.0.0.0', () =>
  console.log('API hazır: 4000'),
);
