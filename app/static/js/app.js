'use strict';

const canvas = document.getElementById('bg');
const ctx    = canvas.getContext('2d');

function buildLogo(size, alpha) {
  const offscreen  = document.createElement('canvas');
  offscreen.width  = size;
  offscreen.height = size;
  const c = offscreen.getContext('2d');
  const s = size / 120;

  c.globalAlpha  = alpha;
  c.strokeStyle  = '#00c8f8';
  c.lineCap      = 'round';
  c.shadowColor  = '#00c8f8';
  c.shadowBlur   = size * 0.2;

  const outerSegments = [
    [38, 7,  82,  7],
    [90, 12, 113, 52],
    [113, 68, 90, 108],
    [82, 113, 38, 113],
    [30, 108,  7,  68],
    [7,   52, 30,  12],
  ];

  const innerSpokes = [
    [60, 60, 60, 28],
    [60, 60, 88, 44],
    [60, 60, 88, 76],
    [60, 60, 60, 92],
    [60, 60, 32, 76],
    [60, 60, 32, 44],
  ];

  c.lineWidth = 10 * s;
  outerSegments.forEach(([x1, y1, x2, y2]) => {
    c.beginPath();
    c.moveTo(x1 * s, y1 * s);
    c.lineTo(x2 * s, y2 * s);
    c.stroke();
  });

  c.lineWidth = 9 * s;
  innerSpokes.forEach(([x1, y1, x2, y2]) => {
    c.beginPath();
    c.moveTo(x1 * s, y1 * s);
    c.lineTo(x2 * s, y2 * s);
    c.stroke();
  });

  return offscreen;
}

const LOGOS = [
  buildLogo(56, 0.62),
  buildLogo(36, 0.44),
  buildLogo(22, 0.30),
];

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', () => {
  resizeCanvas();
  initParticles();
});


let particles = [];

/** Crea una partícula en posición aleatoria */
function makeParticle() {
  const tier = Math.floor(Math.random() * 3);
  return {
    x:    Math.random() * canvas.width,
    y:    Math.random() * canvas.height,
    vx:   (Math.random() - 0.5) * 0.22,
    vy:   (Math.random() - 0.5) * 0.22 - 0.04,
    rot:  Math.random() * Math.PI * 2,
    rotV: (Math.random() - 0.5) * 0.0028,
    tier,
    tw:   Math.random() * Math.PI * 2,
    twS:  0.008 + Math.random() * 0.018,
  };
}

/** Crea una partícula desde el borde de la pantalla */
function makeParticleFromEdge() {
  const p    = makeParticle();
  const edge = Math.floor(Math.random() * 4);
  if      (edge === 0) { p.x = Math.random() * canvas.width;  p.y = -60; }
  else if (edge === 1) { p.x = canvas.width + 60;             p.y = Math.random() * canvas.height; }
  else if (edge === 2) { p.x = Math.random() * canvas.width;  p.y = canvas.height + 60; }
  else                 { p.x = -60;                           p.y = Math.random() * canvas.height; }
  return p;
}

function initParticles() {
  const count = Math.floor((canvas.width * canvas.height) / 8000);
  particles   = Array.from({ length: count }, makeParticle);
}

initParticles();

/** Actualiza posición de cada partícula y la dibuja */
function drawParticles() {
  for (const p of particles) {
    p.x   += p.vx;
    p.y   += p.vy;
    p.rot += p.rotV;
    p.tw  += p.twS;

    const logo = LOGOS[p.tier];
    const w    = logo.width;

    // Wrap alrededor de los bordes
    if (p.x < -w)             p.x = canvas.width  + w;
    if (p.x > canvas.width  + w) p.x = -w;
    if (p.y < -w)             p.y = canvas.height + w;
    if (p.y > canvas.height + w) p.y = -w;

    ctx.save();
    ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(p.tw));
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.drawImage(logo, -w / 2, -w / 2);
    ctx.restore();
  }
}

const LOGO_SEGMENTS = [
  [38, 7,  82,  7],   // hexágono exterior
  [90, 12, 113, 52],
  [113, 68, 90, 108],
  [82, 113, 38, 113],
  [30, 108,  7,  68],
  [7,   52, 30,  12],
  [60, 60, 60, 28],   // radios internos
  [60, 60, 88, 44],
  [60, 60, 88, 76],
  [60, 60, 60, 92],
  [60, 60, 32, 76],
  [60, 60, 32, 44],
];

