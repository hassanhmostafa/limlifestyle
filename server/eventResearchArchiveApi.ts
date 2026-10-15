import type { Request, Response } from "express";
import { parse } from "cookie";
import { hashApiKey } from "./lib/apiSecurity";
import { researcherBySession, authorizeReportArchive, auditReportArchiveAccess } from "./eventResearchDb";
import { readArchivedReportPdf } from "./eventReportArchive";

const RESEARCH_COOKIE = "lim_event_research";

function researcherToken(request: Request) {
  const token = parse(request.headers.cookie ?? "")[RESEARCH_COOKIE];
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}

/**
 * Streams an original participant PDF only after checking the existing research
 * login session, report-archive privilege, and scoped event grant. Ciphertext
 * storage URLs are intentionally never exposed to the browser.
 */
export async function handleArchivedReportPdf(request: Request, response: Response) {
  const archiveId = String(request.params.archiveId ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(archiveId)) {
    response.status(404).json({ error: "Report archive unavailable" });
    return;
  }
  const token = researcherToken(request);
  try {
    const researcher = token ? await researcherBySession(hashApiKey(token)) : undefined;
    if (!researcher) {
      response.status(401).json({ error: "Research authentication required" });
      return;
    }
    const authorized = await authorizeReportArchive(researcher, archiveId);
    const report = await readArchivedReportPdf(authorized.archiveId);
    if (!report) {
      response.status(404).json({ error: "Original report PDF is not archived" });
      return;
    }
    await auditReportArchiveAccess(researcher, authorized.eventCode, "archive_pdf");
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Length", String(report.pdf.length));
    response.setHeader("Content-Disposition", `attachment; filename="lim-report-${archiveId}.pdf"`);
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.status(200).end(report.pdf);
  } catch {
    // The status remains deliberately non-descriptive so an archive ID cannot
    // disclose an event, participant, encryption state, or researcher scope.
    response.status(404).json({ error: "Report archive unavailable" });
  }
}
