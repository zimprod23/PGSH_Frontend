/**
 * Turning a rendered document into a standalone file the faculty can keep, e-mail or upload.
 *
 * <p>This is the répartition's mechanism, lifted out of it when a second document needed the same
 * thing. It serializes <b>the very node on screen</b> rather than re-emitting the markup: the
 * preview, the printed PDF and the downloaded .html are then the same document by construction, not
 * by two implementations agreeing. The stylesheet is inlined from the same source the app imports,
 * so the file needs nothing from this server once it leaves.</p>
 *
 * <p>⚠ Any chart drawn in such a document must therefore be <b>inline SVG or CSS</b>. A canvas
 * serializes as an empty element and a charting library that measures the DOM on mount draws
 * nothing in a file opened elsewhere — the reader would get a document with holes where the figures
 * were, and no error anywhere saying so.</p>
 */

// The closing tag is concatenated rather than written literally so this module can never terminate
// a <script> block that happens to contain the bundle.
const AUTO_PRINT_SCRIPT =
  '<script>window.addEventListener("load", function () { window.print(); });<' + '/script>';

interface BuildOptions {
  /**
   * Inject a one-line `onload` that prints the document. Only the « Imprimer » path sets this — a
   * downloaded file must never print itself the moment the faculty opens it.
   */
  autoPrint?: boolean;
}

export function buildPrintableFile(
  node: HTMLElement, title: string, css: string, { autoPrint = false }: BuildOptions = {},
): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
html, body { margin: 0; padding: 0; background: #ffffff; }
${css}
</style>
</head>
<body>
${node.outerHTML}
${autoPrint ? AUTO_PRINT_SCRIPT : ''}
</body>
</html>`;
}

const asBlobUrl = (node: HTMLElement, title: string, css: string, options?: BuildOptions) =>
  URL.createObjectURL(
    new Blob([buildPrintableFile(node, title, css, options)], { type: 'text/html;charset=utf-8' }),
  );

/**
 * The anchor is attached to the document before clicking, and the URL is revoked on a later tick:
 * a detached anchor does not reliably honour `download` in every browser, and revoking synchronously
 * races the browser's read of the blob.
 */
export function downloadPrintable(
  node: HTMLElement, fileName: string, title: string, css: string,
): void {
  const url = asBlobUrl(node, title, css);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.html`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 10_000);
}

/**
 * Prints the exported file rather than the page it sits on, so the PDF is the document alone — no
 * navbar, no toolbar — without the admin layout needing print rules of its own.
 *
 * ⚠ The print call lives *inside* the generated document. Attaching a `load` listener to the
 * `WindowProxy` returned by `window.open` does not work: that listener is bound to the initial
 * `about:blank` document and is discarded when the blob replaces it, so the tab would just sit there
 * having never printed. The blob URL is revoked well after the document has loaded, so the tab stays
 * reloadable and saveable rather than 404-ing on refresh.
 */
export function printPrintable(node: HTMLElement, title: string, css: string): void {
  const url = asBlobUrl(node, title, css, { autoPrint: true });
  const win = window.open(url, '_blank');

  if (!win) {
    URL.revokeObjectURL(url);
    return;
  }

  win.focus();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (c) => ESCAPES[c]);
