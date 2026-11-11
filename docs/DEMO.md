# Demo script — target 2 minutes 40 seconds

Record only verified features. Before recording, finish OAuth configuration, obtain a Gemini key, complete a real Sandbox payment and confirm a real signed webhook. Do not present the empty product preview as a working payment demo. Do not expose secrets, account passwords or personal emails in the recording.

| Time      | Screen                  | Narration / action                                                                                                                                                                                                                              |
| --------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:15 | Overview                | “Small merchants see payment records, but turning them into a useful decision takes work. PayTrack connects each financial insight to verifiable payment evidence.”                                                                             |
| 0:15–0:35 | Login → workspace       | Sign in with a real Sandbox account. “PayPal verifies the identity. This connection does not expose a full account history or balance.”                                                                                                         |
| 0:35–1:10 | Pay → PayPal            | Review a small Sandbox amount and category. Approve with the same buyer account. Return and choose Capture & verify. “A redirect isn't payment evidence: the server checks payer, merchant, amount, currency, and capture.”                     |
| 1:10–1:30 | Transactions → evidence | Open the new record and show the verified reference. “Retries and webhooks reconcile to the same ledger entry.”                                                                                                                                 |
| 1:30–2:05 | Copilot                 | Ask “Where did I spend the most this month?” Show a real Gemini-assisted fact selection and source records. “The model chooses relevant evidence; deterministic code supplies every financial number.”                                          |
| 2:05–2:25 | Budgets                 | With sufficient legitimate history, review a historical baseline and confirm a target. If history is limited, show the honest insufficient-history state and create a user-selected budget; do not fabricate old payments or backdate captures. |
| 2:25–2:40 | Overview / analytics    | “PayTrack is useful without AI and more navigable with it. Verified records, explainable decisions, and the user always in control.”                                                                                                            |

## Preflight

- Confirm the deadline and rules again before submitting.
- Test buyer approval, capture, verified ledger and signed webhook on the final stable origin.
- Make a real Gemini request and inspect allowed evidence IDs.
- Keep Sandbox account credentials private; mask identity information in recording.
- Use browser footage with actual successful interactions, not invented transaction screenshots.
- Upload the finished video to public YouTube and publish the repository only after approval.
