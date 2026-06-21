/**
 * BMI Calculation Utilities
 *
 * Actual BMI   = weight (kg) / height (m)²
 *
 * Ideal BMI is the midpoint of the healthy BMI range adjusted for age and gender.
 * The WHO defines healthy BMI as 18.5–24.9 for adults.
 * For adults ≥ 65, the healthy range shifts slightly upward (22–27) due to muscle loss.
 * For children/teens (< 18), BMI-for-age percentiles apply; we return a standard
 * midpoint of 18.5 as a conservative estimate for under-18 users.
 *
 * Ideal weight (used to derive ideal BMI) is commonly estimated via the
 * Devine formula:
 *   Men:   50 kg + 2.3 kg per inch over 5 feet
 *   Women: 45.5 kg + 2.3 kg per inch over 5 feet
 * Ideal BMI = ideal weight / height (m)²
 */

export interface WeightTargetResult {
  /** Ideal weight in kg based on Devine formula */
  idealWeightKg: number;
  /** Current weight in kg */
  currentWeightKg: number;
  /** Difference: positive = need to lose, negative = need to gain */
  diffKg: number;
  /** Progress toward ideal weight (0-100). 100 = at ideal weight */
  progressPct: number;
  /** Whether user needs to lose or gain weight */
  direction: "lose" | "gain" | "at_ideal";
}

export interface BmiResult {
  /** Actual BMI calculated from measured weight and height */
  actualBmi: number;
  /** Ideal BMI derived from height, age, and gender */
  idealBmi: number;
  /** Healthy BMI range lower bound for this person */
  healthyMin: number;
  /** Healthy BMI range upper bound for this person */
  healthyMax: number;
  /** Classification of the actual BMI */
  classification: "Underweight" | "Normal" | "Overweight" | "Obese";
  /** Age derived from birthDate */
  age: number;
}

/**
 * Compute age in whole years from a YYYY-MM-DD birth date string.
 */
export function computeAge(birthDate: string): number {
  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Compute the healthy BMI range for a given age.
 * Adults 18–64: WHO standard 18.5–24.9
 * Seniors ≥65: slightly elevated range 22–27
 * Under 18: use standard adult lower bound as approximation
 */
export function healthyBmiRange(age: number): { min: number; max: number } {
  if (age >= 65) return { min: 22, max: 27 };
  return { min: 18.5, max: 24.9 };
}

/**
 * Compute ideal weight (kg) using the Devine formula.
 * @param heightCm - height in centimetres
 * @param gender   - "male" | "female"
 */
export function idealWeightKg(heightCm: number, gender: "male" | "female"): number {
  const heightInches = heightCm / 2.54;
  const inchesOver5Feet = Math.max(0, heightInches - 60);
  const base = gender === "male" ? 50 : 45.5;
  return base + 2.3 * inchesOver5Feet;
}

/**
 * Calculate ideal weight target and progress toward it.
 */
export function calculateWeightTarget(
  currentWeightKg: number,
  heightCm: number,
  gender: "male" | "female"
): WeightTargetResult {
  const ideal = parseFloat(idealWeightKg(heightCm, gender).toFixed(1));
  const diff = parseFloat((currentWeightKg - ideal).toFixed(1));
  const absDiff = Math.abs(diff);

  // Progress: 100% when at ideal. Starts from a max deviation of 30kg.
  const maxDeviation = 30;
  const progressPct = Math.round(Math.max(0, Math.min(100, ((maxDeviation - absDiff) / maxDeviation) * 100)));

  const direction: WeightTargetResult["direction"] =
    absDiff < 0.5 ? "at_ideal" : diff > 0 ? "lose" : "gain";

  return { idealWeightKg: ideal, currentWeightKg, diffKg: diff, progressPct, direction };
}

/**
 * Full BMI calculation returning actual BMI, ideal BMI, healthy range, and classification.
 *
 * @param weightKg  - measured weight in kg
 * @param heightCm  - measured height in cm
 * @param birthDate - ISO date string YYYY-MM-DD
 * @param gender    - "male" | "female"
 */
export function calculateBmi(
  weightKg: number,
  heightCm: number,
  birthDate: string,
  gender: "male" | "female"
): BmiResult {
  const heightM = heightCm / 100;
  const actualBmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

  const age = computeAge(birthDate);
  const { min: healthyMin, max: healthyMax } = healthyBmiRange(age);

  // Ideal BMI: midpoint of healthy range anchored to Devine ideal weight
  const devineWeight = idealWeightKg(heightCm, gender);
  const devineBmi = parseFloat((devineWeight / (heightM * heightM)).toFixed(1));
  // Clamp ideal BMI to the healthy range
  const idealBmi = parseFloat(Math.min(Math.max(devineBmi, healthyMin), healthyMax).toFixed(1));

  let classification: BmiResult["classification"];
  if (actualBmi < 18.5) classification = "Underweight";
  else if (actualBmi < 25) classification = "Normal";
  else if (actualBmi < 30) classification = "Overweight";
  else classification = "Obese";

  return { actualBmi, idealBmi, healthyMin, healthyMax, classification, age };
}
