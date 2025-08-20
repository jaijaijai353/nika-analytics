# Nika AI Analytics — Vite + Vercel (Serverless Chat)

This package is ready for Vercel. It adds a serverless API route at **/api/chat** that proxies to OpenAI.
For convenience (per your request), the OpenAI key is hardcoded in `api/chat.ts`.
> ⚠️ Do NOT use hardcoded keys for production or public repos.

## Run locally
1. Install deps: `npm install`
2. Dev server: `npm run dev`
3. Upload a CSV in the app, then go to "Chat with Data" and ask a question.

## Deploy to Vercel
- Push to GitHub, then **Import Project** in Vercel.
- No environment variables are required because the key is inside `api/chat.ts`.
- After deploy, open the app and use Chat with Data. It calls `/api/chat`.

## Switching to secure env (recommended)
- Set `OPENAI_API_KEY` in Vercel → Project → Settings → Environment Variables.
- Edit `api/chat.ts` to use `process.env.OPENAI_API_KEY`.