let shards = [];

/** Rompe el logo centrado en (px, py) en fragmentos con física */
function spawnShatter(px, py, tier) {
  const scale = LOGOS[tier].width / 120;

  LOGO_SEGMENTS.forEach(([x1, y1, x2, y2]) => {
    const midX  = px + ((x1 + x2) / 2 - 60) * scale;
    const midY  = py + ((y1 + y2) / 2 - 60) * scale;
    const angle = Math.atan2(midY - py, midX - px) + (Math.random() - 0.5) * 0.8;
    const speed = 1.8 + Math.random() * 3.5;

    shards.push({
      x:  midX,
      y:  midY,
      sx: (x1 - 60) * scale,
      sy: (y1 - 60) * scale,
      ex: (x2 - 60) * scale,
      ey: (y2 - 60) * scale,
      vx:    Math.cos(angle) * speed,
      vy:    Math.sin(angle) * speed,
      rot:   Math.random() * Math.PI * 2,
      rotV:  (Math.random() - 0.5) * 0.18,
      life:  1,
      decay: 0.016 + Math.random() * 0.012,
      gravity: 0.04 + Math.random() * 0.03,
      strokeW: tier === 0 ? 5 : tier === 1 ? 3.5 : 2.5,
      alpha:   tier === 0 ? 0.62 : tier === 1 ? 0.44 : 0.30,
    });
  });
}

function drawShards() {
  shards = shards.filter(s => s.life > 0);

  for (const s of shards) {
    s.vy   += s.gravity;
    s.x    += s.vx;
    s.y    += s.vy;
    s.vx   *= 0.97;
    s.vy   *= 0.97;
    s.rot  += s.rotV;
    s.life -= s.decay;

    ctx.save();
    ctx.globalAlpha  = s.life * s.alpha;
    ctx.strokeStyle  = '#00c8f8';
    ctx.lineWidth    = s.strokeW * s.life;
    ctx.lineCap      = 'round';
    ctx.shadowColor  = '#00c8f8';
    ctx.shadowBlur   = s.strokeW * 4 * s.life;
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.beginPath();
    ctx.moveTo(s.sx, s.sy);
    ctx.lineTo(s.ex, s.ey);
    ctx.stroke();
    ctx.restore();
  }
}

/** Click en el canvas: busca la partícula más cercana y la rompe */
canvas.addEventListener('click', (e) => {
  if (e.target !== canvas) return;

  const rect = canvas.getBoundingClientRect();
  const mx   = e.clientX - rect.left;
  const my   = e.clientY - rect.top;

  let closest     = null;
  let closestDist = Infinity;

  for (const p of particles) {
    const radius = LOGOS[p.tier].width / 2;
    const dist   = Math.hypot(p.x - mx, p.y - my);
    if (dist < radius * 1.4 && dist < closestDist) {
      closestDist = dist;
      closest     = p;
    }
  }

  if (closest) {
    spawnShatter(closest.x, closest.y, closest.tier);
    particles.splice(particles.indexOf(closest), 1);
    setTimeout(() => particles.push(makeParticleFromEdge()), 2000);
  }
});

function renderLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawParticles();
  drawShards();
  requestAnimationFrame(renderLoop);
}

renderLoop();


/* ═══════════════════════════════════════════
   4. CHAT STORE
═══════════════════════════════════════════ */

let chatStore    = [];
let activeChatId = null;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  const today    = todayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (dateStr === today)         return 'Hoy';
  if (dateStr === yesterdayStr)  return 'Ayer';

  const [y, m, d] = dateStr.split('-');
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Crea un nuevo chat y lo agrega al store */
function createChatRecord(firstMessage) {
  const id    = generateId();
  const title = firstMessage
    ? firstMessage.substring(0, 40) + (firstMessage.length > 40 ? '…' : '')
    : 'Nueva conversación';

  const chat = { id, title, date: todayStr(), messages: [] };
  chatStore.unshift(chat);
  activeChatId = id;
  return chat;
}

function getActiveChat() {
  return chatStore.find(c => c.id === activeChatId) || null;
}

