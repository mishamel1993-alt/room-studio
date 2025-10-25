// api/telegram.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
  const OWNER  = process.env.TELEGRAM_CHAT_ID; // ваш chat_id (255522873)
  if (!TOKEN || !OWNER) return res.status(500).json({ ok:false, error: 'Missing bot token or chat id' });

  try {
    const { name = '', contact = '', service = '', comment = '', page = '', ts = '' } = req.body || {};

    // 1) сообщение владельцу
    const ownerText =
`💬 Новая заявка с сайта РУМ СТУДИО:
━━━━━━━━━━━━━━
👤 Имя: ${name || '-'}
📱 Контакт: ${contact || '-'}
🎧 Услуга: ${service || '-'}
📝 Комментарий: ${comment || '-'}
🌐 Страница: ${page || '-'}
🕓 Время: ${ts || new Date().toISOString()}

🔗 Бот для клиента: https://t.me/Room_st_bot?start=lead`;

    const send = (url, payload) =>
      fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
        .then(r => r.json());

    const api = (method) => `https://api.telegram.org/bot${TOKEN}/${method}`;

    // отправка владельцу
    const ownerResp = await send(api('sendMessage'), { chat_id: OWNER, text: ownerText });
    if (!ownerResp.ok) {
      return res.status(500).json({ ok:false, error: ownerResp.description || 'Telegram error' });
    }

    // 2) попытка написать клиенту в личку (если указал @username и бот уже в диалоге)
    const uname = (contact || '').trim().startsWith('@') ? (contact || '').trim() : '';
    if (uname) {
      const clientText =
`Спасибо, ${name || 'друг'}! Мы получили вашу заявку 🙌

Пока можно заглянуть в наши соцсети:
• YouTube: https://www.youtube.com/channel/UCOny814J_4fY1OKJG99IR7Q
• VK: https://vk.com/room_sound
• Instagram*: https://www.instagram.com/room.studio15/
• Telegram: https://t.me/room_studio15

Если что — напишите нам тут.`;

      // chat_id как @username сработает только если пользователь уже писал боту ранее
      try {
        await send(api('sendMessage'), { chat_id: uname, text: clientText });
      } catch (e) {
        // молча игнорируем (часто "chat not found" — если юзер не нажимал /start)
      }
    }

    return res.status(200).json({ ok:true });
  } catch (e) {
    return res.status(500).json({ ok:false, error: e?.message || 'unknown' });
  }
}
