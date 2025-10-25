export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TOKEN || !CHAT_ID) {
    return res.status(500).json({ error: 'Missing bot token or chat ID' });
  }

  try {
    const { name, contact, service, comment, page, ts } = req.body;

    const text = `
💬 Новая заявка с сайта РУМ СТУДИО:
━━━━━━━━━━━━━━
👤 Имя: ${name}
📱 Контакт: ${contact}
🎧 Услуга: ${service}
📝 Комментарий: ${comment || '-'}
🌐 Страница: ${page}
🕓 Время: ${new Date(ts).toLocaleString('ru-RU')}
`;

    const sendUrl = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.description || 'Telegram API error');
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
}

