import React from "react";
import "@/styles/event-results.css";

/** Original approved artwork, framed in CSS without redrawing the logo. */
export default function LimLogo() {
  return (
    <span className="lim-approved-logo" role="img" aria-label="ليم LIM">
      <img src="/brand/lim-leaf-approved.png" alt="" aria-hidden="true" />
    </span>
  );
}
