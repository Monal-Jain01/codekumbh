# CodeHunt - AI-Powered Real Estate Intelligence

CodeHunt is a next-generation real estate platform built with Next.js 15, Supabase, and Trigger.dev. It leverages advanced AI (Google Gemini 2.5 Flash & Groq Llama 3.3 70B) to provide automated property valuations, investment insights, offer risk assessments, and interactive AI agents for real estate discovery.

## 🚀 Core Features

### 🤖 AI-Powered Intelligence
- **Automated Property Valuation**: Background AI tasks analyze property details, location, and market trends to generate accurate price estimates and confidence scores.
- **Investment Advisory**: Personalized investment insights based on user preferences (risk tolerance, budget, preferred property types).
- **Offer Risk Assessment**: AI evaluates incoming offers, scoring them on financial viability, buyer credibility, and market conditions.
- **Neighbourhood Intelligence**: Automatically generates context about a property's surroundings (distance to transit, schools, crime index, future development score).
- **Portfolio Optimization**: Analyzes a user's saved properties and investments to suggest portfolio rebalancing and highlight potential risks/opportunities.

### 💬 Interactive AI Agents
- **Real Estate Assistant**: A conversational AI agent powered by Groq (Llama 3.3 70B) that can search the database for properties, analyze market statistics, and provide personalized recommendations using MCP-style tool calling.
- **Context-Aware Chat**: The agent remembers conversation history and can perform complex queries like "Find me 3BHK apartments in Bangalore under ₹1.5Cr with high rental yield."

### ⚡ Real-Time Experience
- **Live Updates**: Powered by Supabase Realtime, the UI automatically updates when background AI tasks complete (e.g., when a valuation report is ready or a new offer is received).
- **Instant Notifications**: Toast notifications alert users to important events without requiring a page refresh.

### 🏢 Property Management
- **Comprehensive Listings**: Create detailed property listings with images, specifications, and location data.
- **Offer Management**: Receive, review, and accept/reject offers directly through the platform.
- **Status Tracking**: Manage property lifecycle (Draft, Active, Sold, Rented).

### 🔐 Secure & Scalable
- **Authentication**: Secure user authentication and profile management via Supabase Auth.
- **Background Processing**: Heavy AI workloads are offloaded to Trigger.dev, ensuring the UI remains fast and responsive.
- **Robust Database**: PostgreSQL database with Row Level Security (RLS) to protect user data.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, React 19, Server Actions)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), Lucide Icons
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage, Realtime)
- **Background Jobs**: [Trigger.dev v3](https://trigger.dev/)
- **AI Integration**: [Vercel AI SDK](https://sdk.vercel.ai/docs)
- **AI Models**: Google Gemini 2.5 Flash (Background Tasks), Groq Llama 3.3 70B (Interactive Agents)
- **Validation**: [Zod](https://zod.dev/)

## 📂 Project Structure

```
src/
├── actions/        # Next.js Server Actions (Auth, Property, AI, Profile)
├── app/            # Next.js App Router Pages & Layouts
├── components/     # React Components (UI, Forms, Realtime Listeners)
├── lib/            # Utilities, Database Schemas, AI Tool Definitions
├── trigger/        # Trigger.dev Background Tasks & Cron Jobs
└── triggers/       # Trigger.dev Configuration
supabase/
└── migrations/     # Database Schema Migrations
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- Supabase account
- Trigger.dev account
- API keys for Google Gemini and Groq

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd codehunt
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Environment Variables:**
   Create a `.env.local` file in the root directory and add the following variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   TRIGGER_SECRET_KEY=your_trigger_secret_key
   
   GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
   GROQ_API_KEY=your_groq_api_key
   ```

4. **Database Setup:**
   Apply the Supabase migrations to set up the database schema:
   ```bash
   supabase link --project-ref your_project_ref
   supabase db push
   ```

5. **Run the Development Server:**
   ```bash
   pnpm dev
   ```

6. **Run Trigger.dev (in a separate terminal):**
   ```bash
   pnpm dlx trigger.dev@latest dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📝 License

This project is licensed under the MIT License.