/** Persiste un mensaje en el chat activo (crea uno nuevo si no existe) */
function persistMessage(role, text) {
  let chat = getActiveChat();
  if (!chat) chat = createChatRecord(role === 'user' ? text : null);

  chat.messages.push({ role, text, time: new Date().toISOString() });

  // Actualizar título con el primer mensaje del usuario
  if (chat.messages.filter(m => m.role === 'user').length === 1 && role === 'user') {
    chat.title = text.substring(0, 40) + (text.length > 40 ? '…' : '');
  }

  renderSidebar();
}

function deleteChat(id) {
  chatStore = chatStore.filter(c => c.id !== id);

  if (activeChatId === id) {
    activeChatId = chatStore.length ? chatStore[0].id : null;
    if (activeChatId) loadChat(activeChatId);
    else              startFreshChat();
  }

  renderSidebar();
}

function loadChat(id) {
  activeChatId = id;
  const chat   = getActiveChat();
  const box    = document.getElementById('chatBox');
  box.innerHTML = '';
  chat.messages.forEach(m => renderMessage(m.role, m.text, false));
  renderSidebar();
}

function startFreshChat() {
  activeChatId = null;
  document.getElementById('chatBox').innerHTML = '';
}


/* ═══════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════ */

const sidebarEl     = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const pageWrap      = document.getElementById('pageWrap');
let   sidebarOpen   = false;

function openSidebar() {
  sidebarEl.classList.add('open');
  sidebarToggle.classList.add('shifted');
  pageWrap.classList.add('shifted');
  sidebarOpen = true;
}

function closeSidebar() {
  sidebarEl.classList.remove('open');
  sidebarToggle.classList.remove('shifted');
  pageWrap.classList.remove('shifted');
  sidebarOpen = false;
}

sidebarToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  sidebarOpen ? closeSidebar() : openSidebar();
});

document.addEventListener('click', (e) => {
  if (sidebarOpen && !sidebarEl.contains(e.target) && e.target !== sidebarToggle) {
    closeSidebar();
  }
});

sidebarEl.addEventListener('click', (e) => e.stopPropagation());

document.getElementById('btnNewChat').addEventListener('click', () => {
  startFreshChat();
  renderSidebar();
});

/** Renderiza la lista de conversaciones agrupadas por fecha */
function renderSidebar() {
  const body = document.getElementById('sidebarBody');

  if (!chatStore.length) {
    body.innerHTML = '<p style="font-size:.78rem;color:rgba(0,200,248,.3);padding:12px 10px">Sin conversaciones aún.</p>';
    return;
  }

  // Agrupar por fecha
  const groups = {};
  chatStore.forEach(c => {
    if (!groups[c.date]) groups[c.date] = [];
    groups[c.date].push(c);
  });

  body.innerHTML = '';

  Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .forEach(date => {
      const group = document.createElement('div');
      group.className = 'day-group';
      group.innerHTML = `<div class="day-label">${formatDate(date)}</div>`;

      groups[date].forEach(chat => {
        const item = document.createElement('div');
        item.className = 'chat-item' + (chat.id === activeChatId ? ' active' : '');

        const lastMsg = chat.messages[chat.messages.length - 1];
        item.innerHTML = `
          <div class="chat-item-text">
            <div class="chat-item-title">${chat.title}</div>
            <div class="chat-item-time">${lastMsg ? formatTime(lastMsg.time) : ''}</div>
          </div>
          <button class="chat-item-del" title="Eliminar">✕</button>`;

        item.addEventListener('click', (e) => {
          if (e.target.classList.contains('chat-item-del')) {
            e.stopPropagation();
            deleteChat(chat.id);
            return;
          }
          loadChat(chat.id);
        });

        group.appendChild(item);
      });

      body.appendChild(group);
    });
}


/* ═══════════════════════════════════════════
   CHAT UI
═══════════════════════════════════════════ */

const chatBoxEl   = document.getElementById('chatBox');
const userInputEl = document.getElementById('userInput');
const sendBtnEl   = document.getElementById('sendBtn');
const inputHintEl = document.getElementById('inputHint');

