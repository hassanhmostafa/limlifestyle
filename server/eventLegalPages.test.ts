import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Router } from "wouter";
import { EventPrivacy, EventTerms } from "../client/src/pages/EventLegal";

const renderPage = (component: typeof EventTerms, path: string) =>
  renderToStaticMarkup(
    createElement(Router, { ssrPath: path }, createElement(component))
  );

describe("Events legal pages", () => {
  it("publishes clear adult-only, educational-use terms", () => {
    const markup = renderPage(EventTerms, "/events/terms");
    expect(markup).toContain("الشروط والأحكام");
    expect(markup).toContain("18 سنة فأكثر");
    expect(markup).toContain("لا تُعد تشخيصًا");
    expect(markup).toContain("/events");
  });

  it("explains data categories, access limits and participant rights", () => {
    const markup = renderPage(EventPrivacy, "/events/privacy");
    expect(markup).toContain("سياسة الخصوصية");
    expect(markup).toContain("البيانات التي نجمعها");
    expect(markup).toContain("وصول محدود");
    expect(markup).toContain("حقوقك");
    expect(markup).toContain("منزوعة الهوية");
  });
});
