import documentCss from './repartitionDocument.css?raw';
import {
  buildPrintableFile, downloadPrintable, printPrintable,
} from '../../../../common/utils/printableDocument';

/**
 * The répartition's own binding of the shared document exporter.
 *
 * The mechanism moved to `common/utils/printableDocument` when the charge-des-services report needed
 * the same thing; what stays here is the one fact that is the répartition's — which stylesheet the
 * standalone file carries. Two copies of the blob/anchor/auto-print dance is how one of them ends up
 * with the `load`-listener bug the other already fixed.
 */

export const buildRepartitionFile = (
  node: HTMLElement, title: string, options?: { autoPrint?: boolean },
) => buildPrintableFile(node, title, documentCss, options);

export const downloadRepartition = (node: HTMLElement, fileName: string, title: string) =>
  downloadPrintable(node, fileName, title, documentCss);

export const printRepartition = (node: HTMLElement, title: string) =>
  printPrintable(node, title, documentCss);
