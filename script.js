const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.nav');
const headerSocials = document.querySelector('.header-socials');
headerSocials.addEventListener('toggle', () => {
  if (!headerSocials.open) return;
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Открыть меню');
});
document.addEventListener('click', event => {
  if (!headerSocials.contains(event.target)) headerSocials.open = false;
});
document.addEventListener('focusin', event => {
  if (!headerSocials.contains(event.target)) headerSocials.open = false;
});
menuButton.addEventListener('click', () => {
  headerSocials.open = false;
  const opened = navigation.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(opened));
  menuButton.setAttribute('aria-label', opened ? 'Закрыть меню' : 'Открыть меню');
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Открыть меню');
}));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (headerSocials.open) {
      headerSocials.open = false;
      headerSocials.querySelector('summary').focus();
    }
    navigation.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Открыть меню');
  }
});
const audio = document.getElementById('showreel');
const player = document.getElementById('player');
const play = document.getElementById('play-button');
const seek = document.getElementById('audio-seek');
const status = document.getElementById('audio-status');
const waveform = document.querySelector('.waveform');
const durationLabel = document.getElementById('duration');
const elapsedLabel = document.getElementById('elapsed');
// Decorative meter, not a claim to represent the audio's actual waveform.
for (let i = 0; i < 88; i++) {
  const bar = document.createElement('span');
  bar.style.height = `${8 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * .31)) * 38}px`;
  bar.style.setProperty('--meter-delay', `${-(i % 11) * .12}s`);
  bar.style.setProperty('--meter-speed', `${.62 + (i % 7) * .09}s`);
  waveform.append(bar);
}
const bars = [...waveform.children];
const time = seconds => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '—:—';
function updateAudio() {
  const fraction = audio.duration ? audio.currentTime / audio.duration : 0;
  seek.value = Math.round(fraction * 1000);
  seek.setAttribute('aria-valuetext', `${time(audio.currentTime)} из ${time(audio.duration)}`);
  elapsedLabel.textContent = time(audio.currentTime);
  durationLabel.textContent = time(audio.duration);
  bars.forEach((bar, i) => bar.classList.toggle('passed', i / bars.length < fraction));
}
audio.addEventListener('loadedmetadata', updateAudio);
audio.addEventListener('timeupdate', updateAudio);
audio.addEventListener('play', () => {
  player.classList.add('is-playing');
  play.setAttribute('aria-label', 'Приостановить шоурил');
  status.textContent = 'Сейчас играет / Room Studio — Showreel Mix';
});
audio.addEventListener('pause', () => {
  player.classList.remove('is-playing');
  play.setAttribute('aria-label', 'Воспроизвести шоурил');
  status.textContent = 'Пауза. Продолжим, когда будешь готов.';
});
audio.addEventListener('ended', () => { status.textContent = 'Понравилось звучание? Давай обсудим твой трек.'; });
audio.addEventListener('error', () => { status.textContent = 'Не удалось загрузить аудио. Попробуй ещё раз.'; });
play.addEventListener('click', async () => {
  if (audio.paused) {
    try { await audio.play(); }
    catch { status.textContent = 'Не удалось включить аудио. Попробуй ещё раз.'; }
  } else audio.pause();
});
seek.addEventListener('input', () => {
  if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value) / 1000 * audio.duration;
  updateAudio();
});
document.getElementById('mute-button').addEventListener('click', event => {
  audio.muted = !audio.muted;
  event.currentTarget.textContent = audio.muted ? 'Звук выключен' : 'Звук включён';
  event.currentTarget.setAttribute('aria-label', audio.muted ? 'Включить звук' : 'Выключить звук');
});
document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
  document.getElementById('service').value = link.dataset.service;
}));
const projectForm = document.getElementById('project-form');
const messageDialog = document.getElementById('message-dialog');
const messagePreview = document.getElementById('message-preview');
const copyStatus = document.getElementById('copy-status');
projectForm.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(projectForm);
  const comment = String(data.get('comment') || '').trim();
  const telegram = String(data.get('telegram') || '').trim();
  messagePreview.value = `Привет, РУМ СТУДИО!\nМеня зовут ${String(data.get('name')).trim()}.\nИнтересует: ${data.get('service')}.\nТелефон: ${String(data.get('contact')).trim()}${telegram ? '\nTelegram: ' + telegram : ''}${comment ? '\n\nО проекте: ' + comment : ''}\n\nДавайте обсудим детали и время.`;
  copyStatus.textContent = 'Сообщение пока никуда не отправлено.';
  messageDialog.showModal();
});
document.querySelector('.dialog-close').addEventListener('click', () => messageDialog.close());
messageDialog.addEventListener('click', event => { if (event.target === messageDialog) {
  const bounds = messageDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) messageDialog.close();
} });
document.getElementById('copy-message').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(messagePreview.value);copyStatus.textContent = 'Скопировано. Теперь можно отправить в Telegram.'; }
  catch { messagePreview.focus();messagePreview.select();copyStatus.textContent = 'Выделили текст. Скопируй его вручную.'; }
});

