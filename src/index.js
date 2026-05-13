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
