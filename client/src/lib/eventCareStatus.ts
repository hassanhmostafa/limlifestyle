export type AutomaticCareState = {
  approvedAt?: Date | string | null;
  nursingEnabled?: boolean;
  nursingCompletedAt?: Date | string | null;
  autoGenerationState?: string | null;
  autoGenerationError?: string | null;
  autoGenerationLeaseExpiresAt?: Date | string | null;
};

export type AutomaticCareStatus = {
  kind:
    | "approved"
    | "waiting_body"
    | "waiting_nursing"
    | "generating"
    | "retry"
    | "retry_limit"
    | "ready";
  message: string;
  canRetry: boolean;
};

function leaseIsActive(value: Date | string | null | undefined, now: number) {
  if (!value) return true;
  const expiresAt = new Date(value).getTime();
  return Number.isFinite(expiresAt) && expiresAt > now;
}

/**
 * Maps only the actual automatic-report state to participant copy. In
 * particular, a provider failure is never described as a nursing delay.
 */
export function resolveAutomaticCareStatus(
  care: AutomaticCareState | undefined,
  hasBodyResult: boolean,
  pendingRequest: boolean,
  now = Date.now()
): AutomaticCareStatus {
  if (care?.approvedAt) {
    return {
      kind: "approved",
      message: "اكتملت التوصيات التثقيفية؛ يمكنك الاطلاع على التقرير الآن.",
      canRetry: false,
    };
  }
  if (!hasBodyResult) {
    return {
      kind: "waiting_body",
      message: "ينتظر التقرير وصول نتيجة تحليل الجسم المكتملة من الجهاز.",
      canRetry: false,
    };
  }
  if (care?.nursingEnabled && !care.nursingCompletedAt) {
    return {
      kind: "waiting_nursing",
      message: "ينتظر التقرير اعتماد قياسات التمريض.",
      canRetry: false,
    };
  }
  if (
    pendingRequest ||
    (care?.autoGenerationState === "generating" &&
      leaseIsActive(care.autoGenerationLeaseExpiresAt, now))
  ) {
    return {
      kind: "generating",
      message: "يجري إعداد توصيات نمط حياة صحي للتقرير.",
      canRetry: false,
    };
  }
  if (care?.autoGenerationState === "retry_limit") {
    return {
      kind: "retry_limit",
      message:
        "توقفت محاولات إعداد التوصيات مؤقتًا. يرجى التواصل مع منظم الفعالية.",
      canRetry: false,
    };
  }
  if (care?.autoGenerationState === "failed" || care?.autoGenerationError) {
    return {
      kind: "retry",
      message: "تعذر إعداد التوصيات هذه المرة. يمكنك إعادة المحاولة الآن.",
      canRetry: true,
    };
  }
  if (care?.autoGenerationState === "generating") {
    return {
      kind: "retry",
      message: "تأخر إعداد التوصيات. يمكنك إعادة المحاولة الآن.",
      canRetry: true,
    };
  }
  return {
    kind: "ready",
    message:
      "نتيجة تحليل الجسم جاهزة. اضغط لإعداد توصيات نمط حياة صحي للتقرير.",
    canRetry: true,
  };
}