// Progressive enhancement: content remains readable if motion is disabled or JS fails.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionToggles = [...document.querySelectorAll('.motion-toggle')];
let motionPaused = false;
const activeReveals = new Set();
const revealed = new WeakSet();
const motionEnabled = () => !motionPaused && !motionPreference.matches;
function reveal(element, delay = 0) {
  if (revealed.has(element)) return;
  revealed.add(element);
  if (!motionEnabled() || typeof element.animate !== 'function') return;
  const animation = element.animate([
    { opacity: 0, transform: 'translate3d(0, 22px, 0)' },
    { opacity: 1, transform: 'translate3d(0, 0, 0)' }
  ], { duration: 720, delay, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' });
  activeReveals.add(animation);
  const cleanUp = () => activeReveals.delete(animation);
  animation.addEventListener('finish', cleanUp, { once: true });
  animation.addEventListener('cancel', cleanUp, { once: true });
}
function syncMotion() {
  const enabled = motionEnabled();
  document.documentElement.classList.toggle('motion-on', enabled);
  motionToggles.forEach(toggle => {
    toggle.hidden = motionPreference.matches;
    toggle.setAttribute('aria-pressed', String(motionPaused));
    toggle.setAttribute('aria-label', motionPaused ? 'Включить анимацию' : 'Приостановить анимацию');
    toggle.querySelector('.motion-toggle-symbol').textContent = motionPaused ? '▶' : 'Ⅱ';
    toggle.querySelector('.motion-toggle-label').textContent = motionPaused ? 'На паузе' : 'Анимация';
  });
  if (!enabled) activeReveals.forEach(animation => animation.cancel());
}
motionToggles.forEach(toggle => toggle.addEventListener('click', () => { motionPaused = !motionPaused; syncMotion(); }));
motionPreference.addEventListener('change', syncMotion);
syncMotion();
document.addEventListener('visibilitychange', () => {
  document.documentElement.classList.toggle('page-hidden', document.hidden);
});
document.documentElement.classList.toggle('page-hidden', document.hidden);

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(entries => {
    let stagger = 0;
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      reveal(entry.target, Math.min(stagger++ * 65, 195));
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: .08, rootMargin: '0px 0px -20px 0px' });
  document.querySelectorAll('.section-heading, .service, .player, .gallery-frame, .gallery-bottom, .space-intro, .space-stat, .acoustic-note, .equipment-tabs, .equipment-deck, .map-reserved, .arrival-panel, .wayfinding-row, .price-card, .price-deposit, .package-note, .process-heading, .process-grid article, .faq-section > div, .booking-grid > div, #project-form, .footer-top').forEach(element => revealObserver.observe(element));
  const ambientObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-nearby', entry.isIntersecting));
  }, { rootMargin: '60px' });
  document.querySelectorAll('.hero, .sound-room-scene, .discipline-strip, .studio-space, .sonic-signature, .player').forEach(element => ambientObserver.observe(element));
} else {
  document.querySelectorAll('.hero, .sound-room-scene, .discipline-strip, .studio-space, .sonic-signature, .player').forEach(element => element.classList.add('is-nearby'));
}
document.querySelectorAll('.hero-eyebrow, #hero-title, .hero-description, .hero-actions').forEach((element, index) => reveal(element, index * 90));
document.querySelectorAll('details').forEach(details => {
  details.addEventListener('toggle', () => {
    if (!details.open || !motionEnabled()) return;
    const content = details.querySelector('.service-description, p');
    if (!content || typeof content.animate !== 'function') return;
    revealed.delete(content);
    reveal(content);
  });
});
// Keyboard focus should never land on a control mid-reveal.
document.addEventListener('focusin', () => activeReveals.forEach(animation => animation.cancel()));

