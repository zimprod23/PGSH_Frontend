import { Button, Menu, Text } from '@mantine/core';
import { IconChevronDown, IconFileSpreadsheet } from '@tabler/icons-react';
import { useState } from 'react';
import { useNotify } from '../../../common/hooks/useNotify';
import { isReportedByErrorMiddleware, problemMessage } from '../../../common/utils/problemMessage';
import { downloadBlob } from '../../../common/utils/downloadBlob';
import { useLazyGetStageAssignmentsExportQuery } from '../api/adminApi';
import type { StageAssignmentsExportRequest } from '../types/export.types';

interface StageRecordExportMenuProps {
  /** The scope the page is already showing — promotion, stage, groupe, année. */
  scope: StageAssignmentsExportRequest;
  disabledReason?: string;
  label?: string;
  variant?: string;
}

/**
 * The post-validation stage record, as a download: « Stages » (one row per affectation, with its
 * note and son verdict), « Périodes » (one row per période, joined by `Réf. stage`) and
 * « Synthèse » (les verdicts par stage).
 *
 * <p><b>Two items, not a switch.</b> The difference between them is what the document <em>is</em>,
 * not a filter on it — « état des lieux » shows the affectations still without a verdict, « PV »
 * shows only those that have one. A checkbox beside a button says neither; two named items say
 * both, and the wording is written once here rather than on every page that offers the export.</p>
 *
 * <p>⚠ The default is the <b>complete</b> document. A file whose purpose is « où en est la
 * promotion » has to show the holes: filtered by default, a missing évaluation would be
 * indistinguishable from a student nobody ever planned.</p>
 */
export function StageRecordExportMenu({
  scope,
  disabledReason,
  label = 'Dossier de stages (.xlsx)',
  variant = 'light',
}: StageRecordExportMenuProps) {
  const notify = useNotify();
  const [fetchExport] = useLazyGetStageAssignmentsExportQuery();
  const [busy, setBusy] = useState(false);

  const run = async (onlyEvaluated: boolean) => {
    setBusy(true);
    try {
      downloadBlob(await fetchExport({ ...scope, onlyEvaluated }).unwrap());
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

  return (
    <Menu shadow="md" width={320} position="bottom-end" disabled={!!disabledReason}>
      <Menu.Target>
        <Button
          leftSection={<IconFileSpreadsheet size={16} stroke={1.5} />}
          rightSection={<IconChevronDown size={14} stroke={1.5} />}
          loading={busy}
          disabled={!!disabledReason}
          title={disabledReason}
          variant={variant}
          radius="md"
        >
          {label}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Ce que le fichier contient</Menu.Label>

        <Menu.Item onClick={() => run(false)}>
          <Text size="sm" fw={500}>État des lieux — tout</Text>
          <Text size="xs" c="dimmed">
            Toutes les affectations, y compris celles encore sans note. C’est ce qui rend une
            évaluation manquante visible.
          </Text>
        </Menu.Item>

        <Menu.Item onClick={() => run(true)}>
          <Text size="sm" fw={500}>PV — stages évalués uniquement</Text>
          <Text size="xs" c="dimmed">
            Seules les affectations qui portent un verdict (validé ou non validé).
          </Text>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
