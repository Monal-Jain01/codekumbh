# Hackathon Starter Template

A production-ready Next.js starter that lets you ship an AI-powered app in a single hackathon session.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Auth + Database | Supabase |
| Background Tasks | Trigger.dev v3 |
| AI | Vercel AI SDK + Google Gemini 2.5 Flash |
| Validation | Zod (single schema source of truth) |
| Real-time UI | Supabase Realtime + Trigger.dev React Hooks |

---

## Project Structure

```
src/
├── actions/
│   ├── ai.ts              # Server Action: validate → insert DB row → trigger task → return public token
│   └── auth/auth.ts       # Server Actions: login, signup, signOut
├── app/
│   ├── layout.tsx          # Root layout with Sonner <Toaster />
│   ├── page.tsx            # Home: auth gate + AI dashboard + history
│   └── auth/              # Login, sign-up, forgot-password, confirm, error pages
├── components/
│   ├── ai/
│   │   ├── prompt-form.tsx          # Client form: useFormStatus + useRealtimeRun
│   │   └── generations-history.tsx  # Client component: Supabase Realtime live history
│   ├── auth/               # LoginForm, SignUpForm, ForgotPasswordForm, LogoutButton, etc.
│   └── ui/                 # shadcn/ui primitives
├── lib/
│   ├── schema/index.ts     # ← All Zod schemas + DB types (single source of truth)
│   ├── ai/config.ts        # AI model config + runBackgroundAgent()
│   └── supabase/
│       ├── client.ts       # Browser client (createBrowserClient)
│       ├── server.ts       # Server client (createServerClient + cookies)
│       ├── admin.ts        # Service-role client for Trigger.dev tasks
│       └── proxy.ts        # Middleware session refresh (updateSession)
└── trigger/
    └── ai.ts               # Trigger.dev task: calls AI, writes result to DB
```

---

## Getting Started

### 1. Clone & install

```bash
git clone <your-repo>
cd hackathon-template
pnpm install
```

### 2. Environment variables

Create a `.env.local` file in the root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # Never expose to browser

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=<your-gemini-api-key>

# Trigger.dev
TRIGGER_SECRET_KEY=<your-trigger-secret-key>
```

> Get `SUPABASE_SERVICE_ROLE_KEY` from **Supabase Dashboard → Project Settings → API → service_role**.  
> Get `TRIGGER_SECRET_KEY` from **Trigger.dev Dashboard → Project → API Keys**.

### 3. Set up the database

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
CREATE TABLE generations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt      TEXT        NOT NULL,
  result      TEXT,
  status      TEXT        DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- Users can only read their own rows
CREATE POLICY "users_read_own" ON generations
  FOR SELECT USING (auth.uid() = user_id);
```

Then enable **Realtime** for the table:  
**Supabase Dashboard → Database → Replication → supabase_realtime → Add table → generations**.

### 4. Run locally

```bash
pnpm dev
```

This starts Next.js on `http://localhost:3000` **and** the Trigger.dev dev worker in parallel (see `package.json` scripts).

---

## How It Works

```
User submits prompt
       │
       ▼
Server Action (actions/ai.ts)
  1. Zod validates the input          ← schema from src/lib/schema/index.ts
  2. Auth guarded (Supabase session)
  3. INSERT pending row → generations table
  4. tasks.trigger("generate-ai-response", { prompt, userId, generationId })
  5. auth.createPublicToken(runId)    ← scoped read-only token
  6. Returns { runId, publicToken }
       │
       ▼
Trigger.dev Task (trigger/ai.ts)
  1. Calls runBackgroundAgent(prompt) ← lib/ai/config.ts → Gemini 2.5 Flash
  2. UPDATE generations SET result, status='completed'
       │
       ├─► useRealtimeRun(runId)      ← streams live task status to PromptForm
       └─► Supabase Realtime          ← streams DB row update to GenerationsHistory
```

---

## Key Files

### `src/lib/schema/`
Single source of truth for all Zod schemas and shared TypeScript types, split by domain:

| File | Contents |
|---|---|
| `ai.schema.ts` | `promptSchema`, `PromptInput`, `Generation` type |
| `auth.schema.ts` | `loginSchema`, `signUpSchema`, `forgotPasswordSchema`, `updatePasswordSchema` + their input types |
| `index.ts` | Barrel re-export — import from either the barrel or directly from the file |

```ts
// Via barrel (convenient)
import { promptSchema, loginSchema, type Generation } from "@/lib/schema";

// Direct import (explicit)
import { promptSchema, type Generation } from "@/lib/schema/ai.schema";
import { loginSchema, signUpSchema } from "@/lib/schema/auth.schema";
```

### `src/lib/supabase/admin.ts`
Service-role Supabase client. Use **only** in Trigger.dev tasks or other server-only code. Never import this in a Client Component.

### `src/components/ai/prompt-form.tsx`
- `useFormStatus` — disables the submit button while the Server Action is in-flight
- `useRealtimeRun` — streams live task status (PENDING → EXECUTING → COMPLETED) directly into the UI

### `src/components/ai/generations-history.tsx`
Subscribes to `postgres_changes` on the `generations` table, filtered to the current user. The history list updates live when Trigger.dev writes the AI result back to the database.

---

## Swap the AI Model

Edit `src/lib/ai/config.ts`:

```ts
import { openai } from "@ai-sdk/openai";   // pnpm add @ai-sdk/openai

export const aiModels = {
  primary: openai("gpt-4o-mini"),
};
```

---

## Auth Flow

Supabase handles the full auth lifecycle:

| Route | Purpose |
|---|---|
| `/auth/login` | Email + password sign-in |
| `/auth/sign-up` | Registration with email confirmation |
| `/auth/forget-password` | Send reset email |
| `/auth/update-password` | Set new password (post-reset) |
| `/auth/confirm` | Handles PKCE code exchange + magic link OTP |
| `/auth/error` | Displays auth errors |

Session refresh is handled automatically in middleware via `updateSession()` in `src/lib/supabase/proxy.ts`.

---

## Deployment

```bash
pnpm build
```

Deploy to **Vercel** — it will detect the Next.js project automatically. Add all environment variables in **Vercel Dashboard → Settings → Environment Variables**.

For Trigger.dev, deploy your tasks:

```bash
npx trigger.dev@latest deploy
```


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
