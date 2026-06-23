# LINE dual track setup

## Rich Menu (official account)

| Button | URL |
|--------|-----|
| 找揪團 | `https://www.crewplay.tw/teams` |
| 即時預約 LIFF | `https://liff.line.me/{LIFF_ID}?path=/teams` |
| 我的預約 | `https://www.crewplay.tw/my/bookings` |

## LIFF app

1. LINE Developers Console → create LIFF → Endpoint URL: `https://www.crewplay.tw/liff/bootstrap`
2. Set `NEXT_PUBLIC_LINE_LIFF_ID` in `.env.local`
3. Size: Full

## LINE Login

1. Create LINE Login channel (same provider as OA)
2. Callback URL: `https://www.crewplay.tw/api/auth/line/callback`
3. Set `LINE_CHANNEL_ID` and `LINE_CHANNEL_SECRET`

## Backend alignment

Ask admin to point LINE webhook search to:

- `GET https://www.crewplay.tw/api/teams?sport=羽球`
- Or Supabase REST with same schema

This removes 200-row carousel limits on LINE by opening full web list via LIFF.

## DNS

When ready to replace WordPress:

1. Deploy Next.js to Vercel
2. CNAME `www.crewplay.tw` → Vercel
3. Keep old WP on `legacy.crewplay.tw` if needed
