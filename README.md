# Storefront Presence AI

An AI-native local business growth agency. Autonomous agents find local
businesses with weak Google Business listings, generate a personalized audit,
draft outreach, and run a paid subscription onboarding flow — with no human
salesperson in the loop.

Built for the **Build with Gemini XPRIZE** hackathon, Small Business Services
category.

## What it does

1. **Prospect** — searches a target niche + city via the Google Maps Platform
   (Places) API and pulls real listing data: rating, review count, website,
   hours.
2. **Score** — computes a 0–100 "gap score" per business based on concrete,
   verifiable issues (low review count, missing website, thin rating), not
   speculative claims.
3. **Audit** — Gemini generates a personalized one-page audit report per
   qualifying business, itemizing only the specific gaps found.
4. **Outreach** — Gemini drafts a short, specific cold email referencing the
   audit; sent via the business owner's real inbox using nodemailer.
5. **Onboard** — interested businesses check out through a real Stripe
   subscription flow.
6. **Log** — every agent action (prospect found, score computed, audit
   generated, email sent, checkout completed) is written to a local SQLite
   `agent_events` table as a timestamped, exportable execution log.

## Stack

- **Frontend**: React + TypeScript
- **Backend**: Node.js + Express (`server.ts`)
- **Database**: SQLite (`server/db.ts`) — `prospects` and `agent_events` tables
- **Pipeline logic**: `server/pipeline.ts`
- **APIs**: `@googlemaps/google-maps-services-js` (prospecting),
  `@google/genai` (Gemini — audit + outreach drafting), `nodemailer` (sending),
  `stripe` (subscription checkout)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables. In AI Studio, use the **Secrets panel** (top
   menu) rather than a committed `.env` file — secrets entered there are
   injected securely and never exposed in code. If running elsewhere, copy
   `.env.example` to `.env` and fill in real values:

   | Variable | Where to get it |
   |---|---|
   | `GOOGLE_MAPS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/) — enable "Places API (New)" |
   | `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
   | `SENDER_EMAIL` | The Gmail address outreach sends from |
   | `SENDER_APP_PASSWORD` | [Google App Passwords](https://myaccount.google.com/apppasswords) — not your normal password |
   | `STRIPE_SECRET_KEY` | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) — use the test key (`sk_test_...`) until ready to charge real cards |

3. Run locally:
   ```bash
   npm run dev
   ```

## Dry run mode

Check **"Dry Run Mode (No real API calls)"** in the dashboard to run the full
pipeline against mock data — no Google Maps or Gemini quota spent, no real
emails sent. Use this to sanity-check any pipeline changes before pointing it
at real businesses.

## Running a real campaign

1. Uncheck dry-run mode once you've confirmed the logic looks right.
2. Enter a real niche + city in the dashboard and run prospecting.
3. **Review every drafted audit and email before sending** — the UI shows
   both prior to send; check that every claim in the audit and email is
   something the data actually supports (avoid speculative language about
   *why* a rating is what it is).
4. Send to a small first batch (10–15 businesses) rather than everything at
   once.
5. Track replies and conversions via the dashboard's log view.

## Project structure

```
├── server/
│   ├── db.ts           # SQLite schema + prospect/event logging
│   └── pipeline.ts      # prospecting, scoring, audit + outreach drafting, Stripe
├── server.ts             # Express API (/api/prospects, /api/checkout, etc.)
├── src/
│   ├── App.tsx           # dashboard UI
│   └── index.css
├── .env.example
└── package.json
```
