# SpendWise

A finance management web app for tracking recurring bills and subscriptions. SpendWise finds subscriptions for you from your bank transactions and email receipts, warns you before free trials end or payments fail, and shows where your money goes each month.

Built on the FERN stack: Firebase, Express, React and Node.js.

## Features

- **Subscriptions:** add, edit, pause, cancel and delete subscriptions, one at a time or in bulk. Each one has a payment history, notes, and a direct link to the provider's cancellation page. Export everything to CSV.
- **Automatic detection from your bank:** connect ANZ (Open Banking) and SpendWise spots recurring payments in your transactions.
- **Automatic detection from your email:** connect Gmail (read-only) and SpendWise reads receipt emails to find subscriptions. Email finds wait in a Pending list until you confirm or reject them, so nothing counts until you say so.
- **Dashboard:** spending this month, active and detected subscription counts, bills due this week, your budget, upcoming bills and recent activity. Each subscription shows a bank or email icon telling you where it was found, and you can filter the list to bank-only or email-only.
- **Alerts:** grouped by urgency. Red for payments that may have failed, orange for free trials ending soon, blue for reminders such as bills due in the next few days or nearing your budget. Each alert has its own buttons (Dismiss, Cancel Trial, Confirm, Reject) so you can deal with it without leaving the page.
- **Price change alerts:** warns you when a subscription's price goes up, from your payment history or from price change emails sent by the provider.
- **Insights:** total monthly spend, this month compared with last month, and a breakdown by subscription.
- **Transactions:** synced bank transactions, email receipts and transactions you add by hand.
- **Personalisation:** monthly budget, preferred currency (with live exchange rates), preferred language, dark mode and a profile photo.
- **Accounts:** sign up or log in with email and password or Google, with password reset by email.

## Tech Stack

- **Frontend:** React (Vite), React Router, Motion
- **Backend:** Express (Node.js)
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **Integrations:** ANZ Open Banking (Payments NZ API Centre sandbox), Gmail API, Google Cloud Translation
- **Tests:** Vitest and the Node test runner

## Prerequisites

Before you start, make sure you have:

- Node.js version 18 or higher. Check with `node -v`. If you do not have it, download it from nodejs.org.
- Git, plus access to this repository (GitHub Desktop is fine).
- Access to the team Firebase project, or your own Firebase project for local testing.

## Project Structure

```
SpendWise-COMP602/
├── frontend/            React app (Vite)
│   └── src/
│       ├── api/         Calls to the backend
│       ├── components/  Shared UI pieces
│       ├── constants/
│       ├── context/     Auth, subscriptions, budget, currency, language, theme
│       ├── hooks/
│       ├── layouts/     App shell (sidebar and top bar)
│       ├── pages/
│       └── utils/       Alert rules, calculations, formatting
├── backend/             Express API server
│   ├── scripts/         ANZ and Gmail check scripts
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── repositories/  All Firestore access
│       ├── routes/
│       └── services/      Business logic, bank and email detection
└── docs/                Project documentation
```

## Getting Started

Follow these steps in order after cloning the repository.

### 1. Clone the repository

Use GitHub Desktop, or run:

```bash
git clone https://github.com/Namishr69/SpendWise-COMP602.git
cd SpendWise-COMP602
```

### 2. Set up the frontend

```bash
cd frontend
npm install
```

Create a real `.env` file by copying the example:

```bash
copy .env.example .env
```

On macOS or Linux, use `cp .env.example .env` instead.

Then fill in the Firebase values in `.env`. You get these from the Firebase console under Project Settings.

The example `.env` also sets `VITE_API_BASE_URL`, which controls **which backend the app talks to**:

- **Just reviewing the app?** Leave it pointed at the shared deployment (the default in `.env.example`). You can skip steps 3 and 4 for the backend and go straight to `npm run dev`. No ANZ, Gmail or service account secrets are needed.
- **Developing the backend too?** Change it to `http://localhost:3000` and follow steps 3 and 4 to run your own backend.

### 3. Set up the backend

Open a second terminal so the frontend can keep running.

```bash
cd backend
npm install
```

Create a real `.env` file:

```bash
copy .env.example .env
```

Then add your Firebase Admin service account key:

1. In the Firebase console, go to Project Settings, then Service Accounts.
2. Click Generate New Private Key.
3. Save the downloaded file as `serviceAccountKey.json` inside the `backend/` folder.

