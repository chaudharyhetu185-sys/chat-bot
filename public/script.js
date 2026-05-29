/**
 * PULSE AI — public/script.js
 * Frontend client — communicates with /chat backend API.
 * NO API keys here — all secure calls happen on the server.
 */

'use strict';

/* ── Config ──────────────────────────────────────────────────── */
const API_URL = '/chat';          // Backend endpoint (same origin)
const MAX_HISTORY = 40;           // Max messages to send per request

/* ── App State ───────────────────────────────────────────────── */
const state = {
  history:  [],    // [{role, content}] — conversation history
  isDark:   false,
  busy:     false,
  started:  false,
  chatCount: 1,
};

/* ── DOM References ──────────────────────────────────────────── */
function $(id) { return document.getElementById(id); }

const D = {
  sidebar:      $('sidebar'),
  sidebarClose: $('sidebarClose'),
  menuBtn:      $('menuBtn'),
  overlay:      $('overlay'),
  newChatBtn:   $('newChatBtn'),
  chatList:     $('chatList'),
  themeBtn:     $('themeBtn'),
  themeIcon:    $('themeIcon'),
  themeLabel:   $('themeLabel'),
  togglePill:   $('togglePill'),
  toggleKnob:   $('toggleKnob'),
  statusDot:    $('statusDot'),
  statusLabel:  $('statusLabel'),

  topbarSub:    $('topbarSub'),
  topbarStatus: $('topbarStatus'),
  clearBtn:     $('clearBtn'),

  chatWindow:   $('chatWindow'),
  emptyState:   $('emptyState'),
  msgFeed:      $('msgFeed'),
  typingRow:    $('typingRow'),
  suggestions:  $('suggestions'),

  msgInput:     $('msgInput'),
  sendBtn:      $('sendBtn'),
  inputBox:     $('inputBox'),
};

