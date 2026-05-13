const express = require('express');
const app = express();
app.use(express.json());

const SOL_MINT   = 'So11111111111111111111111111111111111111112';
const DFART_MINT = '2wQtLSrEwhFWc3y7UWGbtc5qoFeEGcikmBbxvEguHNB2';
const LAMPORTS_PER_SOL = 1_000_000_000;
const ICON_URL = 'https://solana.com/src/img/branding/solanaLogoMark.svg';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
  'Content-Type': 'application/json',
};

function cors(res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
}

app.options('*', (req, res) => { cors(res); res.sendStatus(200); });

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<html><head>
  <link rel="solana:action" href="/api/buy-dfart" />
  <meta name="dscvr:actions:version" content="vspec:actions:v1" />
  </head><body>
  <h1>Buy $DFART</h1>
  <a href="https://jup.ag/swap/SOL-2wQtLSrEwhFWc3y7UWGbtc5qoFeEGcikmBbxvEguHNB2">Buy on Jupiter</a>
  </body></html>`);
});
const path = require('path');

app.get('/preview.png', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'preview.png'));
});

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Buy $DONKEYFART</title>
  <meta property="og:title" content="Buy $DONKEYFART on Solana" />
  <meta property="og:description" content="Swap SOL for $DONKEYFART instantly via Jupiter. Choose 0.1, 0.25, 0.5 or 1 SOL." />
  <meta property="og:image" content="https://donkeyfartblink.up.railway.app/preview.png" />
  <meta property="og:url" content="https://donkeyfartblink.up.railway.app" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Buy $DONKEYFART on Solana" />
  <meta name="twitter:description" content="Swap SOL for $DONKEYFART instantly via Jupiter. Choose 0.1, 0.25, 0.5 or 1 SOL." />
  <meta name="twitter:image" content="https://donkeyfartblink.up.railway.app/preview.png" />
  <style>
    body{background:#0a0a0a;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .card{max-width:400px;width:90%;background:#111;border:1px solid #222;border-radius:16px;padding:32px;text-align:center}
    h1{background:linear-gradient(90deg,#00ffa3,#9945ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:2.5rem;margin:0 0 8px}
    p{color:#888;font-size:13px;line-height:1.6;margin:0 0 24px}
    .btn{display:block;width:100%;padding:14px;margin:10px 0;background:linear-gradient(135deg,#00ffa3,#9945ff);border:none;border-radius:10px;color:#000;font-weight:700;font-size:14px;text-decoration:none;box-sizing:border-box}
    .ca{font-size:10px;color:#444;word-break:break-all;margin-top:20px}
  </style>
</head>
<body>
  <div class="card">
    <h1>$DONKEYFART</h1>
    <p>Swap SOL for $DONKEYFART via Jupiter.<br>Choose your amount:</p>
    <a class="btn" href="https://jup.ag/swap/SOL-2wQtLSrEwhFWc3y7UWGbtc5qoFeEGcikmBbxvEguHNB2?inAmount=100000000">0.1 SOL</a>
    <a class="btn" href="https://jup.ag/swap/SOL-2wQtLSrEwhFWc3y7UWGbtc5qoFeEGcikmBbxvEguHNB2?inAmount=250000000">0.25 SOL</a>
    <a class="btn" href="https://jup.ag/swap/SOL-2wQtLSrEwhFWc3y7UWGbtc5qoFeEGcikmBbxvEguHNB2?inAmount=500000000">0.5 SOL</a>
    <a class="btn" href="https://jup.ag/swap/SOL-2wQtLSrEwhFWc3y7UWGbtc5qoFeEGcikmBbxvEguHNB2?inAmount=1000000000">1 SOL</a>
    <div class="ca">CA: 2wQtLSrEwhFWc3y7UWGbtc5qoFeEGcikmBbxvEguHNB2</div>
  </div>
</body>
</html>`);
});

app.get('/actions.json', (req, res) => {
  cors(res);
  res.json({ rules: [{ pathPattern: '/*', apiPath: '/api/buy-dfart' }] });
});

app.get('/api/buy-dfart', (req, res) => {
  cors(res);
  const proto = req.get('x-forwarded-proto') || req.protocol;
const base = `${proto}://${req.get('host')}`;

  res.json({
    type: 'action',
    icon: ICON_URL,
    title: 'Buy $DFART',
    description: 'Swap SOL for $DFART via Jupiter. Pick your amount â the transaction will be ready to sign in your wallet.',
    label: 'Buy $DFART',
    links: {
      actions: [
        { label: '0.1 SOL',  href: `${base}/api/buy-dfart?amount=0.1`  },
        { label: '0.25 SOL', href: `${base}/api/buy-dfart?amount=0.25` },
        { label: '0.5 SOL',  href: `${base}/api/buy-dfart?amount=0.5`  },
        { label: '1 SOL',    href: `${base}/api/buy-dfart?amount=1`    },
      ],
    },
  });
});

app.post('/api/buy-dfart', async (req, res) => {
  cors(res);
  try {
    const amountSol = parseFloat(req.query.amount);
    if (!amountSol || amountSol <= 0) {
      return res.status(400).json({ message: 'Invalid ?amount param' });
    }
    const { account } = req.body;
    if (!account) {
      return res.status(400).json({ message: 'Missing account in request body' });
    }

    const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);
    console.log(`Swap request: ${account} | ${amountSol} SOL | ${lamports} lamports`);

    // 1. Get quote from Jupiter
    const quoteRes = await fetch(
      `https://quote-api.jup.ag/v6/quote?inputMint=${SOL_MINT}&outputMint=${DFART_MINT}&amount=${lamports}&slippageBps=100`
    );
    const quote = await quoteRes.json();
    if (!quote.outAmount) {
      console.error('Quote error:', quote);
      return res.status(502).json({ message: `Jupiter quote failed: ${quote.error || 'no route'}` });
    }

    // 2. Build swap transaction
    const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: account,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    });
    const swapData = await swapRes.json();
    if (!swapData.swapTransaction) {
      console.error('Swap error:', swapData);
      return res.status(502).json({ message: `Jupiter swap failed: ${swapData.error || 'unknown'}` });
    }

    const outFormatted = (Number(quote.outAmount) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 });
    return res.json({
      transaction: swapData.swapTransaction,
      message: `Swapping ${amountSol} SOL â ~${outFormatted}M $DFART`,
    });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`DFART Blink server running on port ${PORT}`);
});
