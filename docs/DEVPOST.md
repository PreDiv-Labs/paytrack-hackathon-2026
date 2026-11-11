# Devpost submission draft

**Name:** PayTrack  
**Tagline:** Your AI Financial Copilot for PayPal.

## Inspiration

A payment record tells you what happened. It often doesn't tell you what to do next. Individuals and small merchants need a clear way to connect spending questions, budget choices and shared expenses back to reliable evidence.

## What it does

PayTrack organizes verified PayPal Sandbox activity into a currency-aware financial workspace. Users can review and approve a checkout, inspect capture evidence, explore recorded cash flow, create category budgets, and ask an evidence navigator to select relevant financial facts and charts. Budget suggestions remain reviewable and require confirmation. Shared-expense participants approve their own payments to the configured merchant.

## How it is built

Next.js App Router, React, TypeScript, Tailwind, Radix UI, Auth.js, Prisma and Neon form the application. PayPal OAuth supplies identity; Checkout Orders v2 and verified webhooks supply financial evidence. Integer arithmetic, scoped queries and unique ledger references protect calculation and reconciliation boundaries. AG Grid Community powers the explorer; AG Charts Community supplies financial views.

Gemini structured output selects among deterministic fact IDs, budget-category suggestions and allowed visualizations. The server rejects unknown references. The model cannot query arbitrary SQL, alter amounts, execute payments or save a budget. Numerical statements are rendered from server-calculated facts, and the underlying payment evidence remains accessible.

## Challenges

An OAuth subject is not automatically a Checkout payer ID. A return URL is not a successful capture. A model-generated financial statement is not evidence. PayTrack explicitly handles each boundary: verified payer attributes, authoritative server retrieval, and schema-constrained AI selection over deterministic facts.

## Impact and distinction

PayTrack focuses on explainable decisions rather than a generic chat interface. A user can move from “where did my spending go?” to source records and a reviewed budget target. Empty accounts remain honestly empty, currencies stay separate, and the financial workspace remains useful when the AI provider is unavailable.

## Sponsor tools actually implemented

PayPal Sandbox REST APIs, AG Grid Community and AG Charts Community. Gemini is the optional AI provider. No AG Studio Agent Framework, APIMatic runtime, Elastic, KERNEL, Zapier or deployed Render integration is claimed. A Render manifest and Postman collection are development artifacts, not evidence of deployed service use.

## Submission readiness — edit before posting

This draft is **not ready to publish as a completed end-to-end claim**. Add the public repository URL, functional demo/run instructions and public YouTube URL after approval. Confirm actual buyer OAuth/approval/capture, signed webhook delivery and a real Gemini response. Remove or qualify any feature that does not pass those tests. Do not describe the limited-history baseline as tested against historical payments unless legitimate history exists. A real AI integration is required for the competition; deterministic fallback alone is insufficient.

## Next steps

Complete final origin configuration, broaden verified Sandbox testing, add a licensed Studio analytics workspace if time allows, and improve reconciliation coverage for disputes and reversals before considering production use.