/* ── Markdown-lite Renderer ──────────────────────────────────── */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(text) {
  // 1. Code blocks (``` ... ```)
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, function(_, lang, code) {
    return '<pre><code>' + esc(code.trim()) + '</code></pre>';
  });
  // 2. Inline code
  text = text.replace(/`([^`\n]+)`/g, function(_, c) {
    return '<code>' + esc(c) + '</code>';
  });
  // 3. Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 4. Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // 5. Headings (### H3)
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  // 6. Unordered lists
  text = text.replace(/^[\-\*•] (.+)$/gm, '<li>$1</li>');
  text = text.replace(/(<li>[\s\S]+?<\/li>)/g, function(m) {
    return '<ul>' + m + '</ul>';
  });
  // 7. Ordered lists
  text = text.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // 8. Line breaks (but not inside pre blocks)
  text = text.replace(/\n/g, '<br>');
  return text;
}

/* ── Timestamp ───────────────────────────────────────────────── */
function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ── Scroll to bottom ────────────────────────────────────────── */
function scrollBottom() {
  D.chatWindow.scrollTo({ top: D.chatWindow.scrollHeight, behavior: 'smooth' });
}

/* ── Show / hide typing indicator ───────────────────────────── */
function setTyping(on) {
  if (on) {
    D.typingRow.classList.remove('hidden');
    D.topbarStatus.textContent = 'Typing\u2026';
    scrollBottom();
  } else {
    D.typingRow.classList.add('hidden');
    D.topbarStatus.textContent = 'Connected';
  }
}

/* ── Hide welcome screen ─────────────────────────────────────── */
function hideWelcome() {
  if (state.started) return;
  state.started = true;
  D.emptyState.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  D.emptyState.style.opacity = '0';
  D.emptyState.style.transform = 'translateY(-12px)';
  setTimeout(() => D.emptyState.classList.add('hidden'), 260);
}

/* ── Date separator ──────────────────────────────────────────── */
let dateSepAdded = false;
function addDateSep() {
  if (dateSepAdded) return;
  dateSepAdded = true;
  const sep = document.createElement('div');
  sep.className = 'date-line';
  sep.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric'
  });
  D.msgFeed.appendChild(sep);
}

/* ── Append a message bubble ─────────────────────────────────── */
function appendMsg(text, role, modelTag) {
  const isUser = role === 'user';
  const row    = document.createElement('div');
  row.className = 'msg-row ' + role;

  const ts    = getTime();
  const tag   = modelTag ? `<span class="model-tag">${esc(modelTag)}</span>` : '';
  const html  = isUser ? esc(text) : renderMarkdown(text);

  row.innerHTML = `
    <div class="m-ava ${role}">${isUser ? 'U' : 'P'}</div>
    <div class="msg-grp">
      <div class="msg-label">${isUser ? 'You' : 'Pulse AI'}</div>
      <div class="bubble ${role}">${html}</div>
      <div class="msg-meta">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        ${ts} ${tag}
      </div>
    </div>`;

  D.msgFeed.appendChild(row);
  scrollBottom();
}

/* ── Append error bubble ─────────────────────────────────────── */
function appendError(text) {
  const row = document.createElement('div');
  row.className = 'msg-row bot';
  row.innerHTML = `
    <div class="m-ava bot">P</div>
    <div class="msg-grp">
      <div class="msg-label">Pulse AI</div>
      <div class="bubble bot error">⚠️ ${esc(text)}</div>
    </div>`;
  D.msgFeed.appendChild(row);
  scrollBottom();
}

/* ── Core: Send message to backend ──────────────────────────── */
async function sendMessage(text) {
  const msg = text.trim();
  if (!msg || state.busy) return;

  state.busy = true;
  hideWelcome();
  addDateSep();

  // Render user bubble immediately
  appendMsg(msg, 'user', '');

  // Add to history
  state.history.push({ role: 'user', content: msg });
  if (state.history.length > MAX_HISTORY) {
    state.history = state.history.slice(-MAX_HISTORY);
  }

  // Reset input
  D.msgInput.value = '';
  D.msgInput.style.height = 'auto';
  D.sendBtn.disabled = true;

  // Show typing
  setTyping(true);

  try {
    // ── Call backend ─────────────────────────────────────────
    const res = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        messages: state.history.slice(-MAX_HISTORY)
      }),
    });

    const data = await res.json();

    // ── Handle error responses from server ───────────────────
    if (!res.ok || data.error) {
      throw new Error(data.error || `Server error ${res.status}`);
    }

    // ── Show bot reply ───────────────────────────────────────
    setTyping(false);
    appendMsg(data.reply, 'bot', data.model || '');

    // Add assistant reply to history
    state.history.push({ role: 'assistant', content: data.reply });

  } catch (err) {
    setTyping(false);

    // User-friendly error messages
    let errMsg = err.message;
    if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
      errMsg = 'Cannot connect to the server. Make sure the Node.js server is running on port 3000.';
    }

    appendError(errMsg);
  }

  state.busy = false;
  D.msgInput.focus();
}

/* ── Auto-resize textarea ────────────────────────────────────── */
function handleInput() {
  D.msgInput.style.height = 'auto';
  D.msgInput.style.height = Math.min(D.msgInput.scrollHeight, 130) + 'px';
  D.sendBtn.disabled = D.msgInput.value.trim() === '' || state.busy;
}

/* ── Clear chat ──────────────────────────────────────────────── */
function clearChat() {
  state.history   = [];
  state.started   = false;
  state.busy      = false;
  dateSepAdded    = false;
  D.msgFeed.innerHTML = '';
  setTyping(false);
  D.emptyState.classList.remove('hidden');
  D.emptyState.style.opacity   = '1';
  D.emptyState.style.transform = 'none';
  D.sendBtn.disabled = true;
  D.msgInput.value   = '';
  D.msgInput.style.height = 'auto';
  D.msgInput.focus();
}

/* ── Sidebar ─────────────────────────────────────────────────── */
function openSidebar() {
  D.sidebar.classList.add('open');
  D.overlay.classList.remove('hidden');
}
function closeSidebar() {
  D.sidebar.classList.remove('open');
  D.overlay.classList.add('hidden');
}

/* ── New Chat ────────────────────────────────────────────────── */
function newChat() {
  clearChat();

  // Add to history sidebar list
  const li = document.createElement('li');
  li.className = 'chat-item';
  li.innerHTML = `
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    Chat ${state.chatCount++}`;

  // Mark all others inactive
  document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
  li.classList.add('active');
  li.addEventListener('click', () => {
    document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
    li.classList.add('active');
    clearChat();
    if (window.innerWidth <= 700) closeSidebar();
  });

  D.chatList.insertBefore(li, D.chatList.firstChild);
  if (window.innerWidth <= 700) closeSidebar();
}

/* ── Theme ───────────────────────────────────────────────────── */
const SUN_ICON  = `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>`;
const MOON_ICON = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;

function updateThemeIcon() {
  D.themeIcon.innerHTML = state.isDark ? SUN_ICON : MOON_ICON;
  D.themeLabel.textContent = state.isDark ? 'Light mode' : 'Dark mode';
}

function toggleTheme() {
  state.isDark = !state.isDark;
  document.documentElement.setAttribute('data-theme', state.isDark ? 'dark' : 'light');
  localStorage.setItem('pulse_theme', state.isDark ? 'dark' : 'light');
  updateThemeIcon();
}

function loadTheme() {
  const saved = localStorage.getItem('pulse_theme');
  if (saved === 'dark') {
    state.isDark = true;
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  updateThemeIcon();
}

/* ── Health Check (ping server) ──────────────────────────────── */
async function checkServer() {
  D.statusDot.className   = 'status-dot checking';
  D.statusLabel.textContent = 'Connecting…';

  try {
    const res  = await fetch('/health', { signal: AbortSignal.timeout(5000) });
    const data = await res.json();

    if (res.ok && data.status === 'ok') {
      D.statusDot.className    = 'status-dot online';
      D.statusLabel.textContent = `Online · ${data.model || 'GPT'}`;
    } else {
      throw new Error('Bad response');
    }
  } catch (_) {
    D.statusDot.className    = 'status-dot offline';
    D.statusLabel.textContent = 'Server offline';
  }
}

/* ── Init ────────────────────────────────────────────────────── */
function init() {
  loadTheme();

  // Ensure send button state matches current input (call once on init)
  handleInput();

  // Input
  D.msgInput.addEventListener('input',   handleInput);
  D.msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!D.sendBtn.disabled) sendMessage(D.msgInput.value);
    }
  });

  // Buttons
  D.sendBtn.addEventListener('click',    () => sendMessage(D.msgInput.value));
  D.clearBtn.addEventListener('click',   clearChat);
  D.themeBtn.addEventListener('click',   toggleTheme);
  D.newChatBtn.addEventListener('click', newChat);

  // Sidebar
  D.menuBtn.addEventListener('click',      openSidebar);
  D.sidebarClose.addEventListener('click', closeSidebar);
  D.overlay.addEventListener('click',      closeSidebar);

  // Suggestion chips
  D.suggestions.addEventListener('click', (e) => {
    const btn = e.target.closest('.sugg-btn');
    if (btn) sendMessage(btn.getAttribute('data-q'));
  });

  // Check server health
  checkServer();
  // Re-check every 30 seconds
  setInterval(checkServer, 30000);

  // Focus input
  setTimeout(() => D.msgInput.focus(), 100);
}

document.addEventListener('DOMContentLoaded', init);
