# Project Overview

FuturEstate AI (referred to contextually as CodeHunt) is a modern real estate platform designed for the Indian market. It empowers users to discover, buy, and sell properties using smart search, AI-powered market insights, and verified listings. The platform heavily integrates AI to provide automated property valuations, investment reasoning, and offer analysis, delivering a premium, data-driven real estate experience.

---

# Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Icons**: Lucide React
- **Animations**: tw-animate-css (Framer Motion equivalent utilities)
- **Backend/BaaS**: Supabase (Auth, Database, Storage) with `@supabase/ssr`
- **Background Jobs**: Trigger.dev (v3/v4 SDK)
- **AI Integration**: Vercel AI SDK (`ai`), `@ai-sdk/google`, `@ai-sdk/groq`
- **LLM Models**: Google Gemini (e.g., `gemini-2.5-flash`), Groq models, Replicate (for image processing)
- **Mapping**: Leaflet / React-Leaflet

---

# Folder Architecture

- **`src/app`**: Contains the Next.js App Router structure, including pages, layouts, and route groups (auth, dashboard, properties, etc.).
- **`src/components`**: Houses all reusable React components. Includes standard UI elements (in `ui/`), layout components (`navbar.tsx`), and feature-specific components (`property/`).
- **`src/actions`**: Contains Next.js Server Actions handling form submissions, data mutations, and triggering background jobs from the client.
- **`src/lib`**: Core utilities, Supabase client and admin initializers, Zod schemas (`src/lib/schema`), and AI tool configurations.
- **`src/trigger`**: Trigger.dev background tasks for long-running AI operations (property valuation, offer analysis, portfolio generation) to bypass serverless timeouts.
- **`supabase/migrations`**: Directory for managing Postgres database schema changes (tables, Row Level Security policies, indexes).

---

# Routing Structure

Key App Router routes include:

- `/` - Landing Page
- `/properties` - Main property search and listings
- `/properties/[propertyId]` - Individual property details and AI insights
- `/properties/new` - Listing creation wizard
- `/dashboard` - User's main hub
- `/dashboard/portfolio` - Investment portfolio hub
- `/dashboard/offers` and `/dashboard/my-offers` - Offer management
- `/agents` and `/agents/[agentId]` - AI agent interactions
- `/auth`, `/onboarding`, `/profile`, `/search` - User management and discovery

---

# Component Architecture

The application relies on highly modular, reusable UI components:

- **Property Cards:** Components like `ai-valuation-card.tsx` and `property-context-card.tsx` to display real estate data along with AI-generated insights.
- **Search & Maps:** `property-search.tsx` and `nearby-places-map.tsx` for location-based discovery using Leaflet.
- **Wizards & Forms:** `listing-wizard.tsx`, `create-property-form.tsx`, and `make-offer-form.tsx` for complex, multi-step user flows.
- **Dashboard Widgets:** Activity summaries, new launch highlights (`newly-launched.tsx`), and portfolio tracking.
- **Media Components:** `property-image-gallery.tsx` and `property-image-upload.tsx` for handling visuals.
- **Agent Chat Components:** Interactive AI chat elements for property inquiries and advisory.

---

# AI System Architecture

AI features are deeply integrated and run primarily as background jobs to ensure reliability:

- **Property Valuation:** Uses Google Gemini (`gemini-2.5-flash`) with Vercel AI SDK tool-calling (`runAgentWithTools`) to fetch comparable properties, area stats, and compute an estimated price and confidence score (`src/trigger/property-valuation.ts`).
- **Investment Advisory & Portfolio Optimization:** Analyzes user data to generate personalized real estate portfolios (`generate-portfolio.ts`, `investment-insights.ts`).
- **Offer Risk Analysis:** AI reviews proposed offers against market data and property history to identify risks (`analyze-offer.ts`).
- **Neighbourhood Intelligence:** Leverages AI to summarize location advantages and area context.
- **Image Processing:** Uses Replicate for AI-driven image enhancements and processing (`process-studio-image.ts`).

---

# Background Jobs

Trigger.dev is used to handle all resource-intensive and long-running AI tasks. Since AI tool-calling and LLM chain executions can easily exceed Vercel's standard serverless function timeouts, tasks like property valuation and portfolio generation are offloaded to Trigger.dev. This ensures reliable execution, retry capabilities (`retry-failed-ai.ts`), and clean logging.

---

# Database Architecture

Based on the codebase tools and schema files, the Supabase PostgreSQL database includes:

