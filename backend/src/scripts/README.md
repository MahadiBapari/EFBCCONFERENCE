# Scripts

## Test SMTP Configuration

This script verifies that your SMTP configuration is correct and can send emails.

### How to run

From the `backend` directory:

**Just verify SMTP connection:**
```bash
npm run test-smtp
```

**Verify connection and send a test email:**
```bash
npm run test-smtp your-email@example.com
```

Or directly with ts-node:
```bash
npx ts-node src/scripts/testSMTP.ts [test-email@example.com]
```

### What it checks

1. **Environment Variables**: Verifies that all required SMTP environment variables are set:
   - `SMTP_HOST` - SMTP server hostname
   - `SMTP_PORT` - SMTP server port (defaults to 587)
   - `SMTP_USER` - SMTP username
   - `SMTP_PASS` - SMTP password
   - `SMTP_SECURE` - Whether to use secure connection (optional, defaults based on port)
   - `EMAIL_FROM` - Email address to send from (optional, defaults to 'no-reply@efbc.local')

2. **Connection Test**: Attempts to verify the SMTP connection using `transporter.verify()`

3. **Test Email** (if email provided): Sends a test email to verify the full email sending flow

### Required Environment Variables

Make sure your `.env` file (or environment) contains:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
EMAIL_FROM=noreply@yourdomain.com
```

### Example Output

**Successful connection:**
```
=== SMTP Configuration Test ===

Configuration:
  SMTP_HOST: smtp.example.com
  SMTP_PORT: 587
  SMTP_USER: user@example.com
  SMTP_PASS: ***word
  SMTP_SECURE: false
  EMAIL_FROM: noreply@yourdomain.com

Creating SMTP transporter...
Testing SMTP connection...
✅ SMTP connection verified successfully!

ℹ️  No test email address provided.
   To send a test email, run:
   npx ts-node src/scripts/testSMTP.ts your-email@example.com

=== Test Complete ===
```

**Failed connection:**
```
=== SMTP Configuration Test ===

Configuration:
  SMTP_HOST: smtp.example.com
  SMTP_PORT: 587
  SMTP_USER: user@example.com
  SMTP_PASS: ***word
  SMTP_SECURE: false
  EMAIL_FROM: noreply@yourdomain.com

Creating SMTP transporter...
Testing SMTP connection...
❌ SMTP connection failed!
Error: Invalid login: 535 Authentication failed
Error code: EAUTH
Failed command: AUTH PLAIN
```

### Troubleshooting

- **"SMTP configuration incomplete"**: Make sure all required environment variables are set
- **"EAUTH" error**: Check that your SMTP_USER and SMTP_PASS are correct
- **Connection timeout**: Verify SMTP_HOST and SMTP_PORT are correct, and that your firewall allows outbound connections
- **TLS errors**: Try setting `SMTP_SECURE=true` for port 465, or `SMTP_SECURE=false` for port 587

---

## Fix Registration Prices

This script recalculates and updates the `total_price` for all existing registrations based on the tier pricing that was active when each registration was created.

### Why is this needed?

Previously, the registration price was recalculated every time a registration was viewed, which could cause the displayed price to change if the tier changed. This script fixes existing registrations by:

1. Using the registration's creation date (or payment date if available) to determine which tier was active
2. Recalculating the price based on that tier
3. Updating the database with the correct price

### How to run

From the `backend` directory:

```bash
npm run fix-prices
```

Or directly with ts-node:

```bash
npx ts-node src/scripts/fixRegistrationPrices.ts
```

### What it does

1. Fetches all registrations from the database
2. For each registration:
   - Gets the event and pricing tiers
   - Determines which tier was active at the time of registration (using `paid_at` if available, otherwise `created_at`)
   - Calculates the correct price based on that tier
   - Updates the database if the price is different

### Output

The script will show:
- Total number of registrations processed
- Number of registrations updated
- Number of registrations skipped (already correct)
- Number of errors (if any)

Example output:
```
Starting registration price fix migration...
Found 25 registrations to process.
✅ Registration 1: Updated price from $575.00 to $475.00 (Date: 2025-12-10, Tier: Priority Registration Fee)
✅ Registration 2: Updated price from $675.00 to $575.00 (Date: 2025-12-15, Tier: Early Bird Registration Fee)
✓  Registration 3: Price already correct ($475.00)
...

=== Migration Summary ===
Total registrations: 25
Updated: 18
Skipped (already correct): 7
Errors: 0

Migration completed!
```

### Important Notes

- **Backup your database** before running this script
- The script only updates prices that are different from the calculated value
- It uses Eastern Time (America/New_York) for date comparisons to match the tier calculation logic
- The script is safe to run multiple times (idempotent)

### Troubleshooting

If you encounter errors:
1. Check that your database connection is configured correctly in `.env`
2. Ensure the `events` table has valid `registration_pricing` and `spouse_pricing` JSON data
3. Check that the date fields (`created_at`, `paid_at`) are valid

