/**
 * AI Health & Diet Plans tRPC router.
 * Generates personalized plans using the user's actual health metrics via LLM.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getUserReadings, getUserById, createAiPlan, getUserAiPlans, deleteAiPlan } from "../db";
import { calculateBmi } from "../../shared/bmi";
import { calculateHealthScore } from "../../shared/healthScore";
import { invokeLLM } from "../_core/llm";

export const aiPlansRouter = router({
  /**
   * Generate a new AI health/diet plan based on the user's latest health metrics.
   * Frontend: trpc.aiPlans.generate.useMutation()
   */
  generate: protectedProcedure
    .input(
      z.object({
        planType: z.enum(["health", "diet", "combined"]),
        language: z.enum(["en", "ar"]).default("en"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      // Gather health metrics
      const readings = await getUserReadings(ctx.user.id);
      const latest = readings[0] ?? null;

      // Compute age from birthDate
      let age: number | null = null;
      if (user.birthDate) {
        const birth = new Date(user.birthDate);
        const today = new Date();
        age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      }

      // Compute BMI data
      let bmiInfo: string = "Not available (no height/weight readings)";
      let bmiValue: number | null = null;
      if (latest?.weight && latest?.height && user.birthDate && user.gender) {
        const bmiResult = calculateBmi(
          parseFloat(latest.weight),
          parseFloat(latest.height),
          user.birthDate,
          user.gender
        );
        bmiValue = bmiResult.actualBmi;
        bmiInfo = `${bmiResult.actualBmi.toFixed(1)} (${bmiResult.classification}) — Ideal: ${bmiResult.idealBmi.toFixed(1)}`;
      }

      // Compute health score
      let healthScoreInfo: string = "Not available";
      let healthScoreValue: number | null = null;
      if (latest) {
        const scoreResult = calculateHealthScore({
          bloodPressureSystolic: latest.bloodPressureSystolic,
          bloodPressureDiastolic: latest.bloodPressureDiastolic,
          heartRate: latest.heartRate,
          bmi: latest.bmi ? parseFloat(latest.bmi) : null,
          temperature: latest.temperature ? parseFloat(latest.temperature) : null,
        });
        healthScoreValue = scoreResult.score;
        healthScoreInfo = `${scoreResult.score}/100 (${scoreResult.grade})`;
      }

      // Build metrics snapshot for storage
      const metricsSnapshot = {
        age,
        gender: user.gender,
        weight: latest?.weight ?? null,
        height: latest?.height ?? null,
        bmi: bmiValue,
        bloodPressureSystolic: latest?.bloodPressureSystolic ?? null,
        bloodPressureDiastolic: latest?.bloodPressureDiastolic ?? null,
        heartRate: latest?.heartRate ?? null,
        temperature: latest?.temperature ?? null,
        healthScore: healthScoreValue,
      };

      // Build the prompt
      const planTypeLabel =
        input.planType === "health"
          ? "personalized health improvement plan"
          : input.planType === "diet"
          ? "personalized diet and nutrition plan"
          : "comprehensive health improvement and diet plan";

      const languageInstruction =
        input.language === "ar"
          ? "Write the entire plan in Arabic (العربية). Use proper Arabic medical and nutritional terminology."
          : "Write the entire plan in English.";

      const systemPrompt = `You are a certified health coach and nutritionist specializing in preventive healthcare.
You create evidence-based, practical, and culturally appropriate plans for Saudi Arabian users.
${languageInstruction}

Formatting rules (MUST follow):
1. Be concise — avoid long paragraphs. Use short bullet points (max 2 lines each).
2. For any weekly schedule (exercise, meals, or activities), ALWAYS output it as a markdown table with columns: | Day | Morning | Afternoon | Evening | (add more columns if needed for meals).
3. Use ## for section headings, ** for key terms.
4. End with a one-line disclaimer that this plan is for general wellness guidance only.`;

      const userPrompt = `Create a ${planTypeLabel} for a user with the following health profile:

**Personal Information:**
- Age: ${age !== null ? `${age} years old` : "Not provided"}
- Gender: ${user.gender ?? "Not provided"}

**Latest Health Metrics:**
- Blood Pressure: ${latest?.bloodPressureSystolic && latest?.bloodPressureDiastolic ? `${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic} mmHg` : "Not available"}
- Heart Rate: ${latest?.heartRate ? `${latest.heartRate} bpm` : "Not available"}
- Weight: ${latest?.weight ? `${latest.weight} kg` : "Not available"}
- Height: ${latest?.height ? `${latest.height} cm` : "Not available"}
- BMI: ${bmiInfo}
- Temperature: ${latest?.temperature ? `${latest.temperature}°C` : "Not available"}
- Overall Health Score: ${healthScoreInfo}

**Instructions:**
${
  input.planType === "health" || input.planType === "combined"
    ? `
- Provide a weekly exercise and activity plan appropriate for their fitness level
- Include specific recommendations to address any concerning metrics (e.g., high blood pressure, abnormal BMI)
- Add daily habits and lifestyle changes for long-term health improvement
- Include sleep and stress management recommendations
`
    : ""
}
${
  input.planType === "diet" || input.planType === "combined"
    ? `
- Create a 7-day meal plan with breakfast, lunch, dinner, and snacks
- Include culturally appropriate Saudi/Arab foods and ingredients
- Specify portion sizes and calorie estimates where relevant
- Address any dietary needs based on their health metrics (e.g., low-sodium for high BP, calorie deficit for high BMI)
- Include hydration recommendations
`
    : ""
}

Format rules:
- Keep the total plan under 600 words.
- Use short bullet points, not long paragraphs.
- The weekly schedule MUST be a markdown table (| Day | Morning | Afternoon | Evening |).
- Use ## for section headings.
- Be direct and actionable.`;

      // Call the LLM
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : null;
      if (!content) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI failed to generate a plan. Please try again." });
      }

      // Save the plan to the database
      const saved = await createAiPlan({
        userId: ctx.user.id,
        planType: input.planType,
        content,
        metricsSnapshot,
      });

      return { plan: saved, content };
    }),

  /**
   * Get all previously generated plans for the current user.
   * Frontend: trpc.aiPlans.myPlans.useQuery()
   */
  myPlans: protectedProcedure.query(async ({ ctx }) => {
    return getUserAiPlans(ctx.user.id);
  }),

  /**
   * Delete a saved AI plan.
   * Frontend: trpc.aiPlans.deletePlan.useMutation()
   */
  deletePlan: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteAiPlan(input.id, ctx.user.id);
      return { success: true };
    }),
});
