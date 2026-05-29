/**
 * Simple example showing how to load the API key from `.env`
 * and make a single OpenAI Chat completion request.
 *
 * Usage:
 *   node examples/example_request.js
 */

require('dotenv').config();
const { OpenAI } = require('openai');

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('ERROR: OPENAI_API_KEY is not set. Add it to your .env file.');
  process.exit(1);
}

const client = new OpenAI({ apiKey });

async function main() {
  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'user', content: 'Give a short greeting and 3 productivity tips.' }
      ],
      max_tokens: 200,
      temperature: 0.5,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    console.log('\n--- API Reply ---\n');
    console.log(reply || 'No reply received.');

  } catch (err) {
    console.error('\nAPI request failed:');
    console.error(err?.message || err);

    if (err?.status === 401) {
      console.error('→ Unauthorized: check OPENAI_API_KEY in your .env');
    } else if (err?.status === 429) {
      console.error('→ Rate limit: slow down requests or retry later');
    } else if (err?.status === 503) {
      console.error('→ Service unavailable: try again later');
    }

    process.exit(1);
  }
}

main();
