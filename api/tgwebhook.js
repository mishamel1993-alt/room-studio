// api/tgwebhook.js
export const config = { runtime: 'edge' };

const REPLY = `Спасибо! Мы свяжемся с вами в ближайшее время 🙌

А пока — наши соцсети:
• YouTube: https://www.youtube.com/channel/UCOny814J_4fY1OKJG99IR7Q
• VK: https://vk.com/room_sound
• Instagram*: https://www.instagram.com/room.studio15/
• Telegram: https://t.me/room_studio15

Телефон: +7 985 925-38-08
Адрес: г. Подольск, ул. Дружбы, д. 15

*Meta Platforms Inc. признана экстремистской организацией в РФ.`;

const KB = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '🎥 YouTube',  url: 'https://www.youtube.com/channel/UCOny814J_4fY1OKJG99IR7Q' },
        { text: '🎧 VK',       url: 'https://vk.com/room_sound' }
      ],
      [
        { text: '📸 Instagram*', url: 'https://www.instagram.com/room.studio15/' },
        { text: '💬 Telegram',   url: 'https://t.me/room_studio15' }
      ]
    ]
  }
};

async function send(token, payload) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  });
  return r.json();
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TOKEN) return new Response('Missing TELEGRAM_BOT_TOKEN', { status: 500 });

  const update = await req.json().catch(() => ({}));
  const msg = update.message || update.edited_message;
  if (!msg) return new Response('ok');

  const chatId = msg.chat.id;
  const textIn = (msg.text || '').trim().toLowerCase();

  // отвечаем на любой текст (и на /start)
  if (textIn.length >= 0) {
    await send(TOKEN, { chat_id: chatId, text: REPLY, ...KB });
  }

  return new Response('ok');
}
