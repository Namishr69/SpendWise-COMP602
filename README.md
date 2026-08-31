# SpendWise
 
A finance management web application for tracking recurring bills and subscriptions, detecting unused subscriptions, alerting users before free trials end, and showing monthly spending summaries.
 
Built on the FERN stack: Firebase, Express, React, Node.js.
 
## Tech Stack
 
- Frontend: React (Vite)
- Backend: Express (Node.js)
- Database: Firebase Firestore
- Auth: Firebase Authentication
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
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── hooks/
│       ├── context/
│       └── api/
├── backend/             Express API server
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── models/
│       ├── middleware/
│       └── config/
└── docs/                Project documentation
```
 
## Getting Started
 
Follow these steps in order after cloning the repository.
 
### 1. Clone the repository
 
Use GitHub Desktop, or run:
 
```bash
git clone <repository-url>
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
 
### 4. Run the app
 
Start the backend from the `backend/` folder:
 
```bash
npm start
```
 
The API runs on http://localhost:3000
 
Start the frontend from the `frontend/` folder, in a separate terminal:
 
```bash
npm run dev
```
 
The app runs on http://localhost:5173
 
## Connecting to ANZ (Open Banking)

SpendWise connects to ANZ through the Payments NZ API Centre sandbox using OAuth. The user logs in at ANZ, so their bank password is never entered into SpendWise and never reaches our servers. Only ANZ-issued tokens are stored, and they stay on the backend.

### Running without ANZ credentials

`ANZ_MOCK=true` (the default in `backend/.env.example`) runs the whole flow on sample data. The consent, state, PKCE and callback handling are all real — only the three network calls to ANZ are skipped. Use this to develop and demo without credentials.

Open Settings, expand **Connected accounts**, and click **Connect ANZ**.

### Running against the live sandbox

You need three things from the API Centre portal:

1. **A client registration** — set `ANZ_CLIENT_ID` and `ANZ_KEY_ID` in `backend/.env`.
2. **The PS512 signing key** — save it as `backend/anz-private-key.pem`. This is a real secret; `*.pem` is gitignored and it must never be committed. If ANZ needs your public key, run `npm run anz:jwks` from `backend/` and register the output.
3. **A registered redirect URI** — must match `ANZ_REDIRECT_URI` byte-for-byte. The default is `http://localhost:5173/anz/callback`.

Then set `ANZ_MOCK=false` and confirm `ANZ_RESOURCE_BASE_URL` matches the Account Information version in your onboarding pack.

Test your credentials on their own before trying the browser flow — it isolates credential problems from redirect problems:

```bash
cd backend && npm run anz:test
```

That requests a client-credentials token and creates a consent, which is everything the flow does before a browser is involved. It forces live mode, so it still tests ANZ even while `ANZ_MOCK=true`. Failures come back with the likely cause: `invalid_client` means `ANZ_CLIENT_ID`/`ANZ_KEY_ID` do not match the registered key, and a 404 on the consent step means `ANZ_RESOURCE_BASE_URL` is wrong.

If the consent step 404s, find the right path:

```bash
cd backend && npm run anz:probe
```

The sandbox gateway answers unknown routes with an Express 404 page and real routes with something else, so the probe can tell which paths exist. Pass candidates to check a specific path from your onboarding pack — a bare path is joined to `ANZ_ISSUER`, and a full URL lets you test a different resource host:

```bash
cd backend && npm run anz:probe -- account-information/v3.0 https://some-host/path
```

If ANZ rejects the authorization request itself, set `ANZ_RESPONSE_TYPE="code id_token"` — the callback page already handles both response styles.

## Environment Variables
 
Two `.env.example` files list the variables the project needs. Copy each one to a real `.env` file and fill in the values. Never commit real `.env` files or the service account key.
 
Frontend variables use the `VITE_` prefix so Vite exposes them to React. Everything in the frontend config is public and ends up in the browser bundle, which is expected for the Firebase client config.
 
Backend variables have no prefix and stay private on the server.
 
## Important Notes
 
- The `.gitignore` is already set up to ignore `node_modules/`, all `.env` files, `serviceAccountKey.json`, and any `*.pem` private key. Keep it that way.
- The public Firebase client config (frontend) and the Admin service account key (backend) are not the same thing. The client config is safe to expose. The service account key is a real secret and stays on the backend only.
- All Firestore access goes through the backend repository layer, not directly from React.
- Do not run `npm audit fix` on a fresh install. The deprecation warnings come from dependencies and are safe to leave.
## Available Scripts
 
Frontend (run from `frontend/`):
 
- `npm run dev` starts the dev server
- `npm run build` builds for production
- `npm run lint` runs ESLint
Backend (run from `backend/`):
 
- `npm start` starts the API server
- `npm run anz:jwks` prints the public JWKS for your ANZ signing key
- `npm run anz:test` checks your ANZ credentials and endpoints without a browser
- `npm run anz:probe` finds the Account Information base path if the consent step 404s