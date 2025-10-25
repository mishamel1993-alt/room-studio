export const config = { runtime: 'edge' };

const KB = {
  reply_markup: {
    inline_keyboard: [[
      { text: '🎥 YouTube', url: 'https://www.youtube.com/channel/UCOny814J_4fY1OKJG99IR7Q' },
      { text: '🎧 VK', url: 'https://vk.com/room_sound' }
    ],[
      { text: '📸 Instagram*', url: 'https://www.instagram.com/room.studio15/' },
      { text: '💬 Telegram', url: 'https://t.me/room_studio15' }
    ]]
  }
};

const REPLY = `Спасибо! Мы свяжемся с вами в ближайшее время 🙌

А пока — наши соцсети:
• YouTube: https://www.youtube.com/channel/UCOny814J_4fY1OKJG99IR7Q
• VK: https://vk.com/room_sound
• Instagram*: https://www.instagram.com/room.studio15/
• Telegram: https://t.me/room_studio15

📞 +7 985 925-38-08
📍 Подольск, ул. Дружбы, д. 15

*Meta Platforms Inc. признана экстремистской организацией в РФ.`;

async function send(token, chatId, text, extra = {}) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...extra })
  });
  return r.json();
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TOKEN) return new Response('Missing TELEGRAM_BOT_TOKEN', { status: 500 });

  const upd = await req.json().catch(() => null);
  const msg = upd?.message || upd?.edited_message;
  if (!msg) return new Response('ok');

  const chatId = msg.chat.id;
  const textIn = (msg.text || '').trim();

  // отвечаем только на /start (в т.ч. /start lead)
  if (textIn.toLowerCase().startsWith('/start')) {
    await send(TOKEN, chatId, REPLY, KB);
  }
  return new Response('ok');
}

