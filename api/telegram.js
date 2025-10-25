export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { name, contact, service, comment, page, ts } = req.body || {};
    if (!name || !contact) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const text = `
🎧 Новая заявка — РУМ СТУДИО
Имя: ${name}
Контакт: ${contact}
Услуга: ${service || '-'}
Комментарий: ${comment || '-'}
Страница: ${page || '-'}
Время: ${ts || new Date().toISOString()}
    `;

    const tgResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });

    if (!tgResponse.ok) {
      const body = await tgResponse.text();
      return res.status(500).json({ ok: false, error: body });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
