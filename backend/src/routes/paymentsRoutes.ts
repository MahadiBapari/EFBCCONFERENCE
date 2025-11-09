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
    const {
      amountCents,
      baseAmountCents,
      applyCardFee,
      currency = 'USD',
      nonce,
      billingAddress,
      buyerEmail
    } = req.body || {};
    const baseCents = Number(baseAmountCents ?? amountCents);
    if (!baseCents || !nonce) return res.status(400).json({ success: false, error: 'Missing fields' });
    const finalCents = applyCardFee ? Math.round(baseCents * 1.035) : Number(amountCents ?? baseCents);

    const idempotencyKey = `${Date.now()}-${Math.random()}`;
    const respRaw = await sq.payments.create({
      sourceId: nonce,
      idempotencyKey,
      amountMoney: { amount: BigInt(Number(finalCents)), currency },
      locationId: process.env.SQUARE_LOCATION_ID || undefined,
      // Provide billing address to satisfy AVS
      billingAddress: billingAddress
        ? {
            addressLine1: billingAddress.addressLine1 || undefined,
            addressLine2: billingAddress.addressLine2 || undefined,
            locality: billingAddress.locality || undefined,
            administrativeDistrictLevel1: billingAddress.administrativeDistrictLevel1 || undefined,
            postalCode: billingAddress.postalCode || undefined,
            country: (billingAddress.country || 'US') as any,
            firstName: billingAddress.firstName || undefined,
            lastName: billingAddress.lastName || undefined
          }
        : undefined,
      buyerEmailAddress: buyerEmail || undefined,
    }).withRawResponse();

    const resultData: any = respRaw?.data;
    const payment = resultData?.payment;
    if (!payment) {
      // Include minimal diagnostics to help debug response shape differences
      return res.status(502).json({
        success: false,
        error: 'No payment response',
        hint: resultData?.errors || 'no-errors'
      });
    }

    const amt = (payment as any)?.amountMoney?.amount;
    const chargedAmountCents =
      typeof amt === 'bigint'
        ? Number(amt.toString())
        : typeof amt === 'string'
          ? Number(amt)
          : typeof amt === 'number'
            ? amt
            : finalCents;

    return res.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
      chargedAmountCents
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || 'Payment error' });
  }
});

export default router;

