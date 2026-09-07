/**
 * The largest page the API will serve, mirroring `QueryableExtensions.MaxPageSize` on the server.
 *
 * ⚠ The server **clamps** to this number rather than refusing — the response still carries the true
 * `totalCount`, so nothing is silently hidden. Asking for more than this is therefore pointless, and
 * asking for it at a screen that genuinely wants "all of a bounded set" is the right call: a level's
 * stage catalogue, a promotion's rosters, a stage's cohorts in one year.
 *
 * ⚠ It is **not** a licence to skip paging. A set that grows with the faculty's size still pages —
 * students, assignments, périodes. This is for lookups bounded by something other than enrolment.
 */
export const MAX_PAGE_SIZE = 200;
