import { Button, Tooltip } from '@mantine/core';
import { IconFileSpreadsheet } from '@tabler/icons-react';
import { useState } from 'react';
import { useNotify } from '../hooks/useNotify';
import { isReportedByErrorMiddleware, problemMessage } from '../utils/problemMessage';
import { downloadBlob, type DownloadedFile } from '../utils/downloadBlob';

interface ExportButtonProps {
  /** Fetches the file. Whatever the caller passes must already carry the page's own scope. */
  fetch: () => Promise<DownloadedFile>;
  label?: string;
  /** Why the button is unavailable — shown as a tooltip, so a disabled control still explains itself. */
  disabledReason?: string;
  variant?: string;
  size?: string;
  fullWidth?: boolean;
}

/**
 * One button, one download. The single place that knows what happens between a click and a file:
 * the pending state, handing the blob to the browser, and putting the **server's own sentence** on
 * screen when it refuses.
 *
 * <p>⚠ The refusals this has to carry are not decoration. « L'export porterait sur 42 000 lignes,
 * au-delà de la limite de 20 000. Restreignez la sélection (une promotion, un groupe ou une
 * recherche) » is the whole difference between a user who narrows the filter and one who reports a
 * broken button — the same failure `StagesPage` had when it swallowed every message behind
 * « Erreur lors de l'enregistrement ».</p>
 *
 * <p>A disabled button says **why** rather than sitting there greyed out: an export whose scope is
 * not resolved yet (no year selected) is a normal state, not a fault.</p>
 */
export function ExportButton({
  fetch,
  label = 'Exporter (.xlsx)',
  disabledReason,
  variant = 'light',
  size = 'sm',
  fullWidth = false,
}: ExportButtonProps) {
  const notify = useNotify();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      downloadBlob(await fetch());
    } catch (err: unknown) {
      // ⚠ No unconditional toast here. `errorMiddleware` already shows every rejected request in
      // the server's own words, so a second one prints the same sentence twice — reproduced on this
      // very button on 2026-08-31 before this guard, and the same defect session 31b removed from
      // four teardown handlers. The only gap is a 404 on a query, which the middleware deliberately
      // swallows; a download button has no empty state to render, so it must speak for itself there.
      if (!isReportedByErrorMiddleware(err))
        notify.error(problemMessage(err) ?? "L'export n'a pas pu être généré.");
    } finally {
      setBusy(false);
    }
  };

  const button = (
    <Button
      leftSection={<IconFileSpreadsheet size={16} stroke={1.5} />}
      onClick={handleClick}
      loading={busy}
      disabled={!!disabledReason}
      variant={variant}
      size={size}
      radius="md"
      fullWidth={fullWidth}
    >
      {label}
    </Button>
  );

  return disabledReason ? (
    <Tooltip label={disabledReason} withArrow>
      {/* A disabled Mantine button swallows pointer events, so the tooltip needs a live wrapper. */}
      <span style={{ display: fullWidth ? 'block' : 'inline-block' }}>{button}</span>
    </Tooltip>
  ) : (
    button
  );
}
