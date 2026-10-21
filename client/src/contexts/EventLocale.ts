import { useCallback } from "react";
import { useLanguage } from "./LanguageContext";
import { eventText } from "@shared/eventTranslations";
export function useEventLocale() {
  const { language, setLanguage } = useLanguage();
  const t = useCallback(
    <T>(value: T): T => eventText(value, language),
    [language]
  );
  return {
    t,
    language,
    setLanguage,
    direction: language === "ar" ? ("rtl" as const) : ("ltr" as const),
  };
}
