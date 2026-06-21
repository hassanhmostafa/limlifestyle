/**
 * Health Score Calculator
 *
 * Combines blood pressure, heart rate, BMI, and temperature into a single
 * 0-100 score. Each metric is scored independently and weighted:
 *
 *  - Blood Pressure (systolic + diastolic): 35%
 *  - BMI:                                   30%
 *  - Heart Rate:                            20%
 *  - Temperature:                           15%
 *
 * Score bands:
 *  90-100  Excellent
 *  75-89   Good
 *  50-74   Fair
 *  0-49    Poor
 */

export type HealthScoreGrade = "Excellent" | "Good" | "Fair" | "Poor";

export interface HealthScoreResult {
  score: number;
  grade: HealthScoreGrade;
  gradeColor: string;
  breakdown: {
    bloodPressure: number | null;
    heartRate: number | null;
    bmi: number | null;
    temperature: number | null;
  };
}

/** Score blood pressure (0-100). Optimal = 120/80, higher penalty as it rises. */
function scoreBP(systolic: number | null, diastolic: number | null): number | null {
  if (systolic === null || diastolic === null) return null;
  // Systolic scoring
  let sScore: number;
  if (systolic < 90) sScore = 60;
  else if (systolic <= 120) sScore = 100;
  else if (systolic <= 129) sScore = 85;
  else if (systolic <= 139) sScore = 65;
  else if (systolic <= 159) sScore = 40;
  else sScore = 15;

  // Diastolic scoring
  let dScore: number;
  if (diastolic < 60) dScore = 60;
  else if (diastolic <= 80) dScore = 100;
  else if (diastolic <= 89) dScore = 65;
  else if (diastolic <= 99) dScore = 40;
  else dScore = 15;

  return Math.round((sScore + dScore) / 2);
}

/** Score heart rate (0-100). Optimal resting = 60-80 bpm. */
function scoreHR(hr: number | null): number | null {
  if (hr === null) return null;
  if (hr < 40) return 30;
  if (hr <= 60) return 90;
  if (hr <= 80) return 100;
  if (hr <= 100) return 75;
  if (hr <= 120) return 45;
  return 20;
}

/** Score BMI (0-100). Optimal = 18.5-24.9. */
function scoreBMI(bmi: number | null): number | null {
  if (bmi === null) return null;
  if (bmi < 16) return 20;
  if (bmi < 18.5) return 65;
  if (bmi <= 24.9) return 100;
  if (bmi <= 29.9) return 70;
  if (bmi <= 34.9) return 45;
  return 20;
}

/** Score body temperature (0-100). Normal = 36.1-37.2°C. */
function scoreTemp(temp: number | null): number | null {
  if (temp === null) return null;
  if (temp < 35) return 20;
  if (temp < 36.1) return 70;
  if (temp <= 37.2) return 100;
  if (temp <= 38.0) return 60;
  if (temp <= 39.0) return 35;
  return 15;
}

function gradeFromScore(score: number): { grade: HealthScoreGrade; gradeColor: string } {
  if (score >= 90) return { grade: "Excellent", gradeColor: "#22c55e" };
  if (score >= 75) return { grade: "Good", gradeColor: "#06b6d4" };
  if (score >= 50) return { grade: "Fair", gradeColor: "#f97316" };
  return { grade: "Poor", gradeColor: "#ef4444" };
}

export interface HealthScoreInput {
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  bmi?: number | null;
  temperature?: number | null;
}

/**
 * Calculate an overall health score from the latest reading values.
 * Any missing metric is excluded from the weighted average.
 */
export function calculateHealthScore(input: HealthScoreInput): HealthScoreResult {
  const bpScore = scoreBP(input.bloodPressureSystolic ?? null, input.bloodPressureDiastolic ?? null);
  const hrScore = scoreHR(input.heartRate ?? null);
  const bmiScore = scoreBMI(input.bmi ?? null);
  const tempScore = scoreTemp(input.temperature ?? null);

  // Weights
  const weights = [
    { score: bpScore, weight: 35 },
    { score: bmiScore, weight: 30 },
    { score: hrScore, weight: 20 },
    { score: tempScore, weight: 15 },
  ];

  const available = weights.filter(w => w.score !== null);
  let score = 0;
  if (available.length > 0) {
    const totalWeight = available.reduce((sum, w) => sum + w.weight, 0);
    const weightedSum = available.reduce((sum, w) => sum + (w.score! * w.weight), 0);
    score = Math.round(weightedSum / totalWeight);
  }

  const { grade, gradeColor } = gradeFromScore(score);

  return {
    score,
    grade,
    gradeColor,
    breakdown: {
      bloodPressure: bpScore,
      heartRate: hrScore,
      bmi: bmiScore,
      temperature: tempScore,
    },
  };
}
