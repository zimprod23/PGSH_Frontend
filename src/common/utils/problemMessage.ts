/**
 * The sentence the server actually sent, out of an RTK Query rejection.
 *
 * ⚠ **A refusal carries its message in one of two places, and reading only one drops half of them.**
 * A business refusal — `Result.Failure(Error.Validation(...))` — puts its sentence in `detail`. A
 * *validation-pipeline* failure does not: `detail` is then the generic « One or more validation
 * errors occurred » and the real messages are in `errors[]`. A handler that read only `detail`
 * showed the useless half; `StagesPage` swallowed both behind « Erreur lors de l'enregistrement »
 * and that is how a stage refusing to save named a field nobody was editing.
 *
 * Returns `undefined` when the rejection carries no sentence at all (a network failure, a 500), so
 * the caller can fall back to its own wording — never a made-up one.
 */
type ProblemBody = {
  detail?: string;
  title?: string;
  errors?: Record<string, string[]> | string[];
};

export function problemMessage(err: unknown): string | undefined {
  const body = (err as { data?: ProblemBody | string })?.data;

  if (typeof body === 'string') return body.trim() || undefined;
  if (!body) return undefined;

  const fromErrors = flatten(body.errors);
  if (fromErrors.length > 0) return fromErrors.join(' ');

  return body.detail?.trim() || body.title?.trim() || undefined;
}

function flatten(errors: ProblemBody['errors']): string[] {
  if (!errors) return [];
  const values = Array.isArray(errors) ? errors : Object.values(errors).flat();
  return values.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

/**
 * Did `errorMiddleware` already put this rejection on screen?
 *
 * ⚠ **It toasts every rejected request, queries included** — connexion, 401, 403, 400/422, 409 and a
 * catch-all — so a component that also toasts prints the same sentence twice. That double toast is a
 * standing defect in this app (session 31b removed the page-level call from four teardown handlers
 * for exactly this reason) and it is trivially easy to reintroduce.
 *
 * The middleware has **one** deliberate gap: a **404 on a query** is swallowed, because « ceci
 * n'existe pas encore » is a state screens render themselves rather than a failure. A screen that
 * renders nothing for it — a download button, which has no empty state to show — must speak for
 * itself there, and only there.
 */
export function isReportedByErrorMiddleware(err: unknown): boolean {
  return (err as { status?: number | string })?.status !== 404;
}
