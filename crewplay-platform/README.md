# CrewPlay Platform

Modern web app for browsing Google Sheet teams, booking, and ECPay checkout.

## Quick start

1. Install Node.js 20+
2. Publish sheet data:
   ```
   crewplay-fb-collector\發布到網站.bat
   ```
3. Install and run:
   ```
   cd crewplay-platform
   npm install
   npm run dev
   ```
4. Open http://localhost:3000

## Environment

Copy `.env.example` to `.env.local` and fill:

- `NEXT_PUBLIC_SUPABASE_URL` / keys (optional; falls back to `public/data/teams.json`)
- `ECPAY_*` for payment (test defaults work with ECPay stage)
- `LINE_CHANNEL_ID` / `NEXT_PUBLIC_LINE_LIFF_ID` for LINE dual track

## Supabase

Run `supabase/schema.sql` in Supabase SQL editor.

Copy `crewplay-fb-collector/config.platform.example.json` to `config.platform.json` with service role key, then run publish script.

# Deploy to www.crewplay.tw (Netlify)

Point DNS `www.crewplay.tw` to Netlify. Set env from `.env.production.example`.

```
crewplay-platform\正式上架.bat
```

Or from repo root:

```
powershell -File crewplay-platform\scripts\prepare-production.ps1
```

## Netlify setup

1. Connect this Git repository
2. Build uses root `netlify.toml` (base = `crewplay-platform`)
3. Add domains: `crewplay.tw` and `www.crewplay.tw`
4. Paste environment variables from `.env.production.example`
5. Required: `NEXT_PUBLIC_SITE_URL=https://www.crewplay.tw`

Legacy static configurator at repo root is no longer the Netlify publish target.

## LINE dual track

See `docs/LINE-DUAL-SETUP.md`.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home |
| `/teams` | Search & filter all teams |
| `/teams/[id]` | Team detail |
| `/book/[teamId]` | Booking + ECPay |
| `/my/bookings` | User bookings |
| `/admin` | Stats dashboard |
| `/liff` | LINE LIFF entry |
