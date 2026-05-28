# Pulse AI — Setup Guide

A professional full-stack AI chatbot built with **Node.js + Express** backend and a clean **HTML/CSS/JS** frontend, powered by **OpenAI GPT**.

---

## Project Structure

```
chat bot/
├── public/              ← Frontend (served as static files)
│   ├── index.html
│   ├── style.css
│   └── script.js
├── server.js            ← Express backend + OpenAI integration
├── package.json
├── .env                 ← Your secret API key (never commit this!)
├── .env.example         ← Template for .env
└── .gitignore
```

---

## Step-by-Step Setup

### Step 1 — Install Node.js
Download and install Node.js (v18+) from: https://nodejs.org

Verify installation:
```bash
node --version
npm --version
```

### Step 2 — Install Dependencies
Open a terminal in the `chat bot` folder and run:
```bash
npm install
```

### Step 3 — Add Your OpenAI API Key
1. Open the `.env` file
2. Replace `sk-your-openai-api-key-here` with your real API key
3. Get your key at: https://platform.openai.com/api-keys

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

### Step 4 — Start the Server
```bash
npm start
```
Or for auto-reload during development:
```bash
npm run dev
```

### Step 5 — Open in Browser
Go to: **http://localhost:3000**

---

## API Endpoints

| Method | Endpoint  | Description                        |
|--------|-----------|------------------------------------|
| GET    | `/`       | Serves the frontend chat UI        |
| POST   | `/chat`   | Send message, get AI reply         |
| GET    | `/health` | Check server status and config     |

### POST /chat — Request Body
```json
{
  "messages": [
    { "role": "user", "content": "What is machine learning?" }
  ]
}
```

### POST /chat — Response
```json
{
  "reply": "Machine learning is a subset of AI...",
  "model": "gpt-4o-mini",
  "tokens": 145
}
```

---

## Security

- ✅ API key stored in `.env` — never in frontend code
- ✅ `.env` is listed in `.gitignore` — won't be committed
- ✅ Input validation on all requests
- ✅ Error messages never expose internal details

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `OPENAI_API_KEY is not set` | Add your key to the `.env` file |
| `Cannot connect to server` | Make sure `npm start` is running |
| `401 Unauthorized` | Your API key is invalid or expired |
| `429 Rate limit` | Wait a moment and try again |
| Port 3000 in use | Change `PORT=3001` in `.env` |
