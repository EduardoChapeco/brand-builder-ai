# Agent System: Operational & DevOps Guidelines

This file serves as the system rules for the Lovable Builder AI, Cursor, or any other autonomous AI assistant inspecting this repository. 

**DO NOT IGNORE THIS FILE. IT IS THE PLATFORM'S CORE CONSTITUTION FOR DEPLOYMENT.**

## 1. Auto-Deployment of Supabase Infrastructure

Whenever you are asked to "deploy", "build", "sync", or whenever you perform modifications to the backend architecture, you **MUST** ensure the local Supabase environment is synced to the remote production environment.

*   **Migrations**: Any new SQL file created in `supabase/migrations/` must be applied to the remote Database. Lovable Cloud does this natively when the GitHub sync runs, but you must ensure files follow the timestamp standard `YYYYMMDDHHMMSS_name.sql`.
*   **Edge Functions**: If new folders appear in `supabase/functions/`, they must be deployed. In Lovable, triggering a GitHub Sync automatically packages these functions using the Deno runtime configured in their respective directories. You must ensure `import_map.json` or `deno.json` is perfectly structured within the function folder.

## 2. The Internal App Agents (Sandboxed Browser & Vision)

This platform relies on Internal Asynchronous Agents (React Orchestrated) for the **Brand DNA Cloner** system:
1.  **Agent Scraper**: Uses Steel.dev, Firecrawl or Puppeteer to navigate visually (sandbox) and take deep screenshots of competitor profiles (Instagram/LinkedIn).
2.  **Agent Vision**: Uses LLM Vision APIs (Gemini 2.0 / Groq Multimodal) to interpret colors, grids, padding, fonts, and copywriting hooks entirely from image pixels.

When developing or patching these features, NEVER use simple JSDOM or Cheerio scrapers; you must always use the multimodal vision capability approach. The frontend in `BrandDNAPage.tsx` acts as the Orchestrator (State Machine), making direct parallel calls to these Edge Functions to simulate the "Agents Working" visual feedback for the user.

## 3. Mandatory Provider Agnosticism

The table `api_keys` natively stores keys for providers: `openai`, `gemini`, `openrouter`, `groq`, `firecrawl`, `steel`, `anthropic`. The edge functions MUST ALWAYS search for an available key before invoking the external API. No hardcoded environment variables should be heavily relied upon inside the visual agents.
