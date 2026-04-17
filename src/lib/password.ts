/**
 * Password strength validation (NIST 2023-aligned).
 *
 * Requires min length 8 AND combination of letters + digits — pragmatic
 * middle ground between old "length-only" and heavy complexity rules.
 */

export type PasswordCheck = { valid: boolean; reason?: string };

export function isPasswordStrong(pwd: string): PasswordCheck {
  if (pwd.length < 8) {
    return { valid: false, reason: "Use pelo menos 8 caracteres" };
  }
  const hasLetter = /[A-Za-zÀ-ÿ]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  if (!hasLetter || !hasDigit) {
    return { valid: false, reason: "Combine letras e números" };
  }
  return { valid: true };
}
