import { Router, Request, Response } from 'express';

const { SquareClient, SquareEnvironment }: any = require('square');

const router = Router();

/**
 * Normalize phone number to E.164 format required by Square API
 * E.164 format: +[country code][number] (e.g., +1234567890)
 * @param phone - Phone number in any format
 * @param defaultCountryCode - Default country code if not present (default: '1' for US)
 * @returns E.164 formatted phone number or undefined if invalid
 */
function normalizePhoneToE164(phone: string | undefined, defaultCountryCode: string = '1'): string | undefined {
  if (!phone) return undefined;
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it already starts with +, check if it's valid
  if (cleaned.startsWith('+')) {
    // Must have at least country code + number (minimum 8 digits after +)
    if (cleaned.length >= 9) {
      return cleaned;
    }
    // Invalid format, try to fix
    cleaned = cleaned.substring(1); // Remove the +
  }
  
  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '');
  
  // If empty after cleaning, return undefined
  if (!cleaned || cleaned.length < 10) {
    return undefined;
  }
  
  // If it's 10 digits, assume US number and add country code
  if (cleaned.length === 10) {
    return `+${defaultCountryCode}${cleaned}`;
  }
  
  // If it's 11 digits and starts with 1, it's likely a US number
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // If it's longer, assume it already has country code
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  
  // Default: add country code
  return `+${defaultCountryCode}${cleaned}`;
}

const squareEnvironment =
  (process.env.SQUARE_ENV || 'sandbox') === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;

const sq = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN || process.env.SQUARE_TOKEN || '',
  environment: squareEnvironment
});

/**
 * Square Payment API Required Fields:
 * 
 * REQUIRED:
 * - sourceId: Card nonce from Square Web Payments SDK (string)
 * - amountMoney: Payment amount in smallest currency unit (object: { amount: bigint, currency: string })
 * - idempotencyKey: Unique key to prevent duplicate charges (string)
 * 
 * RECOMMENDED (for AVS and fraud prevention):
 * - billingAddress: Billing address object with:
 *   - addressLine1: Street address (string, required for AVS)
 *   - locality: City (string)
 *   - administrativeDistrictLevel1: State/Province (string)
 *   - postalCode: ZIP/Postal code (string, required for AVS)
 *   - country: ISO 3166 country code (string, default: 'US')
 *   - firstName: First name (string)
 *   - lastName: Last name (string)
 * - buyerEmailAddress: Buyer email (string, optional but recommended)
 * - buyerPhoneNumber: Phone in E.164 format, e.g., +1234567890 (string, optional but recommended)
 * 
 * OPTIONAL:
 * - locationId: Square location ID (string, from env)
 * - note: Payment note/description (string)
 */
router.post('/charge', async (req: Request, res: Response) => {
  try {
    const {
      amountCents,
      baseAmountCents,
      applyCardFee,
      currency = 'USD',
      nonce,
      billingAddress,
      buyerEmail,
      buyerPhone
    } = req.body || {};
    
    // Validate required fields
    const baseCents = Number(baseAmountCents ?? amountCents);
    if (!baseCents || baseCents <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid payment amount' });
    }
    if (!nonce || typeof nonce !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid payment source (nonce)' });
    }
    
    // Validate billing address (recommended for AVS)
    if (!billingAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'Billing address is required for payment processing' 
      });
    }
    
    if (!billingAddress.addressLine1 || !billingAddress.postalCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Billing address must include street address and postal code' 
      });
    }
    
    if (!billingAddress.firstName || !billingAddress.lastName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Billing address must include first and last name' 
      });
    }
    
    const finalCents = applyCardFee ? Math.round(baseCents * 1.035) : Number(amountCents ?? baseCents);

    const idempotencyKey = `${Date.now()}-${Math.random()}`;
    const eventName = req.body.eventName || 'EFBC';
    
    // Normalize phone number to E.164 format (required by Square if provided)
    const normalizedPhone = normalizePhoneToE164(buyerPhone, '1');
    
    // Validate email format if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmail = buyerEmail && emailRegex.test(buyerEmail) ? buyerEmail : undefined;
    
    const respRaw = await sq.payments.create({
      sourceId: nonce,
      idempotencyKey,
      amountMoney: { amount: BigInt(Number(finalCents)), currency },
      locationId: process.env.SQUARE_LOCATION_ID || undefined,
      note: eventName,
      // Billing address is required for AVS (Address Verification System)
      billingAddress: {
        addressLine1: billingAddress.addressLine1.trim(),
        addressLine2: billingAddress.addressLine2?.trim() || undefined,
        locality: billingAddress.locality?.trim() || undefined,
        administrativeDistrictLevel1: billingAddress.administrativeDistrictLevel1?.trim() || undefined,
        postalCode: billingAddress.postalCode.trim(),
        country: (billingAddress.country || 'US').toUpperCase().substring(0, 2) as any,
        firstName: billingAddress.firstName.trim(),
        lastName: billingAddress.lastName.trim()
      },
      buyerEmailAddress: validEmail || undefined,
      buyerPhoneNumber: normalizedPhone || undefined, // Only include if valid E.164 format
    }).withRawResponse();

    const resultData: any = respRaw?.data;
    const payment = resultData?.payment;
    
    // Check for Square API errors first
    if (resultData?.errors && Array.isArray(resultData.errors) && resultData.errors.length > 0) {
      const errorMessages = resultData.errors.map((e: any) => e.detail || e.code || 'Unknown error').join(', ');
      return res.status(400).json({
        success: false,
        error: `Payment failed: ${errorMessages}`,
        details: resultData.errors
      });
    }
    
    if (!payment) {
      // Include minimal diagnostics to help debug response shape differences
      return res.status(502).json({
        success: false,
        error: 'No payment response from Square',
        hint: resultData?.errors || 'no-errors',
        rawResponse: resultData
      });
    }
    
    // Check if payment was declined or not completed
    if (payment.status === 'FAILED' || payment.status === 'CANCELED') {
      return res.status(400).json({
        success: false,
        error: `Payment ${payment.status.toLowerCase()}. Please check your card details and try again.`,
        paymentStatus: payment.status
      });
    }
    
    // Only accept COMPLETED payments
    if (payment.status !== 'COMPLETED' && payment.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: `Payment status is ${payment.status}. Payment must be completed before registration can be saved.`,
        paymentStatus: payment.status
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

