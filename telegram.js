export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (!TOKEN || !CHAT_ID) return res.status(500).json({ error: 'Missing bot token or chat ID' });

  try {
    const { name, contact, service, comment, page, ts } = req.body || {};

    const text =
`🎧 Новая заявка — РУМ СТУДИО
Имя: ${name}
Контакт: ${contact}
Услуга: ${service || '-'}
Комментарий: ${comment || '-'}
Страница: ${page || '-'}
Время: ${ts || new Date().toISOString()}`;

    const tgRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text })
    });

    const data = await tgRes.json(); // читаем ответ TG
    if (!data.ok) {
      // отдаём точное описание ошибки в ответ (увидишь в Network → Response)
      return res.status(500).json({ ok:false, error: data.description || 'Telegram API error' });
    }
    return res.status(200).json({ ok:true });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || 'unknown' });
  }
}

