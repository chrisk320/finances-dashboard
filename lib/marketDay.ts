// Current US market day in America/New_York as YYYY-MM-DD. Used as the daily
// cache key for once-per-day Claude artifacts (briefing, digest) so the boundary
// never drifts between them.
export function etDay(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}
