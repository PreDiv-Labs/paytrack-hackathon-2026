# PayTrack

### Your AI financial copilot for PayPal

**From payment to clarity.** PayTrack turns verified PayPal Sandbox payments into a traceable transaction ledger, visual spending analytics, category budgets, and AI-assisted answers backed by payment records.

**[Live Demo](https://paytrack-hackathon-2026.onrender.com/)** · [Architecture](docs/ARCHITECTURE.md) · [Verification Notes](docs/VERIFICATION.md)

Built by **Preet and Divya** for the **PayPal AI Hackathon**.

> **Sandbox only:** No real money moves. PayTrack analyzes payments verified through this application; signing in does not import your full PayPal history or expose your PayPal balance.

## Why PayTrack?

A payment confirmation tells you that money moved. Understanding what it means for your spending takes more work. PayTrack connects the payment, its supporting evidence, and the explanation in one workspace, so users can check the records behind an insight.

## Features

| Area | What it does |
| --- | --- |
| **Overview** | Shows currency-specific totals, monthly cash flow, spending categories, recent verified records, and budget progress. |
| **Pay** | Creates a reviewed Sandbox checkout, requests buyer approval on PayPal, and verifies the completed capture before recording it. |
| **Transactions** | Provides search, sorting, filters, pagination, payment evidence dialogs, and scoped CSV export using AG Grid Community. |
| **AI Copilot** | Answers questions about spending, rankings, refunds, monthly comparisons, and budget progress using Gemini-assisted read-only queries and server-calculated amounts. |
| **Budgets** | Lets users create and edit monthly category targets and track outgoing payments against them. Historical suggestions require at least two complete calendar months of activity history. |
| **Analytics** | Visualizes recorded activity using AG Charts Community, with separate reporting for each currency. |
| **Divide & Pay** | Lets the configured Business merchant create equal or custom shares. Participants follow private links and approve their own payments directly to that merchant. |

## Example walkthrough

1. Sign in with a PayPal Sandbox Personal account.
2. Open **Pay**, enter `Food`, select `USD`, set an amount such as `$1.20`, and choose **Dining**.
3. Review the payment and approve it on PayPal using the same buyer account.
4. Return to PayTrack and choose **Capture & verify payment**.
5. Find the completed record in **Transactions** and inspect its payment evidence.
6. Create a **Dining** budget for the current month.
7. Ask the **AI Copilot**, “What was my largest outgoing payment?” and compare the result with the supporting transaction.

For **Divide & Pay**, sign in as the specific Sandbox Business merchant configured for the application. Personal buyer accounts cannot create shared expenses. Participant names label shares; they do not automatically send invitations or move money.

## How PayPal and AI work together

### Verified payments

PayTrack uses PayPal Sandbox authentication and checkout. Before capture, the server checks the buyer, merchant, amount, currency, and internal reference. It then retrieves authoritative order state and verifies the completed capture before persisting ledger entries.

Idempotent reconciliation prevents repeated capture requests or matching webhook deliveries from creating duplicate ledger entries. Webhooks are checked through PayPal's signature-verification endpoint before processing. Refund reconciliation retrieves refund details and records opposite-direction entries; refund initiation remains in the merchant's PayPal dashboard.

### Evidence-backed AI

Gemini interprets natural-language questions and recent follow-ups into validated read-only queries. The server computes the amounts from the signed-in user's authorized records. The interface renders exact figures and evidence links from those calculated results, while Gemini supplies explanatory prose.

The Copilot cannot execute payments or save budgets. If Gemini is unavailable, PayTrack displays provider status and question-specific calculated fallback results where supported.

## Technology

| Layer | Tools |
| --- | --- |
| Application | Next.js, React, TypeScript |
| Authentication | Auth.js with Login with PayPal |
| Payments | PayPal Sandbox Orders API and verified webhooks |
| Database | Neon PostgreSQL and Prisma |
| AI | Google Gemini |
| Tables and charts | AG Grid Community and AG Charts Community |
| Hosting | Render |

## Run locally on Windows

### Prerequisites

- Node.js 24 and npm
- A Neon PostgreSQL database
- A PayPal Developer Sandbox application with separate Business and Personal accounts
- A Gemini API key to enable model-generated explanations and query planning

Clone this repository, open its folder in PowerShell, and run:

```powershell
npm ci
Copy-Item .env.example .env
```

Copy the environment template only for a new checkout. Do not overwrite an existing `.env`.

Configure the following server-side values:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL connection string with `sslmode=require&schema=paytrack_v1` |
| `AUTH_URL` | Application origin; use `http://localhost:3000` locally |
| `AUTH_SECRET` | Random secret of at least 32 characters |
| `PAYPAL_ENVIRONMENT` | Set to `sandbox`; live mode is unsupported |
| `PAYPAL_CLIENT_ID` | Sandbox Business application client ID |
| `PAYPAL_CLIENT_SECRET` | Sandbox Business application secret |
| `PAYPAL_MERCHANT_ID` | The configured Sandbox Business merchant ID |
| `PAYPAL_WEBHOOK_ID` | Webhook registration ID for this application |
| `GEMINI_API_KEY` | Optional for the app; required for Gemini-powered responses |
| `GEMINI_MODEL` | Model selection; see `.env.example` for the configured default |

Generate and validate the database client:

```powershell
npm run db:generate
npm run db:validate
```

For a **new database where `paytrack_v1` does not already exist**, initialize the schema once:

```powershell
node scripts/create-schema.cjs
```

The initialization script refuses to run if that schema already exists. Skip it for an initialized database. Do not use destructive reset commands to bypass this protection.

Start the application:

```powershell
npm run dev
```

Open [localhost:3000](http://localhost:3000).

### PayPal configuration

1. Enable **Login with PayPal** for the same Sandbox application used by checkout.
2. Register `http://localhost:3000/api/auth/callback/paypal` as a local return URL. For deployment, register your HTTPS origin followed by `/api/auth/callback/paypal` and update `AUTH_URL`.
3. Enable profile, email, and **PayPal account ID** attributes. Checkout requires an explicit payer identity.
4. Register a publicly reachable HTTPS webhook at `/api/paypal/webhook` and set its registration ID in `PAYPAL_WEBHOOK_ID`.
5. Subscribe to `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.DENIED`, and `PAYMENT.CAPTURE.PENDING`.
6. Ensure `PAYPAL_MERCHANT_ID` matches the Business account receiving payments. Use a separate Personal account as the buyer.

Run the read-only configuration check:

```powershell
node scripts/check-paypal.cjs
```

Never commit `.env` or expose server secrets in client code, screenshots, or demo recordings.

## Validation

Start the app before running HTTP authorization tests:

```powershell
npm run test
npm run lint
npm run typecheck
npm run db:validate
```

For a production build, stop the development server first on Windows to avoid Prisma engine DLL locks:

```powershell
npm run build
npm start
```

The test suite covers money arithmetic, split totals, currency and calendar isolation, refund cash flow, budget baselines, payment verification, webhook rejection cases, authorization, and idempotent reconciliation. See [verification notes](docs/VERIFICATION.md) for recorded checks and outstanding integration tests. Automated tests do not replace a complete Sandbox checkout, signed-webhook, and live AI check on the deployed application.

## Scope and limitations

- This is a Sandbox hackathon prototype, not a production financial system.
- Only this application's verified payment records are analyzed; full PayPal account history and balances are outside its scope.
- Currencies are reported separately; there is no foreign-exchange conversion.
- Pending checkouts are not counted as completed financial activity.
- Budget progress uses gross outgoing captures; refunds remain separate incoming cash flow.
- Divide & Pay supports payments to the configured merchant, not arbitrary peer-to-peer transfers or escrow.
- The Copilot does not make payments, change budgets, or retain persistent conversation history. Recent turns remain in page state.
- Live payments, disputes, reversals, multi-merchant onboarding, automatic refunds, and email reminders are unsupported.
- Interactive analytics currently supports up to 10,000 ledger entries and reports a clear error above that limit.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Verification notes](docs/VERIFICATION.md)
- [Research and sponsor decisions](docs/RESEARCH.md)
- [Demo walkthrough](docs/DEMO.md)
- [Devpost draft](docs/DEVPOST.md)

## Team

**Preet and Divya** — creators of PayTrack.

## License

Released under the [MIT License](LICENSE).
