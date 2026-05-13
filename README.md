# DFART Solana Blink — Backend Server

A fully spec-compliant [Solana Actions](https://solana.com/developers/guides/advanced/actions) server that lets wallets and blink clients (Phantom, Backpack, dial.to, Dialect extension) present a native swap UI for buying **$DFART** via Jupiter — with no Jupiter frontend redirect needed.

---

## How it works

```
Wallet / blink client
      │
      ├─ GET  /api/buy-dfart         ← fetch metadata + buttons
      │       ↓ returns title, icon, 4 SOL amount buttons
      │
      ├─ POST /api/buy-dfart?amount=0.5   ← user taps "0.5 SOL"
      │       ↓ server fetches Jupiter quote → builds swap tx
      │       ↓ returns { transaction: "<base64>" }
      │
      └─ Wallet signs & submits the transaction on-chain
```

The server calls Jupiter's **v6 Quote API** and **Swap API** server-side, so the amount is always correctly populated — no URL parameter hacks.

---

## Setup

```bash
npm install
npm run dev      # auto-restarts on file changes (Node 18+)
# or
npm start
```

The server runs on **port 3000** by default. Set `PORT` env var to change it.

---

## Endpoints

### `GET /actions.json`
Domain-level registry. Required at your root domain so wallets recognise your site as Actions-enabled.

### `GET /api/buy-dfart`
Returns blink metadata:
```json
{
  "type": "action",
  "icon": "...",
  "title": "Buy $DFART",
  "description": "...",
  "links": {
    "actions": [
      { "label": "0.1 SOL",  "href": "/api/buy-dfart?amount=0.1"  },
      { "label": "0.25 SOL", "href": "/api/buy-dfart?amount=0.25" },
      { "label": "0.5 SOL",  "href": "/api/buy-dfart?amount=0.5"  },
      { "label": "1 SOL",    "href": "/api/buy-dfart?amount=1"    }
    ]
  }
}
```

### `POST /api/buy-dfart?amount=<SOL>`
Request body (sent by the wallet):
```json
{ "account": "<user-wallet-public-key>" }
```

Response:
```json
{
  "transaction": "<base64-encoded-versioned-transaction>",
  "message": "Swap 0.5 SOL → ~4.2M $DFART via Jupiter"
}
```

---

## Testing locally

### Option 1 — dial.to (easiest)
1. Install [ngrok](https://ngrok.com) and run: `ngrok http 3000`
2. Copy your ngrok URL, e.g. `https://abc123.ngrok-free.app`
3. Visit:
   ```
   https://dial.to/?action=solana-action:https://abc123.ngrok-free.app/api/buy-dfart
   ```
4. Connect your wallet and test all 4 amounts.

### Option 2 — Blinks Inspector
Visit [blinks.xyz/inspector](https://www.blinks.xyz/inspector) and paste your ngrok action URL.

### Option 3 — curl
```bash
# GET metadata
curl http://localhost:3000/api/buy-dfart

# POST a swap (replace with your actual wallet pubkey)
curl -X POST \
  "http://localhost:3000/api/buy-dfart?amount=0.1" \
  -H "Content-Type: application/json" \
  -d '{"account":"<YOUR_WALLET_PUBKEY>"}'
```

---

## Deploying to production

Any Node.js host works. Recommended options:

| Platform | Command |
|----------|---------|
| **Railway** | `railway up` (auto-detects Node, free tier available) |
| **Render** | Connect GitHub repo, set start command `npm start` |
| **Fly.io** | `fly launch && fly deploy` |
| **VPS** | `pm2 start src/index.js --name dfart-blink` |

Once deployed to e.g. `https://dfart-blink.yourdomain.com`:

1. Your blink URL is:
   ```
   solana-action:https://dfart-blink.yourdomain.com/api/buy-dfart
   ```

2. Share on X/Twitter — if your domain is in [Dialect's registry](https://dial.to/register), it will auto-unfurl in the feed.

3. Or use the dial.to interstitial link (works without registry):
   ```
   https://dial.to/?action=solana-action:https://dfart-blink.yourdomain.com/api/buy-dfart
   ```

---

## Token details

| Field | Value |
|-------|-------|
| Token | $DFART |
| Mint  | `2wQtLSrEwhFWc3y7UWGbtc5qoFeEGcikmBbxvEguHNB2` |
| Input | SOL (`So11111111111111111111111111111111111111112`) |
| DEX   | Jupiter v6 (best route auto-selected) |
| Slippage | 1% (100 bps) — edit `slippageBps` in `src/index.js` |

---

## Customisation

- **Icon**: Replace `ICON_URL` in `src/index.js` with your DFART logo (must be a public HTTPS URL)
- **Slippage**: Change `slippageBps` in the quote request (50 = 0.5%, 200 = 2%)
- **Custom amounts**: Add/remove objects in the `links.actions` array in the GET handler
- **Priority fee**: Change `prioritizationFeeLamports` — `"auto"` works well, or set a fixed number like `50000`
