import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import "@/styles/event-results.css";

/** Original approved artwork, framed in CSS without redrawing the logo. */
export default function LimLogo() {
  const { language } = useLanguage();
  return (
    <span
      className="lim-approved-logo"
      role="img"
      aria-label={language === "ar" ? "ليم LIM" : "LIM"}
    >
      <img src="/brand/lim-leaf-approved.webp" alt="" aria-hidden="true" />
    </span>
  );
}
