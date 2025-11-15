import crypto from 'crypto';
import { User } from '../models/User';

// Utility to generate a strong random password that satisfies User.isValidPassword
export const generateStrongTempPassword = (): string => {
  // Try a few times until we get a password that matches the policy
  for (let i = 0; i < 10; i += 1) {
    // Base random string, then strip non-alphanumerics
    const raw = crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    // Ensure it has at least 1 upper, 1 lower, 1 digit
    let candidate = raw;
    if (!/[A-Z]/.test(candidate)) candidate += 'A';
    if (!/[a-z]/.test(candidate)) candidate += 'a';
    if (!/[0-9]/.test(candidate)) candidate += '1';
    if (candidate.length < 8) candidate += 'X9x9';
    if (User.isValidPassword(candidate)) {
      return candidate;
    }
  }
  // Fallback, should rarely happen
  return 'TempPass1';
};