const AI_REPLIES = [
  '¡Excelente pregunta! Estoy procesando tu consulta…',
  'Con gusto te ayudo. Déjame analizar eso para darte la mejor respuesta.',
  'Entendido. Basándome en la información disponible, puedo orientarte.',
  'Esa es una pregunta muy interesante desde el punto de vista tecnológico.',
  'Recibido. Trabajando en tu solicitud ahora mismo.',
  'Como asistente de UTEC, mi objetivo es apoyarte en cada paso de tu aprendizaje.',
];

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

/** Agrega un mensaje al chat y opcionalmente lo persiste */
function renderMessage(role, text, save = true) {
  const wrapper = document.createElement('div');
  wrapper.className = `msg ${role}`;

  const avatarLabel = (role === 'ai' || role === 'error')
    ? 'IA'
    : (currentUser ? getInitials(`${currentUser.nombre} ${currentUser.apellido}`) : 'TÚ');

  wrapper.innerHTML = `<div class="av">${avatarLabel}</div><div class="bubble">${text}</div>`;
  chatBoxEl.appendChild(wrapper);
  chatBoxEl.scrollTop = chatBoxEl.scrollHeight;

  if (save && currentUser && role !== 'error') persistMessage(role, text);
}

function showTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.id        = 'typing';
  div.innerHTML = `<div class="av">IA</div><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;
  chatBoxEl.appendChild(div);
  chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typing');
  if (indicator) indicator.remove();
}

async function sendMessage() {
  const text = userInputEl.value.trim();

  if (!text) {
    userInputEl.classList.add('input-error');
    inputHintEl.classList.add('visible');
    userInputEl.focus();
    setTimeout(() => {
      userInputEl.classList.remove('input-error');
      inputHintEl.classList.remove('visible');
    }, 2500);
    return;
  }

  userInputEl.classList.remove('input-error');
  inputHintEl.classList.remove('visible');

  renderMessage('user', text);
  userInputEl.value = '';
  userInputEl.style.height = 'auto';

  showTypingIndicator();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        user_email: currentUser ? currentUser.email : null,
      }),
    });

    if (!response.ok) {
      throw new Error('Error en la respuesta del servidor');
    }

    const data = await response.json();
    removeTypingIndicator();
    renderMessage('ai', data.answer || 'No pude generar una respuesta.');
  } catch (error) {
    removeTypingIndicator();
    const fallback = AI_REPLIES[Math.floor(Math.random() * AI_REPLIES.length)];
    renderMessage('error', 'No pude conectarme con el backend. Respuesta local: ' + fallback, false);
    console.error(error);
  }
}

sendBtnEl.addEventListener('click', sendMessage);

userInputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

userInputEl.addEventListener('input', () => {
  userInputEl.style.height = 'auto';
  userInputEl.style.height = Math.min(userInputEl.scrollHeight, 140) + 'px';
});


/* ═══════════════════════════════════════════
   AUTH & USER STATE
═══════════════════════════════════════════ */

/** Base de usuarios (demo). En producción esto sería una API. */
const VALID_USERS = [
  {
    email:    'admin@admin.com',
    password: 'admin',
    name:     'Admin',
    nombre:   'Admin',
    apellido: '',
    rol:      'Administrador',
  },
];

let currentUser = null;

// Referencias DOM
const userBtnEl       = document.getElementById('userBtn');
const userDropdownEl  = document.getElementById('userDropdown');

/** Actualiza la barra superior y la sidebar según el estado de sesión */
function updateUIForUser() {
  const avatarInitialsEl = document.getElementById('avatarInitials');
  const userNameLabelEl  = document.getElementById('userNameLabel');
  const loginLabelEl     = document.getElementById('loginLabel');
  const dropNameEl       = document.getElementById('dropName');

  if (currentUser) {
    const fullName = `${currentUser.nombre} ${currentUser.apellido}`.trim() || currentUser.name;
    const initials = getInitials(fullName);

    avatarInitialsEl.textContent    = initials;
    userNameLabelEl.textContent     = currentUser.nombre || currentUser.name;
    userNameLabelEl.style.display   = 'inline';
    loginLabelEl.style.display      = 'none';
    dropNameEl.textContent          = fullName;

    document.getElementById('sidebarAvatar').textContent = initials;
    document.getElementById('sidebarName').textContent   = fullName;
    document.getElementById('sidebarEmail').textContent  = currentUser.email;

    sidebarToggle.style.display = 'flex';
    renderSidebar();
    openSidebar();
  } else {
    avatarInitialsEl.textContent  = '?';
    userNameLabelEl.style.display = 'none';
    loginLabelEl.style.display    = 'inline';
    dropNameEl.textContent        = '—';

    sidebarToggle.style.display = 'none';
    closeSidebar();
  }

  userDropdownEl.classList.remove('open');
}

function doLogout() {
  currentUser  = null;
  chatStore    = [];
  activeChatId = null;
  updateUIForUser();
  startFreshChat();
  renderMessage('ai', 'Sesión cerrada. ¡Hasta pronto! 👋', false);
}

/* ── Login ── */
userBtnEl.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!currentUser) openLoginModal();
  else userDropdownEl.classList.toggle('open');
});

document.addEventListener('click', () => userDropdownEl.classList.remove('open'));
userDropdownEl.addEventListener('click', (e) => e.stopPropagation());

function openLoginModal() {
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('modalLogin').classList.add('open');
}

function closeLoginModal() {
  document.getElementById('modalLogin').classList.remove('open');
}

document.getElementById('loginClose').addEventListener('click', closeLoginModal);
document.getElementById('modalLogin').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalLogin')) closeLoginModal();
});

document.getElementById('btnLogin').addEventListener('click', () => {
  const email    = document.getElementById('inputEmail').value.trim().toLowerCase();
  const password = document.getElementById('inputPassword').value;
  const found    = VALID_USERS.find(u => u.email === email && u.password === password);

  if (!found) {
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('inputPassword').value = '';
    return;
  }

  currentUser = { ...found };
  updateUIForUser();
  closeLoginModal();
  startFreshChat();
  renderMessage('ai', `¡Bienvenido/a, ${currentUser.nombre}! 👋 ¿En qué puedo ayudarte hoy?`, true);
});

document.getElementById('inputPassword').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btnLogin').click();
});

/* ── Logout ── */
document.getElementById('btnLogout').addEventListener('click', doLogout);
document.getElementById('btnSidebarLogout').addEventListener('click', doLogout);

/* ── Profile modal ── */
function openProfileModal() {
  if (!currentUser) return;
  document.getElementById('profileNombre').value   = currentUser.nombre   || '';
  document.getElementById('profileApellido').value = currentUser.apellido || '';
  document.getElementById('profileEmail').value    = currentUser.email    || '';
  document.getElementById('profileRol').value      = currentUser.rol      || 'Usuario';
  document.getElementById('profileSaved').style.display = 'none';
  document.getElementById('modalProfile').classList.add('open');
  userDropdownEl.classList.remove('open');
}

function closeProfileModal() {
  document.getElementById('modalProfile').classList.remove('open');
}

document.getElementById('profileClose').addEventListener('click', closeProfileModal);
document.getElementById('modalProfile').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalProfile')) closeProfileModal();
});

document.getElementById('btnProfile').addEventListener('click', openProfileModal);
document.getElementById('sidebarUserBtn').addEventListener('click', openProfileModal);

document.getElementById('btnSaveProfile').addEventListener('click', () => {
  const nombre   = document.getElementById('profileNombre').value.trim();
  const apellido = document.getElementById('profileApellido').value.trim();
  const email    = document.getElementById('profileEmail').value.trim();

  if (!nombre) {
    document.getElementById('profileNombre').focus();
    return;
  }

  currentUser.nombre   = nombre;
  currentUser.apellido = apellido;
  currentUser.email    = email;
  currentUser.name     = `${nombre} ${apellido}`.trim();

  updateUIForUser();

  const savedMsg = document.getElementById('profileSaved');
  savedMsg.style.display = 'block';
  setTimeout(() => { savedMsg.style.display = 'none'; }, 2500);
});

document.getElementById('btnSettings').addEventListener('click', () => {
  userDropdownEl.classList.remove('open');
  renderMessage('ai', 'Configuración en construcción. ¡Volvé pronto!', false);
});

/* ── Init ── */
renderMessage(
  'ai',
  '¡Hola! Soy UTECia, tu asistente de inteligencia artificial. Iniciá sesión para guardar tus conversaciones.',
  false
);
