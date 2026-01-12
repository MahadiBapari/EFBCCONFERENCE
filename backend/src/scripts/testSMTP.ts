#!/usr/bin/env node
/**
 * Test script to verify SMTP configuration and connectivity
 * 
 * Usage: npx ts-node src/scripts/testSMTP.ts [test-email@example.com]
 * 
 * If an email address is provided, it will send a test email.
 * Otherwise, it will only verify the SMTP connection.
 */

import nodemailer, { type Transporter } from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testSMTP = async (): Promise<void> => {
  console.log('=== SMTP Configuration Test ===\n');

  // Check required environment variables
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = (process.env.SMTP_SECURE || '').length
    ? /^(1|true|yes)$/i.test(process.env.SMTP_SECURE as string)
    : port === 465;
  const emailFrom = process.env.EMAIL_FROM || 'no-reply@efbc.local';

  console.log('Configuration:');
  console.log(`  SMTP_HOST: ${host || '❌ NOT SET'}`);
  console.log(`  SMTP_PORT: ${port}`);
  console.log(`  SMTP_USER: ${user || '❌ NOT SET'}`);
  console.log(`  SMTP_PASS: ${pass ? '***' + pass.slice(-4) : '❌ NOT SET'}`);
  console.log(`  SMTP_SECURE: ${secure}`);
  console.log(`  EMAIL_FROM: ${emailFrom}`);
  console.log('');

  // Check if all required variables are set
  if (!host || !user || !pass) {
    const missing: string[] = [];
    if (!host) missing.push('SMTP_HOST');
    if (!user) missing.push('SMTP_USER');
    if (!pass) missing.push('SMTP_PASS');
    console.error('❌ SMTP configuration incomplete. Missing:', missing.join(', '));
    console.error('\nPlease set the following environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    process.exit(1);
  }

  // Create transporter
  console.log('Creating SMTP transporter...');
  const transporter: Transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    tls: {
      minVersion: 'TLSv1.2',
      servername: host
    },
    logger: true,
    debug: true,
  });

  // Test connection
  console.log('Testing SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');
  } catch (error: any) {
    console.error('❌ SMTP connection failed!');
    console.error('Error:', error.message || error);
    if (error.code) console.error('Error code:', error.code);
    if (error.command) console.error('Failed command:', error.command);
    process.exit(1);
  }

  // If test email address provided, send test email
  const testEmail = process.argv[2];
  if (testEmail) {
    console.log(`Sending test email to: ${testEmail}...`);
    try {
      const info = await transporter.sendMail({
        from: emailFrom,
        to: testEmail,
        subject: 'SMTP Test Email - EFBC Conference',
        text: 'This is a test email to verify SMTP configuration is working correctly.',
        html: `
          <h2>SMTP Test Email</h2>
          <p>This is a test email to verify SMTP configuration is working correctly.</p>
          <p>If you received this email, your SMTP setup is functioning properly!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Sent at: ${new Date().toISOString()}<br>
            From: ${emailFrom}<br>
            SMTP Host: ${host}
          </p>
        `,
      });
      console.log('✅ Test email sent successfully!');
      console.log('Message ID:', info.messageId);
      console.log('Response:', info.response);
    } catch (error: any) {
      console.error('❌ Failed to send test email!');
      console.error('Error:', error.message || error);
      if (error.code) console.error('Error code:', error.code);
      process.exit(1);
    }
  } else {
    console.log('ℹ️  No test email address provided.');
    console.log('   To send a test email, run:');
    console.log(`   npx ts-node src/scripts/testSMTP.ts your-email@example.com`);
  }

  console.log('\n=== Test Complete ===');
};

// Run the test
testSMTP().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

