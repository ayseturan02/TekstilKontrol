const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const {htmlFor} = require('../shared/reportTemplate');
const {publicUser, UserError} = require('./users');

function createApp({store, recipientStore, secret, env = process.env, createTransport = nodemailer.createTransport}) {
  const app = express();
  app.use(cors());
  app.use(express.json({limit: '32kb'}));
  const upload = multer({storage: multer.memoryStorage(), limits: {fileSize: 25 * 1024 * 1024, files: 40}});
  const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const auth = (req, res, next) => {
    try {
      const bearer = String(req.headers.authorization || '').match(/^Bearer (.+)$/);
      if (!bearer) throw Error();
      const claims = jwt.verify(bearer[1], secret, {algorithms: ['HS256']});
      const user = store.findById(claims.sub);
      if (!user || (user.authVersion || 0) !== claims.version) throw Error();
      req.user = user;
      next();
    } catch { res.status(401).json({error: 'Oturum geçersiz. Yeniden giriş yapın.'}); }
  };
  const admin = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({error: 'Bu işlem için yönetici yetkisi gerekli.'});
  const attempts = new Map();
  app.post('/login', wrap(async (req, res) => {
    const key = req.ip;
    const now = Date.now();
    for (const [ip, entry] of attempts) if (entry.until <= now) attempts.delete(ip);
    const entry = attempts.get(key) || {count: 0, until: now + 15 * 60 * 1000};
    if (entry.count >= 20) return res.status(429).json({error: 'Çok fazla giriş denemesi yapıldı. Daha sonra tekrar deneyin.'});
    const {email, password} = req.body || {};
    const user = store.findByEmail(email);
    const valid = typeof password === 'string' && Buffer.byteLength(password, 'utf8') <= 72 && user && await bcrypt.compare(password, user.passwordHash);
    if (!valid) { entry.count++; attempts.set(key, entry); return res.status(401).json({error: 'E-posta veya şifre yanlış.'}); }
    attempts.delete(key);
    const token = jwt.sign({version: user.authVersion || 0}, secret, {subject: user.id, expiresIn: '8h', algorithm: 'HS256'});
    res.json({token, user: publicUser(user)});
  }));
  app.get('/me', auth, (req, res) => res.json({user: publicUser(req.user)}));
  app.get('/admin/users', auth, admin, (req, res) => res.json({users: store.list()}));
  app.post('/admin/users', auth, admin, wrap(async (req, res) => {
    const user = await store.create(req.body || {});
    res.status(201).json({user});
  }));
  app.post('/admin/users/:id/reset-password', auth, admin, wrap(async (req, res) => {
    await store.resetPassword(req.params.id, req.body?.password);
    res.json({ok: true});
  }));
  const recipientsReady = (req, res, next) => recipientStore ? next() : res.status(503).json({error: 'Alıcı listesi kullanılamıyor.'});
  app.get('/recipients', auth, recipientsReady, (req, res) => res.json({recipients: recipientStore.list()}));
  app.post('/admin/recipients', auth, admin, recipientsReady, wrap(async (req, res) => {
    const recipient = await recipientStore.create(req.body || {});
    res.status(201).json({recipient});
  }));
  app.delete('/admin/recipients/:id', auth, admin, recipientsReady, wrap(async (req, res) => {
    await recipientStore.remove(req.params.id);
    res.json({ok: true});
  }));
  app.post('/send', auth, upload.array('files', 40), wrap(async (req, res) => {
    let d;
    try { d = JSON.parse(req.body.report); } catch { return res.status(400).json({error: 'Geçerli rapor gerekli.'}); }
    const recipients = String(d?.recipient || '').split(',').map(v => v.trim()).filter(Boolean);
    if (!recipients.length || recipients.some(v => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) return res.status(400).json({error: 'Geçerli alıcı e-postası gerekli'});
    try {
      const transport = createTransport({host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 587), secure: env.SMTP_SECURE === 'true', auth: {user: env.SMTP_USER, pass: env.SMTP_PASSWORD}});
      const html = htmlFor(d);
      await transport.sendMail({from: env.SMTP_FROM || env.SMTP_USER, to: recipients, subject: 'Kontrol Raporu - ' + (d.customer || 'Yeni'), html,
        attachments: [{filename: 'Kontrol-Raporu.html', content: html, contentType: 'text/html; charset=utf-8'}, ...(req.files || []).map(f => ({filename: f.originalname, content: f.buffer, contentType: f.mimetype}))]});
      res.json({ok: true});
    } catch { res.status(500).json({error: 'SMTP gönderimi başarısız. Sunucu ayarlarını kontrol edin.'}); }
  }));
  app.use((error, req, res, next) => {
    if (error instanceof UserError) return res.status(error.status).json({error: error.message});
    if (error instanceof multer.MulterError) return res.status(400).json({error: 'Ek boyutu veya sayısı sınırı aşıldı.'});
    if (error.type === 'entity.parse.failed') return res.status(400).json({error: 'Geçerli JSON gerekli.'});
    if (error.type === 'entity.too.large') return res.status(413).json({error: 'Gönderilen veri çok büyük.'});
    console.error('API işlemi başarısız:', error.code || error.name);
    res.status(500).json({error: 'İşlem tamamlanamadı. Tekrar deneyin.'});
  });
  return app;
}
module.exports = {createApp};
