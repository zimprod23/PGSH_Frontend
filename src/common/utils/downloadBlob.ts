/**
 * A file the server sent, with the name it gave it.
 *
 * ⚠ **The name comes from the server, not from the caller.** Every export is cut for a scope — a
 * promotion, an année, a stage — and the handler builds the file name out of the scope it actually
 * *resolved*, which is not always the one the page thought it was asking for (an omitted year
 * resolves to the current one). A name rebuilt on the client is a second opinion about what is in
 * the file, and the two drift the first time a filter is added on one side only.
 */
export type DownloadedFile = { blob: Blob; fileName: string };

/**
 * Reads the file name out of a `Content-Disposition` header, preferring the RFC 5987 `filename*`
 * form — accented names (« étudiants-cinquième-année… ») arrive percent-encoded there and mojibake
 * in the plain `filename`.
 */
export function fileNameFromDisposition(
  disposition: string | null,
  fallback: string,
): string {
  if (!disposition) return fallback;

  const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim().replace(/^"|"$/g, '')) || fallback;
    } catch {
      // A malformed header is not worth failing a download over — fall through to the plain form.
    }
  }

  const plain = /filename=("?)([^";]+)\1/i.exec(disposition)?.[2];
  return plain?.trim() || fallback;
}

/**
 * Hands the blob to the browser as a download.
 *
 * ⚠ The anchor is **appended to the document** before it is clicked and the object URL is revoked on
 * a later tick: a detached anchor does not reliably honour `download` in every browser, and revoking
 * synchronously races the browser's read of the blob. Same reasoning as
 * `buildRepartitionFile.downloadRepartition`, which learned it the hard way.
 */
export function downloadBlob({ blob, fileName }: DownloadedFile): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
