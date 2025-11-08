import { Router, Request, Response } from 'express';

const { SquareClient, SquareEnvironment }: any = require('square');

const router = Router();

const squareEnvironment =
  (process.env.SQUARE_ENV || 'sandbox') === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;

const sq = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN || process.env.SQUARE_TOKEN || '',
  environment: squareEnvironment
});

// Charge a card using Square nonce (no registration linkage here; use returned paymentId)
router.post('/charge', async (req: Request, res: Response) => {
  try {
    const { amountCents, currency = 'USD', nonce } = req.body || {};
    if (!amountCents || !nonce) return res.status(400).json({ success: false, error: 'Missing fields' });

    const idempotencyKey = `${Date.now()}-${Math.random()}`;
    const resp = await sq.payments.create({
      sourceId: nonce,
      idempotencyKey,
      amountMoney: { amount: BigInt(Number(amountCents)), currency },
      locationId: process.env.SQUARE_LOCATION_ID || undefined
    });

    const payment = resp?.data?.payment;
    if (!payment) return res.status(500).json({ success: false, error: 'No payment response' });

    return res.json({ success: true, paymentId: payment.id, status: payment.status });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Payment error' });
  }
});

export default router;

