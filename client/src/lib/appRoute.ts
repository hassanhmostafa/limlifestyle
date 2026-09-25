/** The standalone Events experience must remain free of LIM app-install prompts. */
export function shouldShowInstallPrompt(pathname: string) {
  return !pathname.startsWith("/events");
}