- **`properties`**: Core listings data (address, price, specs).
- **`users` / `profiles`**: Managed via Supabase Auth and synced to a public profile table.
- **`offers`**: Tracks buyer proposals and seller responses.
- **`ai_property_valuations`**: Stores historical AI pricing estimates, confidence scores, and reasoning.
- **`ai_agent_logs`**: Detailed logging of AI tool usage, token consumption, and latency for observability.
- **Relationships**: Properties belong to Users (sellers). Offers link Users (buyers) to Properties. Valuations link AI outputs to specific Properties.

---

# UI Design System

- **Tailwind CSS v4:** Utility-first styling for layout and responsive design.
- **shadcn/ui:** Accessible, customizable component primitives (buttons, dialogs, forms).
- **Icons:** Lucide icons for clean, consistent vector graphics.
- **Animations:** Framer Motion (and `tw-animate-css`) for smooth transitions, micro-interactions, and visual flair (like dynamic globes and card hovers).
- **Theming:** A global dark/light mode system powered by `next-themes` and `ThemeProvider` defined in `layout.tsx`.

---

# Image Handling

Property images are robustly managed:

- **Supabase Storage:** Primary mechanism for secure uploading and serving of user-provided property photos via `property-image-upload.tsx`.
- **AI Processing:** `process-studio-image.ts` handles potential enhancements or background removals.
- **Fallbacks & Placeholders:** Unsplash integration or local fallbacks are used when listing images are unavailable to maintain the premium UI.

---

# Special UI Features

- **AI Valuation Cards:** UI elements that dynamically render tool-called AI reasoning metrics (confidence score, investment risk).
- **Realtime Updates:** Enabled by Supabase subscriptions (`realtime-listeners.tsx`) for instant status changes on properties and offers.
- **Interactive Maps:** Leaflet integrations for nearby insights.
- **Immersive Backgrounds:** Features like a rotating globe background to emphasize a modern, premium aesthetic.
- **AI Agent Chat:** Conversational interfaces for intelligent real estate querying.

---

# Development Rules for AI Agents

When working on this project, adhere strictly to the following guidelines:

- **Do not modify backend logic unnecessarily.** The AI integration and Trigger.dev workflows are highly orchestrated.
- **Preserve Supabase queries.** Ensure RLS (Row Level Security) and database query patterns remain intact.
- **Follow existing Tailwind design system.** Use established CSS variables and shadcn/ui components; avoid unstructured custom CSS.
- **Maintain responsive layouts.** Always ensure mobile-first compatibility across all components.
- **Avoid rewriting entire components.** Make targeted, incremental updates to existing files rather than dropping in full replacements.

---

# Allowed Editing Scope for AI

AI agents working on this project should primarily modify files inside:

- `src/components/`
- `src/app/`
- `src/app/(routes)/`

These contain UI layout and presentation logic.

AI agents may also modify:

- `globals.css`
- Tailwind classes
- component styling

AI agents should avoid modifying:

- `src/actions/`
- `src/lib/`
- `src/trigger/`
- `supabase/migrations/`

These directories contain business logic, database access, and AI orchestration.

---

# UI Page Architecture

**Landing Page**  
`src/app/page.tsx`
- **Sections:**
  - Hero
  - Property search
  - AI features
  - Platform stats
  - Featured properties
  - CTA

**Property Discovery**  
`src/app/properties/page.tsx`
- **Components:**
  - Property grid
  - Search filters
  - Pagination

**Property Detail**  
`src/app/properties/[propertyId]/page.tsx`
- **Components:**
  - Hero image
  - Price sidebar
  - Property specs
  - Neighbourhood insights
  - Offer actions

**Dashboard**  
`src/app/dashboard/page.tsx`
- **Components:**
  - Analytics cards
  - Portfolio overview
  - Offer pipeline

**Agents Page**  
`src/app/agents/page.tsx`
- **Components:**
  - Agent cards
  - Agent descriptions

**Agent Chat**  
`src/app/agents/[agentId]/page.tsx`
- **Components:**
  - Chat interface
  - Rotating globe background
  - Message bubbles

---

# UI Inspiration

The UI redesign should take inspiration from modern prop-tech products and templates.

Reference sources:

**Framer marketplace:**
https://www.framer.com/marketplace/search/?q=real+estate&type=template&pricing=free

**Canva real estate landing pages:**
https://www.canva.com/templates/?query=real-estate

**Wix real estate templates:**
https://www.wix.com/website/templates/html/business/real-estate

**SaaS dashboard inspiration:**
https://www.rocket.new/dashboard/templates/category/real-estate-property