This file is a secret. It is already listed in `.gitignore` and must never be committed.

The ANZ, Gmail and translation settings in `.env` are optional. The app runs without them, and only those features stay off. See the sections below to set them up.

### 4. Run the app

Start the backend from the `backend/` folder:

```bash
npm start
```

The API runs on http://localhost:3000. It does not reload on its own, so restart it after changing backend code or `.env`.

Start the frontend from the `frontend/` folder, in a separate terminal:

```bash
npm run dev
```

The app runs on http://localhost:5173

## Connecting Gmail

SpendWise can read a user's Gmail, read-only, to find subscription receipts. The user approves access on Google's own consent screen, and the tokens stay on the backend.

### Setup

1. In Google Cloud Console, open (or create) the project and **enable the Gmail API**.
2. Set up the **OAuth consent screen**. While it is in Testing mode, only the Google accounts you add as **test users** can connect.
3. Create an **OAuth client ID** of type **Web application** and add `http://localhost:5173/gmail/callback` as an **Authorized redirect URI**.
4. Put the client ID and secret in `backend/.env` as `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`. `GMAIL_REDIRECT_URI` must match the redirect URI exactly.
5. Restart the backend.

### Using it

Open Settings, expand **Connected accounts**, click **Connect Gmail**, then **Scan inbox**. The scan looks at recent receipt, invoice, order and billing emails:

- **Every receipt** with an amount is saved as a transaction.
- **Known subscription services** (Netflix, Spotify, Disney+ and others) become a subscription from a single receipt.
- **Senders that mostly sell one-off things** (Uber, Amazon, Apple, Steam and similar) only count when the subject says it is a subscription, for example "Uber One membership" or "iCloud". Rides, food orders and parcels stay as transactions.
- **Any other shop** needs at least two receipts for about the same amount (within 20%) before it is treated as a subscription.

New email finds go to **Pending**. Confirm or reject them on the Alerts page. Rejected finds are remembered, so later scans do not bring them back.

To see why each email did or did not count, watch the backend console during a scan. Each email logs a line such as `parsed "Netflix" NZD 22.99 (subscription=true)`.

## Connecting to ANZ (Open Banking)

SpendWise connects to ANZ through the Payments NZ API Centre sandbox using OAuth. The user logs in at ANZ, so their bank password is never entered into SpendWise and never reaches our servers. Only ANZ-issued tokens are stored, and they stay on the backend.

### Setup

You need three things from the API Centre portal:

1. **A client registration.** Set `ANZ_CLIENT_ID` and `ANZ_KEY_ID` in `backend/.env`.
2. **The PS512 signing key.** Save it as `backend/anz-private-key.pem`. This is a real secret: `*.pem` is gitignored and it must never be committed. If ANZ needs your public key, run `npm run anz:jwks` from `backend/` and register the output.
3. **A registered redirect URI.** It must match `ANZ_REDIRECT_URI` byte for byte. The default is `http://localhost:5173/anz/callback`.

Confirm `ANZ_RESOURCE_BASE_URL` matches the Account Information version in your onboarding pack.

Test your credentials on their own before trying the browser flow. This separates credential problems from redirect problems:

```bash
cd backend && npm run anz:test
```

That requests a client-credentials token and creates a consent, which is everything the flow does before a browser is involved. Failures come back with the likely cause: `invalid_client` means `ANZ_CLIENT_ID` or `ANZ_KEY_ID` do not match the registered key, and a 404 on the consent step means `ANZ_RESOURCE_BASE_URL` is wrong.

If the consent step returns 404, find the right path:

```bash
cd backend && npm run anz:probe
```

The sandbox gateway answers unknown routes with an Express 404 page and real routes with something else, so the probe can tell which paths exist. Pass candidates to check a specific path from your onboarding pack. A bare path is joined to `ANZ_ISSUER`, and a full URL lets you test a different resource host:

```bash
cd backend && npm run anz:probe -- account-information/v3.0 https://some-host/path
```

If ANZ rejects the authorization request itself, set `ANZ_RESPONSE_TYPE="code id_token"`. The callback page already handles both response styles.

### Connecting your bank

With your credentials in place, open Settings, expand **Connected accounts**, and click **Connect ANZ**. You log in at ANZ and are redirected back once consent is granted.

