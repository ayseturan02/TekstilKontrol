const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const {htmlFor} = require('../shared/reportTemplate');
const {ServiceError} = require('./errors');

function createApp({recipientStore, env = process.env, createTransport = nodemailer.createTransport}) {
  const app = express();
  app.use(cors());
  app.use(express.json({limit: '32kb'}));
  const upload = multer({storage: multer.memoryStorage(), limits: {fileSize: 25 * 1024 * 1024, files: 40}});
  const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const recipientsReady = (req, res, next) => recipientStore ? next() : res.status(503).json({error: 'Alıcı listesi kullanılamıyor.'});
  app.get('/recipients', recipientsReady, (req, res) => res.json({recipients: recipientStore.list()}));
  app.post('/send', upload.array('files', 40), wrap(async (req, res) => {
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
    if (error instanceof ServiceError) return res.status(error.status).json({error: error.message});
    if (error instanceof multer.MulterError) return res.status(400).json({error: 'Ek boyutu veya sayısı sınırı aşıldı.'});
    if (error.type === 'entity.parse.failed') return res.status(400).json({error: 'Geçerli JSON gerekli.'});
    if (error.type === 'entity.too.large') return res.status(413).json({error: 'Gönderilen veri çok büyük.'});
    console.error('API işlemi başarısız:', error.code || error.name);
    res.status(500).json({error: 'İşlem tamamlanamadı. Tekrar deneyin.'});
  });
  return app;
}
module.exports = {createApp};
