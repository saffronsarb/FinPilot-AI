# Technical Requirements Document (TRD)
## FinPilot AI (BreadBuddy)

### 1. Introduction
FinPilot AI is a modern personal finance dashboard tailored for students. It combines traditional ledger capabilities with gamified progression (fidget scoring, achievements) and an AI-driven Chatbot ("AI Bro") that interprets natural language to track expenses and goals.

### 2. Architecture Overview
The application follows a standard Client-Server Monorepo architecture.
* **Client:** React 18, Vite, Tailwind CSS, TypeScript.
* **Server:** Node.js, Express, SQLite, TypeScript.
* **Shared Module:** `@finpilot/shared` containing unified AI logic and domain constants.

#### 2.1 State Management & Sync
* **Primary Store (Offline-First):** The React frontend relies on `localStorage` as the primary data store for immediate read/writes, ensuring the app is always fast and works offline.
* **Background Sync:** The `syncEngine` periodically (and on visibility change) uploads the `localStorage` state to the Express backend (`sync_state` table) to prevent data loss. On fresh logins, the client pulls the latest state.

### 3. Database Schema (SQLite)
* `users`: Stores authentication and profile data (allowance, currency, vibe, fidget_score).
* `expenses`: Stores transactions parsed by the AI or entered manually.
* `goals`: Tracks savings targets.
* `chat_messages`: Chat history for the AI assistant.
* `sync_state`: Stores the JSON backup of the frontend `localStorage`.

### 4. Key Workflows
#### 4.1 Onboarding Flow
A modular, multi-step wizard (`Onboarding.tsx`) captures:
1. User Name & Vibe
2. Monthly Allowance & Currency
3. Fidget interactions (for gamified onboarding)

#### 4.2 AI Chat Engine
1. The user inputs a natural language prompt (e.g., "I spent $5 on pizza").
2. The client checks local parsing logic (imported from `@finpilot/shared`).
3. If the prompt requires LLM processing, the Express server handles the request using the Gemini API.
4. The server returns a structured intent (e.g., `LOG_EXPENSE`) and an extracted transaction payload.

#### 4.3 Fidget Engine
A gamification loop where users earn points for interacting with UI elements, unlocking achievements and progression badges.

### 5. Deployment Strategy
* **Client:** Designed to be compiled into static assets (`npm run build`) and hosted on any static hosting provider (e.g., Vercel, Netlify).
* **Server:** A Node.js environment with file-system access for the SQLite database.
* **Future Considerations (Phase 8):** Migrating from SQLite to PostgreSQL (Supabase) for real-time multiplayer capabilities.
