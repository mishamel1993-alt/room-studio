// api/tgwebhook.js
export const config = { runtime: 'edge' }; // моментальный отклик на Vercel

async function sendMessage(token, chatId, text, extra = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...extra })
  });
  return res.json();
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TOKEN) return new Response('No token provided', { status: 500 });

  const update = await req.json();
  const msg = update.message || update.edited_message;
  if (!msg) return new Response('ok'); // неинтересное событие

  const chatId = msg.chat.id;
  const textIn = (msg.text || '').trim();

  // стандартный автоответ
  const reply = `
Спасибо! Мы свяжемся с вами в ближайшее время 🙌

Пока можете заглянуть к нам в соцсети:

🎥 YouTube: https://www.youtube.com/channel/UCOny814J_4fY1OKJG99IR7Q  
💬 Telegram: https://t.me/room_studio15  
📸 Instagram*: https://www.instagram.com/room.studio15/  
🎧 VK: https://vk.com/room_sound  

📞 +7 985 925-38-08  
📍 г. Подольск, ул. Дружбы, д. 15  

*Meta Platforms Inc. признана экстремистской организацией на территории РФ.
`;

  // автоответ при /start или первом сообщении
  if (textIn.startsWith('/start') || textIn.length > 0) {
    await sendMessage(TOKEN, chatId, reply);
  }

  return new Response('ok');
}
