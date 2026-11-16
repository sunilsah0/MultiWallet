# Deploying MultiWallet (test-money demo)

Order matters: database, then API, then website, then back to the API (CORS), then phone app.

1. **New Neon project** `multiwallet-prod` (EU region). Copy its connection string and change
   `sslmode=require` to `sslmode=verify-full`.
2. **Build the tables:** `cd api && DATABASE_URL="<prod string>" npm run migrate`
3. **Render web service** from the GitHub repo: root directory `api`, build `npm install`,
   start `npm start`, health check `/health`. Environment variables:
   `DATABASE_URL`, `JWT_SECRET` (new, `openssl rand -hex 48`), `NODE_ENV=production`,
   `NODE_VERSION=22`, `ALLOW_TEST_TOPUP=true` (fake money only), `CORS_ORIGINS` (step 5).
4. **Vercel project** from the same repo: root directory `web`, env var
   `NEXT_PUBLIC_API_URL=https://<your render address>` (set BEFORE the first deploy).
5. Put the Vercel address into Render's `CORS_ORIGINS` (no trailing slash) and let Render redeploy.
6. **Phone app:** `cd mobile && node scripts/prepare-release.mjs <app id> <render address>`,
   then `npx eas-cli build --platform android --profile preview`.

## Go-live smoke test
- [ ] `https://<render>/health` shows `{"ok":true}` (first call may take about a minute: free tier wakes up)
- [ ] Register, set a PIN, add test money, pay a business on the website
- [ ] Same account works in the phone app
- [ ] `curl -s -i -H "Origin: https://evil.example" https://<render>/health | grep -i access-control` prints nothing
- [ ] Neon dashboard shows the production project, and local `.env` still points to the DEV project

## Never
- Never run `npm test` with the production `DATABASE_URL`
- Never commit `.env` files or paste connection strings into chat or issues
- Never turn on real money without the items in docs/REAL-MONEY-CHECKLIST.md
