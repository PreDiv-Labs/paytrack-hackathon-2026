# PayTrack

**Your AI Financial Copilot for PayPal.** A local-first hackathon application that turns PayPal Sandbox captures into a traceable ledger, financial views, and user-approved category budgets.

PayTrack is a functional application under active integration testing. The public `/preview` is deliberately empty and is **not** a substitute for a working payment/AI demo. No seeded financial history, fake balances, password login, or manual transaction entry exists.

## Run locally (Windows / Node 24)

```powershell
npm ci
Copy-Item .env.example .env # only for a new checkout; never overwrite an existing .env
# Fill the private .env using your own rotated Sandbox and Neon credentials.
npm run db:generate
npm run db:validate
node scripts/create-schema.cjs
npm run dev
```

Open [PayTrack](http://localhost:3000), [empty product preview](http://localhost:3000/preview), or [PayPal sign-in](http://localhost:3000/login).

`scripts/create-schema.cjs` accepts only `schema=paytrack_v1`, refuses to run if that schema already exists, rejects destructive DDL, and creates the new schema/tables transactionally. It never resets the old project's database. **For this prepared workspace, the schema is already created; do not run bootstrap again.** Review future migration SQL before applying changes. Do not use `db push --accept-data-loss` or `migrate reset`.

The previous `C:\Users\DELL\Desktop\paytrack-2` project was inspected and preserved. Rotated local values were reused only after user confirmation. New tables are isolated in `paytrack_v1`; legacy tables and records were not migrated or modified. The new ledger starts empty.

## Environment

See `.env.example`. Required server values:

- `DATABASE_URL`: Neon PostgreSQL URL with `sslmode=require&schema=paytrack_v1`.
- `AUTH_URL`: exact origin, initially `http://localhost:3000`; use stable HTTPS for deployment.
- `AUTH_SECRET`: at least 32 random characters. The local project has its own generated secret.
- `PAYPAL_ENVIRONMENT=sandbox`: live mode is intentionally unsupported.
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`: Sandbox Business app credentials.
- `PAYPAL_MERCHANT_ID`: Sandbox Business payer/merchant ID. The prepared workspace verified it privately from an unapproved Orders API response; no capture occurred.
- `PAYPAL_WEBHOOK_ID`: the webhook registration for this app and deployed endpoint.
- Optional `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.8-flash`: enables structured evidence selection. Without it, deterministic summaries continue working and the UI says AI is unavailable.

Never commit `.env`, expose server secrets to client JavaScript, or reuse known compromised credentials. Environment validation occurs on the server. Server error responses omit credentials and provider response bodies.

## Required PayPal dashboard setup

These are external account changes; they were **not** performed automatically.

1. Enable **Login with PayPal** on the same Sandbox app.
2. Add `http://localhost:3000/api/auth/callback/paypal` as a return URL. For deployment, add `https://YOUR-STABLE-HOST/api/auth/callback/paypal` and update `AUTH_URL`.
3. Enable profile, email, and **PayPal account ID** attributes. The authorization scope includes PayPal attributes; if the explicit `payer_id` claim is absent, checkout is blocked rather than guessing from subject or email.
4. Set the webhook URL to `https://YOUR-STABLE-HOST/api/paypal/webhook`. Subscribe to `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.DENIED`, and `PAYMENT.CAPTURE.PENDING`. The prepared credentials currently refer to an older temporary webhook address; it must be updated or replaced for a deployed demo.
5. Use separate Sandbox Business and Personal accounts. Business merchant sign-in verifies the merchant identity and backfills this app’s already-verified captures/refunds if the buyer paid before the merchant connected.

Use `node scripts/check-paypal.cjs` for a read-only credential/webhook check. It prints status codes and webhook hostname, never secrets. Sandbox account authentication and payment approval must be completed by the user.

## Payment workflow

1. Sign in with PayPal Sandbox through Auth.js; database sessions protect all workspace routes.
2. Review description, amount, currency and category on **Pay**. The category is user-supplied metadata, not inferred merchant classification.
3. Confirm the review to create an order using merchant server credentials and a stable idempotency key.
4. Approve on PayPal with the **same Personal account** used to sign in.
5. Return and explicitly choose **Capture & verify payment**. Redirect parameters never prove success.
6. Before capture, recheck payer, amount, currency, merchant and internal reference. After capture, retrieve authoritative order state and verify the completed capture again.
7. Within one database transaction, persist capture status, ledger entries and notifications. Unique references make repeated capture/webhook reconciliation idempotent.

Webhooks use PayPal's verify-signature endpoint before event processing. A verified completed-capture event triggers order retrieval and the same reconciliation. Refund events retrieve authoritative refund details and write opposite-direction entries, once per refund ID. The app supports refund **reconciliation**; refund initiation stays in the merchant's PayPal dashboard. Unknown external orders do not enter the ledger.

## Product areas

- **Overview:** currency-isolated totals, monthly cash flow, spending categories, recent verified records and budget progress.
- **Transactions:** AG Grid Community sorting, column filters, search, direction/type/date/currency filters, pagination, evidence dialogs and scoped CSV export. Pending checkouts appear on Pay rather than verified financial totals.
- **Pay:** reviewed Sandbox Checkout with explicit PayPal approval and independently verified capture.
- **Divide & Pay:** the configured merchant can create equal or exact custom shares. Private bearer links let participants sign in and approve their own merchant payment. No escrow, arbitrary P2P transfers or automatic reminders. A share has at most one checkout; refunds do not automatically reopen a share.
- **Budgets:** monthly category targets, editable by the user. Gross outgoing captures measure progress; refunds remain separate cash inflows. Suggested limits need at least two complete calendar months of history; zero-activity months are included.
- **Copilot:** deterministic facts plus optional Gemini selection of relevant fact IDs and chart views. Every number is rendered from trusted server calculations, and evidence links expose supporting records. It cannot execute payments or save budgets.
- **Analytics:** AG Charts Community and traceable calculated statements. No FX conversion or fabricated comparisons.
- **Connection / Settings:** identity/permission boundaries, configuration checks, profile and logout.

## Validation

Run the app first for HTTP authorization tests, then:

```powershell
npm run test
npm run lint
npm run typecheck
npm run db:validate
# Stop the dev server before Prisma generation/build on Windows (engine DLL lock).
npm run build
npm start
```

Tests cover integer money math, exact split sums, currency/calendar isolation, refund cash flow, evidence-backed budget baselines, capture identity/amount/reference checks, webhook header/origin/status rejection, unauthenticated and cross-origin API denial, and protected-route redirects. A rollback-only Neon integration test runs the actual reconciliation writer repeatedly, verifies one ledger entry per party and no duplicate notifications, and confirms that test fixtures did not persist. No fake history is seeded into the app.

Browser QA uses the actual rendered UI at desktop and mobile widths. See [verification notes](docs/VERIFICATION.md) for the checks actually run and remaining external tests.

## Limitations and completion gates

- Real buyer OAuth, buyer approval/capture, and a real signed webhook round trip remain untested until dashboard settings and Sandbox account authentication are completed.
- Gemini is optional and untested without a provider key. No operational AI claim should be made until a real model request passes.
- Login does not grant complete PayPal history or a PayPal balance. Only this app's verified payment records are analyzed.
- This is a Sandbox hackathon implementation, not a production financial system. It does not handle disputes, reversals, live money, account-wide reporting, or multi-merchant onboarding. The interactive analytics endpoint currently caps history at 10,000 entries and fails clearly above that limit.
- No persistent conversational history, email reminders, automatic budget changes, automatic refunds, or Studio Agent Framework are claimed.
- Auth.js is pinned to a beta version. Payment retries are bounded; pending/failed provider outcomes are never presented as successful captures.
- The prepared deployment manifest is not a deployment. Publishing, deployment and account settings require user authorization.

## Submission materials

[Research and sponsor decisions](docs/RESEARCH.md) · [Architecture](docs/ARCHITECTURE.md) · [Under-three-minute demo](docs/DEMO.md) · [Devpost draft](docs/DEVPOST.md) · [Verification](docs/VERIFICATION.md).

MIT licensed. The repository is prepared locally; it has not been published. Confirm all completion gates before making the repository public or submitting to Devpost.
