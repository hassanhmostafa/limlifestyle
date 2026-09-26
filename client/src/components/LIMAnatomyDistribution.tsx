import React from "react";
import { eventNumeric } from "@/lib/eventResultsData";
import "@/styles/event-results.css";

export type LIMAnatomyMode = "muscle" | "fat";
export type LIMAnatomyLanguage = "ar" | "en";

type SegmentArea = "left-arm" | "right-arm" | "trunk" | "left-leg" | "right-leg";

type LIMAnatomyDistributionProps = {
  mode: LIMAnatomyMode;
  values: Record<string, string>;
  language?: LIMAnatomyLanguage;
};

function formatValue(value: string | undefined) {
  const parsed = eventNumeric(value);
  return parsed === null ? null : parsed.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function labelFor(area: SegmentArea, language: LIMAnatomyLanguage) {
  const labels = {
    ar: {
      "left-arm": "الذراع اليمنى",
      "right-arm": "الذراع اليسرى",
      trunk: "الجذع",
      "left-leg": "الساق اليمنى",
      "right-leg": "الساق اليسرى",
    },
    en: {
      "left-arm": "Right arm",
      "right-arm": "Left arm",
      trunk: "Trunk",
      "left-leg": "Right leg",
      "right-leg": "Left leg",
    },
  } as const;

  return labels[language][area];
}

function SegmentCard({
  area,
  mode,
  value,
  language,
}: {
  area: SegmentArea;
  mode: LIMAnatomyMode;
  value?: string;
  language: LIMAnatomyLanguage;
}) {
  const formatted = formatValue(value);
  return (
    <div className={`lim-segment-card lim-segment-${area} lim-segment-${mode}`}>
      <span>{labelFor(area, language)}</span>
      <strong dir="ltr">{formatted === null ? (language === "ar" ? "غير متوفر" : "Unavailable") : `${formatted} kg`}</strong>
      <i className="lim-segment-target" aria-hidden="true" />
    </div>
  );
}

/**
 * Shared X18 segmental-measurement board. The artwork, labels, leaders, and dots
 * live in a single fixed coordinate system so the Events report and My Health
 * report always scale as one diagram at every viewport width.
 */
export function LIMAnatomyDistribution({ mode, values, language = "ar" }: LIMAnatomyDistributionProps) {
  return (
    <div className="lim-anatomy-stage" aria-label={language === "ar" ? "توزيع قياسات الجسم القطاعية" : "Segmental body measurement distribution"}>
      <SegmentCard area="left-arm" mode={mode} language={language} value={values[`${mode}RightArm`]} />
      <SegmentCard area="right-arm" mode={mode} language={language} value={values[`${mode}LeftArm`]} />
      <SegmentCard area="trunk" mode={mode} language={language} value={values[`${mode}Trunk`]} />
      <SegmentCard area="left-leg" mode={mode} language={language} value={values[`${mode}RightLeg`]} />
      <SegmentCard area="right-leg" mode={mode} language={language} value={values[`${mode}LeftLeg`]} />
      <div className="lim-anatomy-figure">
        <img
          src={`/api/events/anatomy/${mode}`}
          alt={mode === "muscle"
            ? (language === "ar" ? "رسم توضيحي محايد لتوزيع العضلات" : "Neutral illustration of muscle distribution")
            : (language === "ar" ? "رسم توضيحي محايد لتوزيع الدهون" : "Neutral illustration of fat distribution")}
          decoding="async"
          loading="eager"
        />
      </div>
    </div>
  );
}
