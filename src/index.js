/**
 * DFART Solana Actions / Blink Server
 * ------------------------------------
 * Implements the Solana Actions spec so wallets (Phantom, Backpack, etc.)
 * and blink clients (dial.to, Dialect extension) can render a native
 * buy-DFART UI and submit the pre-built Jupiter swap transaction.
 *
 * Endpoints:
 *   GET  /actions.json           – domain-level action registry
 *   GET  /api/buy-dfart          – blink metadata + buttons
 *   POST /api/buy-dfart?amount=X – build & return the swap transaction
 *   OPTIONS *                    – CORS preflight (required by spec)
 */

const express = require('express');

const app = express();
app.use(express.json());

// ─── Constants ──────────────────────────────────────────────────────────────

const SOL_MINT   = 'So11111111111111111111111111111111111111112';
const DFART_MINT = '2wQtLSrEwhFWc3y7UWGbtc5qoFeEGcikmBbxvEguHNB2';
const LAMPORTS_PER_SOL = 1_000_000_000;

// Your hosted icon — replace with a real DFART logo URL once deployed
const ICON_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Ethereum-icon-purple.svg/480px-Ethereum-icon-purple.svg.png';

// ─── CORS headers (required by Solana Actions spec) ─────────────────────────

const ACTIONS_CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
  'Content-Type': 'application/json',
};

function setCorsHeaders(res) {
  Object.entries(ACTIONS_CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
}

// Handle CORS preflight for every route
app.options('*', (req, res) => {
  setCorsHeaders(res);
  res.sendStatus(200);
});

// ─── /actions.json ───────────────────────────────────────────────────────────
// Maps your domain's URLs to Action API endpoints.
// Place this at the root so wallets know your domain supports Actions.

app.get('/actions.json', (req, res) => {
  setCorsHeaders(res);
  res.json({
    rules: [
      {
        pathPattern: '/*',
        apiPath: '/api/buy-dfart',
      },
    ],
  });
});

// ─── GET /api/buy-dfart ──────────────────────────────────────────────────────
// Returns blink metadata: title, icon, description, and the 4 amount buttons.

app.get('/api/buy-dfart', (req, res) => {
  setCorsHeaders(res);

  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.json({
    type: 'action',
    icon: ICON_URL,
    title: 'Buy $DFART',
    description:
      'Swap SOL for $DFART instantly via Jupiter. Select how much SOL you want to spend — the transaction will be built and ready to sign in your wallet.',
    label: 'Buy $DFART',

    // Four preset buttons — each posts back with ?amount=X
    links: {
      actions: [
        {
          label: '0.1 SOL',
          href: `${baseUrl}/api/buy-dfart?amount=0.1`,
        },
        {
          label: '0.25 SOL',
          href: `${baseUrl}/api/buy-dfart?amount=0.25`,
        },
        {
          label: '0.5 SOL',
          href: `${baseUrl}/api/buy-dfart?amount=0.5`,
        },
        {
          label: '1 SOL',
          href: `${baseUrl}/api/buy-dfart?amount=1`,
        },
      ],
    },
  });
});

// ─── POST /api/buy-dfart ─────────────────────────────────────────────────────
// 1. Reads ?amount and the user's public key from the request body
// 2. Fetches a quote from Jupiter v6
// 3. Gets a serialized swap transaction from Jupiter
// 4. Returns it base64-encoded for the wallet to sign & send

app.post('/api/buy-dfart', async (req, res) => {
  setCorsHeaders(res);

  try {
    // ── 1. Parse inputs ──────────────────────────────────────────────────────
    const amountSol = parseFloat(req.query.amount);
    if (!amountSol || amountSol <= 0) {
      return res.status(400).json({ message: 'Missing or invalid ?amount param (e.g. ?amount=0.1)' });
    }

    const { account } = req.body; // wallet public key sent by the blink client
    if (!account) {
      return res.status(400).json({ message: 'Missing account in request body' });
    }

    const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);
    console.log(`[POST] account=${account}  amount=${amountSol} SOL  (${lamports} lamports)`);

    // ── 2. Get a quote from Jupiter ──────────────────────────────────────────
    const quoteUrl =
      `https://quote-api.jup.ag/v6/quote` +
      `?inputMint=${SOL_MINT}` +
      `&outputMint=${DFART_MINT}` +
      `&amount=${lamports}` +
      `&slippageBps=100`;           // 1% slippage — adjust as needed

    const quoteRes = await fetch(quoteUrl);
    const quote    = await quoteRes.json();

    if (quote.error || !quote.outAmount) {
      console.error('[Jupiter quote error]', quote);
      return res.status(502).json({
        message: `Jupiter quote failed: ${quote.error ?? 'no route found'}`,
      });
    }

    console.log(`[Quote] outAmount=${quote.outAmount} DFART  impact=${quote.priceImpactPct}%`);

    // ── 3. Build the swap transaction via Jupiter ────────────────────────────
    const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse:          quote,
        userPublicKey:          account,
        wrapAndUnwrapSol:       true,   // auto wrap native SOL → WSOL
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    });

    const swapData = await swapRes.json();

    if (swapData.error || !swapData.swapTransaction) {
      console.error('[Jupiter swap error]', swapData);
      return res.status(502).json({
        message: `Jupiter swap build failed: ${swapData.error ?? 'unknown error'}`,
      });
    }

    // swapTransaction is already base64-encoded by Jupiter
    const { swapTransaction } = swapData;

    // ── 4. Return the Solana Actions POST response ───────────────────────────
    // Spec: { transaction: <base64>, message: <string> }
    const outDfart = (Number(quote.outAmount) / 1e6).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });

    return res.json({
      transaction: swapTransaction,
      message:     `Swap ${amountSol} SOL → ~${outDfart}M $DFART via Jupiter`,
    });

  } catch (err) {
    console.error('[Unhandled error]', err);
    return res.status(500).json({ message: `Server error: ${err.message}` });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🟢 DFART Blink server running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  http://localhost:${PORT}/actions.json`);
  console.log(`  GET  http://localhost:${PORT}/api/buy-dfart`);
  console.log(`  POST http://localhost:${PORT}/api/buy-dfart?amount=0.1`);
  console.log(`\nTest with dial.to:`);
  console.log(`  https://dial.to/?action=solana-action:http://localhost:${PORT}/api/buy-dfart`);
  console.log(`  (use ngrok to expose locally: ngrok http ${PORT})\n`);
});
