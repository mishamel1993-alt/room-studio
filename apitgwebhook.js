// api/tgwebhook.js
export const config = { runtime: 'edge' };

const KB = {
  reply_markup: {
    inline_keyboard: [[
      { text: 'YouTube', url: 'https://www.youtube.com/channel/UCOny814J_4fY1OKJG99IR7Q' },
      { text: 'VK', url: 'https://vk.com/room_sound' }
    ],[
      { text: 'Instagram*', url: 'https://www.instagram.com/room.studio15/' },
      { text: 'Telegram', url: 'https://t.me/room_studio15' }
    ]]
  }
};

function ok(text='ok', code=200){ return new Response(text, { status: code }); }

async function send(token, chatId, text, extra={}) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...extra })
  });
  return r.json();
}

export default async function handler(req) {
  if (req.method !== 'POST') return ok('Method Not Allowed', 405);

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TOKEN) return ok('No token', 500);

  const upd = await req.json().catch(()=>null);
  const msg = upd?.message || upd?.edited_message;
  if (!msg) return ok();

  const chatId = msg.chat.id;
  const textIn = (msg.text || '').trim();

  const reply =
`Спасибо! Мы свяжемся с вами в ближайшее время 🙌

Пока можно заглянуть к нам в соцсети:
• YouTube: https://www.youtube.com/channel/UCOny814J_4fY1OKJG99IR7Q
• VK: https://vk.com/room_sound
• Instagram*: https://www.instagram.com/room.studio15/
• Telegram: https://t.me/room_studio15

Телефон: +7 985 925-38-08
Адрес: г. Подольск, ул. Дружбы, д. 15

*Meta Platforms Inc. признана экстремистской организацией в РФ.`;

  if (textIn.startsWith('/start') || textIn.length > 0) {
    await send(TOKEN, chatId, reply, KB);
  }
  return ok();
}
