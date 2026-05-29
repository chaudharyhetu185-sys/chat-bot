/**
 * ================================================================
 * PULSE AI — server.js
 * Express backend server with Google AI Studio (Gemini) integration.
 * Uses the latest @google/genai SDK (v1 API).
 *
 * Routes:
 *   GET  /         → Serve frontend
 *   POST /chat     → Handle AI chat messages
 *   GET  /health   → Health check endpoint
 *
 * Free-tier limits (gemini-2.0-flash):
 *   15 requests/minute | 1,000,000 tokens/minute | 1,500 req/day
 * ================================================================
 */

// ── Load environment variables from .env file ──────────────────
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

// ── App Configuration ──────────────────────────────────────────
const app = express();
const PORT = Number(process.env.PORT || 3000);

// ── Validate required environment variables ────────────────────
const API_KEY = process.env.GEMINI_API_KEY?.trim() || '';
if (!API_KEY) {
  console.error('\n❌ ERROR: GEMINI_API_KEY is not set in .env file!');
  console.error('   Add your API key from Google AI Studio and restart the server.\n');
  process.exit(1);
}

const FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemma-4-31b-it'];
const SUPPORTED_MODELS = new Set(FALLBACK_MODELS);
const DEFAULT_MODEL = 'gemma-4-31b-it';
let MODEL = (process.env.GEMINI_MODEL || '').trim() || DEFAULT_MODEL;
if (!SUPPORTED_MODELS.has(MODEL)) {
  console.warn(`\n⚠️ GEMINI_MODEL "${MODEL}" is not supported. Falling back to ${DEFAULT_MODEL}.\n`);
  MODEL = DEFAULT_MODEL;
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

console.log(`\n   🔐 Auth mode: API key`);
console.log(`   🤖 Model:     ${MODEL}\n`);

// ── Middleware ─────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Helper: System instruction ─────────────────────────────────
function getSystemInstruction() {
  return process.env.SYSTEM_PROMPT ||
    'You are Pulse, a smart and helpful AI assistant. Respond naturally, concisely, and accurately. Be friendly but professional.';
}

// ── Helper: Validate message array ────────────────────────────
function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return false;
  for (const msg of messages) {
    if (!msg.role || !msg.content)                       return false;
    if (!['user', 'assistant'].includes(msg.role))       return false;
    if (typeof msg.content !== 'string')                 return false;
    if (msg.content.trim().length === 0)                 return false;
    if (msg.content.length > 4000)                       return false;
  }
  return true;
}

// ── Helper: Retry with exponential backoff ─────────────────────
async function withRetry(fn, retries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const message = (err.message || '').toLowerCase();
      const isQuotaExceeded = err.status === 429 &&
        (message.includes('quota exceeded') || message.includes('resource_exhausted') || message.includes('free_tier'));
      const isRateLimit = err.status === 429 && !isQuotaExceeded ||
        message.includes('rate limit');
      if (isRateLimit && attempt < retries) {
        const wait = delayMs * Math.pow(2, attempt - 1);
        console.warn(`[WARN] Rate limit — retrying in ${wait}ms (attempt ${attempt}/${retries})`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }
}

// ── POST /chat ─────────────────────────────────────────────────
app.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!validateMessages(messages)) {
      return res.status(400).json({
        error: 'Invalid request. Provide a messages array with role and content.'
      });
    }

    // Limit to last 40 messages
    const trimmed = messages.slice(-40);

    // Split history from latest user message
    const latestMessage = trimmed[trimmed.length - 1];
    const history       = trimmed.slice(0, -1);

    const prompt = history.length
      ? `${history.map(m => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`).join('\n')}\nUser: ${latestMessage.content}`
      : latestMessage.content;

    const result = await withRetry(() =>
      ai.models.generateContent({
        model: MODEL,
        config: { systemInstruction: getSystemInstruction() },
        contents: prompt,
      })
    );

    const reply = result?.text?.trim() || '';

    if (!reply) {
      return res.status(502).json({
        error: 'Gemini returned an empty reply. Please check your API key and model configuration.'
      });
    }

    console.log(`[${new Date().toISOString()}] /chat → model: ${MODEL}`);
    return res.json({ reply, model: MODEL });

  } catch (err) {
    console.error(`[ERROR] /chat →`, err.message);
    console.error(`[ERROR DETAIL]`, JSON.stringify({
      status:  err.status,
      code:    err.code,
      message: err.message,
    }, null, 2));

    if (
      err.message?.includes('API_KEY_INVALID') ||
      err.message?.includes('API key not valid') ||
      err.status === 400
    ) {
      return res.status(401).json({
        error: '❌ Invalid or unauthorized API key. Please check your GEMINI_API_KEY in .env — get one at aistudio.google.com/app/apikey'
      });
    }
    if (err.status === 429) {
      const message = (err.message || '').toLowerCase();
      const quotaExceeded = message.includes('quota exceeded') ||
        message.includes('resource_exhausted') ||
        message.includes('free_tier');
      const responseMessage = quotaExceeded
        ? '⏳ Gemini quota exhausted for the current API key/project. Use a different Google AI Studio API key, enable billing, or try again later.'
        : '⏳ Rate limit reached. Free tier: 15 requests/min. Please wait and try again.';
      return res.status(429).json({ error: responseMessage });
    }
    if (err.message?.toLowerCase().includes('quota')) {
      return res.status(429).json({
        error: '⏳ Rate limit or quota error occurred. Please wait and try again, or use a different API key/project.'
      });
    }
    if (err.status === 503 || err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Gemini service unavailable. Try again later.' });
    }

    return res.status(500).json({
      error: `Server error: ${err.message || 'Unknown error. Check server console.'}`
    });
  }
});

// ── GET /health ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const key        = process.env.GEMINI_API_KEY || '';
  const keyPreview = key.length > 8
    ? `${key.slice(0, 6)}...${key.slice(-4)}`
    : (key ? '✓ Set (short)' : '✗ Missing');
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    provider:  'Google AI Studio (Gemini)',
    sdk:       '@google/genai (latest)',
    model:     MODEL,
    apiKey:    keyPreview,
    keyValid:  key.startsWith('AIza') || key.startsWith('AQ.') || key.startsWith('ya29.')
      ? '✓ Looks valid'
      : '⚠️ Unexpected format — should start with AIza, AQ, or ya29',
  });
});

// ── Catch-all ──────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server ───────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║   🚀 Pulse AI Server running on port ${PORT}          ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\n   📡 Open: http://localhost:${PORT}`);
  console.log(`   🔑 API Key:  ${process.env.GEMINI_API_KEY ? '✓ Loaded' : '✗ Missing!'}`);
  console.log(`   🤖 Model:    ${MODEL}`);
  console.log(`   📦 SDK:      @google/genai (latest)\n`);
  console.log('   Press Ctrl+C to stop.\n');
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.\n`);
    console.error('   Suggestions:');
    console.error('     - Stop the process using the port:');
    console.error('         Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force');
    console.error('     - Or start the server on a different port: set PORT=4000 && npm start');
    process.exit(1);
  }
  console.error('Server error:', err);
  process.exit(1);
});
