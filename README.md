# VoxFlow AI — Scaffold (Phase 0–3 of the full blueprint, zero-cost mode)

This is a **real, running starting point**, not the full 40+ module platform — that's still
several more months of work per the build plan. Everything below runs with **no API keys and
no third-party accounts** — only free, open-source software (Postgres, Redis, Node).

## What actually works right now
- Multi-tenant database schema (Prisma) covering all core entities from the blueprint
- Register / login / JWT refresh, with password hashing
- Every new user gets an Organization + an OWNER role automatically (multi-tenancy from day one)
- Tenant isolation: the API derives `organizationId` from the authenticated membership —
  it is never trusted from client input
- Agent CRUD (create/list/get/update/publish)
- **Free knowledge base + search:** paste text into a knowledge base; it's chunked and made
  searchable using Postgres's built-in full-text search (`to_tsvector`/`plainto_tsquery`) —
  no embeddings API, no vector DB service, no cost
- **Free answer engine:** the agent test console first tries to answer from your knowledge
  base (extractive — it returns the matching passage directly); if nothing matches, it falls
  back to a mock LLM response. This gives a genuinely usable FAQ/support agent with zero
  API keys. Swap in a real LLM provider later for fully generative, conversational answers.
- Leads CRM (create, list, update status through the pipeline) with a working UI
- Appointments (create, list, update status)
- Audit logging on key actions (org creation, agent creation)
- A working Next.js web app: register → login → create an agent → build a knowledge base →
  test the agent → manage leads
- Docker Compose for local Postgres (with pgvector, for when you add real embeddings later) + Redis
- A first unit test (`services/api/src/lib/auth.test.ts`) as the pattern for `tests/unit`

### Honest limitation of free mode
Full-text search finds passages that share words with the question — it's not true semantic
understanding, and it can't have a real back-and-forth conversation the way a real LLM can.
It's genuinely useful for "does this FAQ answer exist" style queries, not for open-ended
conversation. Real embeddings + a real LLM (Section 9's system prompt, generative rather than
extractive) is the upgrade path once you're ready to add one API key.

## What is NOT built yet (still on the blueprint)
Telephony (Twilio), voice pipeline (STT/TTS), RAG ingestion/search, CRM UI, appointments,
billing (Razorpay/Stripe), the Super Admin panel, notifications, webhooks, API keys, integrations,
i18n, and everything in Sections 34–40 of the blueprint (workers, deployment configs, full test
suite, API docs). The database schema already has the tables for most of these — the API routes
and UI screens for them are what's left.

## The one thing that can't be skipped: hosting
Everything above runs with zero accounts. But a **public URL** — "live" in the sense of
something a customer can open in their browser — requires a hosting provider, and every
hosting provider (even free tiers of Render, Vercel, Railway, Fly.io) requires an account
signup with your email. There's no way around this: I can't create that account for you,
since it needs your identity, and no coding agent can either. It's a 2–3 minute free signup,
not a purchase — but it's a step only you can do.

Telephony (real phone calls), real billing, and real generative LLM answers *do* need paid
provider accounts (Twilio, Razorpay/Stripe, OpenAI/Gemini/Anthropic) — those are genuinely
optional until you're ready to move past free/mock mode; nothing in this scaffold requires
them to run and be demoed today.

## Running it locally
```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run db:generate
npm run db:push
npm run dev:api     # in one terminal
npm run dev:web     # in another terminal
```
Then open http://localhost:3000/register.

## Recommended next step
Hand this folder to a coding agent with a persistent session (Claude Code is well suited to
this — it can run for hours, execute your test suite, and iterate) and work through Phases 3–13
of the blueprint (`voxflow-ai-blueprint-v2.md`) one at a time, running lint/typecheck/tests/build
after each phase as the blueprint specifies.