### After connecting: syncing your data

Once connected, SpendWise pulls your accounts, balances and transactions from ANZ and stores them in Firestore. Pages read that stored copy, so they stay fast and keep working after the 90-day consent expires (until the next sync). A sync runs automatically on connect and whenever you press **Refresh** on the Transactions page.

- **Transactions** lists each account with its balance and your recent transactions, and hosts the **Refresh** button.
- The **Dashboard** shows spending this month, upcoming bills and recent activity from the synced data, converted to your preferred currency.
- **Auto-detected subscriptions** appear alongside the ones you add by hand. Each sync scans your transactions for recurring debits (same merchant, near-equal amount, a regular weekly, monthly or annual cadence) and creates a subscription marked `source: anz-detected`. Re-syncing never duplicates them, and your manually added subscriptions are never touched.
- **Failed payments:** if a bank-detected payment is two or more days past its due date and has not shown up, it appears as a red alert.

Disconnecting from Settings revokes the tokens and deletes the synced accounts and transactions, so unlinking leaves nothing behind.

## Environment Variables

Two `.env.example` files list the variables the project needs. Copy each one to a real `.env` file and fill in the values. Never commit real `.env` files or the service account key.

**Frontend** (`frontend/.env`). These use the `VITE_` prefix so Vite exposes them to React. Everything here ends up in the browser bundle, which is expected for the Firebase client config.

| Variable | Purpose |
|---|---|
| `VITE_FIREBASE_*` | Firebase client config from Project Settings |
| `VITE_API_BASE_URL` | Which backend to call: the shared deployment, or `http://localhost:3000` |

**Backend** (`backend/.env`). These have no prefix and stay private on the server.

| Variable | Purpose |
|---|---|
| `PORT` | API port, `3000` by default |
| `SERVICE_ACCOUNT_JSON` | Optional. The whole service account JSON on one line, for hosted deploys. Takes precedence over `serviceAccountKey.json` |
| `GOOGLE_TRANSLATE_API_KEY` | Google Cloud Translation key, for languages other than English |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI` | Gmail inbox scan. See [Connecting Gmail](#connecting-gmail) |
| `ANZ_*` | ANZ Open Banking. See [Connecting to ANZ](#connecting-to-anz-open-banking) |

## Running Tests

Backend, from `backend/`:

```bash
npm test
```

Frontend, from `frontend/`:

```bash
npx vitest run
```

`npm test` in the frontend starts Vitest in watch mode instead, which re-runs tests as you edit.

## Deployment

The backend is deployed to Render using `render.yaml`. On Render, set the secrets as environment variables instead of files: `SERVICE_ACCOUNT_JSON` for the service account, `ANZ_PRIVATE_KEY` for the ANZ signing key, plus the Gmail and translation values. Update the ANZ and Gmail redirect URIs to the deployed frontend's address.

The shared deployment's URL is the default `VITE_API_BASE_URL` in `frontend/.env.example`.

## Important Notes

- The `.gitignore` is already set up to ignore `node_modules/`, all `.env` files, `serviceAccountKey.json`, and any `*.pem` private key. Keep it that way.
- The public Firebase client config (frontend) and the Admin service account key (backend) are not the same thing. The client config is safe to expose. The service account key is a real secret and stays on the backend only.
- All Firestore access goes through the backend repository layer, not directly from React.
- Do not run `npm audit fix` on a fresh install. The deprecation warnings come from dependencies and are safe to leave.
- If a page shows old content or goes blank after code changes, hard refresh the browser (Ctrl+Shift+R). If that does not help, restart the frontend dev server.

## Available Scripts

Frontend (run from `frontend/`):

- `npm run dev` starts the dev server
- `npm run build` builds for production
- `npm run preview` serves the production build locally
- `npm run lint` runs ESLint
- `npm test` runs the tests in watch mode

Backend (run from `backend/`):

- `npm start` starts the API server
- `npm test` runs all backend tests
- `npm run anz:jwks` prints the public JWKS for your ANZ signing key
- `npm run anz:test` checks your ANZ credentials and endpoints without a browser
- `npm run anz:probe` finds the Account Information base path if the consent step returns 404

## License

SpendWise is released under the [MIT License](LICENSE). Copyright (c) 2026 SpendWise team.
