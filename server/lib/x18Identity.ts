import type { X18Measurement } from "./x18Payload";
import { isLIMPhoneQrToken, normalizeSaudiMobilePhone } from "./phone";

export type X18ReportedIdentity = {
  patientName: string | null;
  patientAge: number | null;
  patientSex: string | null;
};

/**
 * Extracts the patient details transmitted by X18 for one measurement.
 * These values deliberately belong to the report, not to the LIM account.
 */
export function extractX18ReportedIdentity(data: X18Measurement): X18ReportedIdentity {
  const rawName = data.name?.trim() || null;
  // On some firmware versions a phone-QR scan is written into `name`. It is an
  // account lookup value, not the person's name, and must not be shown as one.
  const patientName = rawName && !isLIMPhoneQrToken(rawName) && !normalizeSaudiMobilePhone(rawName).ok
    ? rawName
    : null;

  const rawAge = data.age?.trim() ?? "";
  const parsedAge = Number(rawAge);
  const patientAge = rawAge !== "" && Number.isInteger(parsedAge) && parsedAge >= 0 && parsedAge <= 130
    ? parsedAge
    : null;

  return {
    patientName,
    patientAge,
    patientSex: data.sex?.trim() || null,
  };
}

/** Human-readable label for the sex code transmitted by the observed X18_5. */
export function formatX18Sex(value: string | null | undefined, language: "en" | "ar"): string {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "—";
  if (["1", "male", "m", "男"].includes(normalized)) return language === "ar" ? "ذكر" : "Male";
  if (["2", "female", "f", "女"].includes(normalized)) return language === "ar" ? "أنثى" : "Female";
  return value!.trim();
}
