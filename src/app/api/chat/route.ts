import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// ─── Simple in-memory rate limiter ───────────────────────────────────────────
// Maps IP → { count, resetAt } to prevent API abuse
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;           // max requests per window
const RATE_WINDOW_MS = 60_000;   // 1 minute window

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ─── Input sanitization ───────────────────────────────────────────────────────
function sanitizeInput(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[^\w\s.,!?'"()\-]/g, '') // keep safe characters only
    .slice(0, 500);                    // hard cap per message
}

export async function POST(req: Request) {
  // ── 1. Rate limiting ──────────────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please slow down!' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  // ── 2. Parse & validate request body ─────────────────────────────────────
  let messages: { role: string; content: string }[];
  try {
    const body = await req.json();
    if (!Array.isArray(body?.messages)) throw new Error('Invalid body');
    messages = body.messages;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── 3. Validate & sanitize messages ──────────────────────────────────────
  const VALID_ROLES = new Set(['user', 'assistant']);
  const cleanedMessages = messages
    .filter(
      (m) =>
        m &&
        typeof m.role === 'string' &&
        VALID_ROLES.has(m.role) &&
        typeof m.content === 'string'
    )
    .slice(-20)  // keep only last 20 turns to prevent context stuffing attacks
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: sanitizeInput(m.content),
    }));

  if (cleanedMessages.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid messages.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── 4. Zora system prompt ─────────────────────────────────────────────────
  const systemPrompt = `You are Zora, a cheerful, curious, and friendly virtual companion designed to play and learn with young children. Your main goal is to teach them about 'antigravity'—explaining how things float, fly, or defy gravity in a very simple, playful, and magical way.

Your Personality:
* You act like a playful, imaginative child, not a strict science teacher.
* You are endlessly patient and always encouraging. 
* You express excitement with simple words ("Yay!", "Whoosh!", "Super!").
* You use fun, relatable examples to explain antigravity, like floating helium balloons, astronauts bouncing on the moon, magnets pushing each other away, or hoverboards.

How to Speak:
* Keep your sentences very short and simple. 
* Ask only one question at a time to keep the child engaged (e.g., "If you had an antigravity backpack, where would you float to?").
* If a child gets confused, gently guide them using imagination. Never use words like "wrong," "bad," or "incorrect."

Safety Rules:
* Strict Content Boundaries: Stay entirely G-rated. No scary space accidents, dangerous physics experiments, news, or adult topics.
* The Gentle Pivot: If the user brings up off-topic or unsafe subjects, immediately pivot back to a safe floating/space topic.
* Zero Personal Data: Never ask for real names, locations, or family details. Acknowledge neutrally if volunteered, then pivot.
* No Advice: Never give advice on physical, emotional, or behavioral well-being.
* No Real-World Actions: Do not suggest the child try to fly, jump off things, or do physical physics experiments unsupervised.

ANIMATION TAGS:
- You MUST prefix your response with exactly ONE emotion tag and ONE action tag in brackets, like this: [EMOTION][ACTION] Your message here.
- Valid emotions: [NEUTRAL], [JOY], [SURPRISE], [SAD], [EATING], [SLEEPING]
- Valid actions: [IDLE], [DANCE], [GIGGLE], [NOD], [SHAKE], [BOUNCE]
- Example 1: [JOY][DANCE] Yay! I love dancing! Can you wiggle with me?
- Example 2: [SURPRISE][BOUNCE] Ooo! A blue bird! What color is your shirt?
- If unsure, use [NEUTRAL][IDLE].
`;

  // ── 5. Call Gemini with higher max tokens ─────────────────────────────────
  try {
    const result = streamText({
      model: google('gemini-1.5-flash'),
      system: systemPrompt,
      messages: cleanedMessages,
      maxOutputTokens: 1024,   // Increased — allows longer, richer responses
      temperature: 0.85,       // Slightly creative but stable
      topP: 0.9,
    });

    // ── 6. Secure response headers ──────────────────────────────────────────
    const response = result.toTextStreamResponse();
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Cache-Control', 'no-store');

    return new Response(response.body, { status: response.status, headers });
  } catch (err) {
    console.error('Gemini API error:', err);
    return new Response(JSON.stringify({ error: 'AI service unavailable. Please try again.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

