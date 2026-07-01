# AgentTrust Frontend (Demo)

A minimal Next.js demo app showing the AgentTrust flow end-to-end against the
live Stellar testnet contract: register verifier → issue credential → check
credential → revoke credential.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the env template and fill in your **testnet-only** secret keys:
   ```bash
   cp .env.local.example .env.local
   ```
   Get the secret keys from your local Stellar CLI identities:
   ```bash
   stellar keys show hackathon-deployer   # -> NEXT_PUBLIC_ADMIN_SECRET
   stellar keys show verifier-1           # -> NEXT_PUBLIC_VERIFIER_SECRET
   stellar keys show agent-1              # -> NEXT_PUBLIC_AGENT_SECRET
   ```
   Paste each into `.env.local`. This file is gitignored and never committed.

3. Run the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## Important

This demo signs transactions directly in the browser using secret keys loaded
from local environment variables. That's fine for a **testnet-only hackathon
demo**, but is not a pattern to use in production — a real app should use a
wallet extension (e.g. Freighter) so users hold their own keys.
