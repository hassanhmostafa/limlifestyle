export type PhoneNormalizationResult =
  | { ok: true; e164: string; national: string }
  | { ok: false };

/**
 * Normalizes Saudi mobile numbers for user accounts and kiosk `userID` matching.
 * Accepted examples: 0563817217, 563817217, +966563817217, 00966563817217.
 */
export function normalizeSaudiMobilePhone(input: string): PhoneNormalizationResult {
  const compact = input.trim().replace(/[\s().-]/g, "");
  if (!compact) return { ok: false };

  let local = compact;
  if (local.startsWith("+966")) local = local.slice(4);
  else if (local.startsWith("00966")) local = local.slice(5);
  else if (local.startsWith("966")) local = local.slice(3);

  if (local.startsWith("0")) local = local.slice(1);

  // Saudi mobile numbers use 5 followed by eight digits.
  if (!/^5\d{8}$/.test(local)) return { ok: false };

  return {
    ok: true,
    e164: `+966${local}`,
    national: `0${local}`,
  };
}

/** Converts a stored E.164 Saudi number to the national format expected by the X18 machine. */
export function toMachineUserId(phone: string | null | undefined): string {
  if (!phone) return "";
  const normalized = normalizeSaudiMobilePhone(phone);
  return normalized.ok ? normalized.national : "";
}