// Without JS these are ordinary anchor links and all four categories stay visible.
const equipmentTabs = document.querySelector('.equipment-tabs');
if (equipmentTabs) {
  const tabs = [...equipmentTabs.querySelectorAll('a')];
  const panels = tabs.map(tab => document.getElementById(tab.hash.slice(1)));
  equipmentTabs.setAttribute('role','tablist');
  document.querySelector('.equipment-deck').classList.add('is-enhanced');
  tabs.forEach((tab,index) => {
    tab.setAttribute('role','tab');
    tab.setAttribute('aria-controls',panels[index].id);
    panels[index].setAttribute('role','tabpanel');
    panels[index].tabIndex = 0;
  });
  function selectEquipment(index, focus = false, animate = false) {
    if (focus) tabs[index].focus();
    tabs.forEach((tab,i) => {
      tab.setAttribute('aria-selected',String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (animate) { revealed.delete(panels[index]);reveal(panels[index]); }
  }
  tabs.forEach((tab,index) => {
    tab.addEventListener('click',event => {
      event.preventDefault();
      if (tab.getAttribute('aria-selected') === 'true') return;
      selectEquipment(index,true,true);
    });
    tab.addEventListener('keydown',event => {
      if (event.key === ' ') {
        event.preventDefault();
        if (tab.getAttribute('aria-selected') !== 'true') selectEquipment(index,true,true);
        return;
      }
      let next;
      if (event.key === 'ArrowRight') next = (index+1)%tabs.length;
      else if (event.key === 'ArrowLeft') next = (index+tabs.length-1)%tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length-1;
      else return;
      event.preventDefault();
      selectEquipment(next,true,true);
    });
  });
  const initial = tabs.findIndex(tab => tab.hash === location.hash);
  selectEquipment(initial >= 0 ? initial : 0);
  window.addEventListener('hashchange',() => {
    const index = tabs.findIndex(tab => tab.hash === location.hash);
    if (index >= 0) selectEquipment(index);
  });
}

// Accessible photo viewer; image links remain usable without JavaScript.
window.addEventListener('DOMContentLoaded', () => {
  const links = [...document.querySelectorAll('[data-studio-photo]')];
  const dialog = document.getElementById('studio-lightbox');
  if (!dialog || !links.length) return;
  const image = dialog.querySelector('img');
  const caption = dialog.querySelector('p');
  let index = 0;
  function show(next) {
    index = (next + links.length) % links.length;
    image.src = links[index].href;
    image.alt = links[index].querySelector('img').alt;
    caption.textContent = `${String(index + 1).padStart(2,'0')} / ${links.length} — ${links[index].dataset.caption}`;
  }
  links.forEach((link,i) => link.addEventListener('click', event => {
    if(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); show(i); dialog.showModal();
  }));
  dialog.querySelector('.studio-lightbox-close').addEventListener('click',()=>dialog.close());
  dialog.querySelector('[data-gallery-prev]').addEventListener('click',()=>show(index-1));
  dialog.querySelector('[data-gallery-next]').addEventListener('click',()=>show(index+1));
  dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowRight'){event.preventDefault();show(index+1)}
    if(event.key==='ArrowLeft'){event.preventDefault();show(index-1)}
  });
  dialog.addEventListener('click',event=>{
    const box=dialog.getBoundingClientRect();
    if(event.target===dialog && (event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom)) dialog.close();
  });
});
