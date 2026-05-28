/**
 * ================================================================
 * PULSE AI — server.js
 * Express backend server with OpenAI API integration.
 *
 * Routes:
 *   GET  /         → Serve frontend
 *   POST /chat     → Handle AI chat messages
 *   GET  /health   → Health check endpoint
 * ================================================================
 */

// ── Load environment variables from .env file ──────────────────
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { OpenAI } = require('openai');

// ── App Configuration ──────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

// ── Validate required environment variables ────────────────────
if (!process.env.OPENAI_API_KEY) {
  console.error('\n❌ ERROR: OPENAI_API_KEY is not set in .env file!');
  console.error('   Copy .env.example to .env and add your API key.\n');
  process.exit(1); // Stop the server
}

// ── Initialize OpenAI Client ───────────────────────────────────
// The API key is read from .env — NEVER exposed to frontend
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ── Middleware ─────────────────────────────────────────────────
app.use(cors());                          // Allow cross-origin requests
app.use(express.json());                  // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend files

// ── In-memory conversation history (per session via req body) ──
// For production use a database or Redis with session IDs
// For simplicity here, the client sends its own history

// ── Helper: Build the system message ──────────────────────────
function getSystemMessage() {
  return process.env.SYSTEM_PROMPT ||
    'You are Pulse, a smart and helpful AI assistant. Respond naturally, concisely, and accurately. Be friendly but professional.';
}

// ── Helper: Validate message array ────────────────────────────
function validateMessages(messages) {
  if (!Array.isArray(messages)) return false;
  if (messages.length === 0)    return false;
  for (const msg of messages) {
    if (!msg.role || !msg.content)           return false;
    if (!['user', 'assistant'].includes(msg.role)) return false;
    if (typeof msg.content !== 'string')     return false;
    if (msg.content.trim().length === 0)     return false;
    if (msg.content.length > 4000)           return false;
  }
  return true;
}

// ── POST /chat ─────────────────────────────────────────────────
// Body: { messages: [{role, content}, ...] }
// Returns: { reply: "...", model: "...", tokens: N }
app.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    // ── Input validation ───────────────────────────────────────
    if (!validateMessages(messages)) {
      return res.status(400).json({
        error: 'Invalid request. Provide a messages array with role and content.'
      });
    }

    // ── Limit history to last 20 turns (40 messages) ──────────
    const trimmedHistory = messages.slice(-40);

    // ── Call OpenAI API ────────────────────────────────────────
    const completion = await openai.chat.completions.create({
      model:       process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: getSystemMessage() },
        ...trimmedHistory
      ],
      max_tokens:  800,
      temperature: 0.7,
    });

    // ── Extract response ───────────────────────────────────────
    const reply      = completion.choices[0].message.content.trim();
    const tokensUsed = completion.usage?.total_tokens || 0;
    const modelUsed  = completion.model;

    // ── Log request (no sensitive data) ───────────────────────
    console.log(`[${new Date().toISOString()}] /chat → model: ${modelUsed}, tokens: ${tokensUsed}`);

    // ── Send response ──────────────────────────────────────────
    return res.json({
      reply:  reply,
      model:  modelUsed,
      tokens: tokensUsed
    });

  } catch (err) {
    // ── Handle OpenAI specific errors ─────────────────────────
    console.error(`[ERROR] /chat →`, err.message);

    if (err.status === 401) {
      return res.status(401).json({ error: 'Invalid API key. Check your OPENAI_API_KEY in .env.' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' });
    }
    if (err.status === 503 || err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'OpenAI service is temporarily unavailable. Try again later.' });
    }

    // ── Generic error ──────────────────────────────────────────
    return res.status(500).json({
      error: 'Something went wrong on the server. Please try again.'
    });
  }
});

// ── GET /health ────────────────────────────────────────────────
// Quick check to verify server is running and API key is set
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    model:     process.env.OPENAI_MODEL || 'gpt-4o-mini',
    apiKey:    process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing',
  });
});

// ── Catch-all: Serve frontend for any unknown route ────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start Server ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log(`║   🚀 Pulse AI Server running on port ${PORT}   ║`);
  console.log('╚═══════════════════════════════════════════╝');
  console.log(`\n   📡 Open in browser: http://localhost:${PORT}`);
  console.log(`   🔑 API Key:         ${process.env.OPENAI_API_KEY ? '✓ Loaded' : '✗ Missing!'}`);
  console.log(`   🤖 Model:           ${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`);
  console.log('\n   Press Ctrl+C to stop.\n');
});
