'use strict';

const nodemailer = require('nodemailer');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = async (req, res) => {
  /* Only accept POST */
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message } = req.body || {};

  /* ── Input validation ── */
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Tüm alanlar zorunludur.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Geçersiz email adresi.' });
  }

  if (name.length > 100 || email.length > 200 || message.length > 2000) {
    return res.status(400).json({ error: 'Girdi çok uzun.' });
  }

  /* ── Send via Gmail SMTP ── */
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, /* STARTTLS */
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Portfolio İletişim" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      replyTo: email,
      subject: `[Portfolio] Yeni mesaj: ${name}`,
      text: `Ad: ${name}\nEmail: ${email}\n\nMesaj:\n${message}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f0f1a;color:#e2e8f0;padding:32px;border-radius:12px;border:1px solid rgba(99,102,241,0.3)">
          <h2 style="color:#6366f1;margin-top:0">Portfolio — Yeni İletişim Mesajı</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:8px 0;color:#94a3b8;width:80px"><strong>Ad:</strong></td>
              <td style="padding:8px 0">${escapeHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#94a3b8"><strong>Email:</strong></td>
              <td style="padding:8px 0"><a href="mailto:${escapeHtml(email)}" style="color:#6366f1">${escapeHtml(email)}</a></td>
            </tr>
          </table>
          <hr style="border:none;border-top:1px solid rgba(99,102,241,0.2);margin:16px 0">
          <p style="color:#94a3b8;margin:0 0 8px"><strong>Mesaj:</strong></p>
          <p style="white-space:pre-wrap;line-height:1.6;margin:0">${escapeHtml(message)}</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[contact] mail error:', err.message);
    return res.status(500).json({ error: 'Mail gönderilemedi. Lütfen tekrar deneyin.' });
  }
};
