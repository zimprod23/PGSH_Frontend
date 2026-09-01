import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconDownload, IconPrinter } from '@tabler/icons-react';
import { useGetPromotionLevelsQuery, useGetLevelRepartitionQuery } from '../api/adminApi';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { RepartitionDocument } from '../components/repartition/RepartitionDocument';
import { levelTitle } from '../components/repartition/repartitionLabels';
import { downloadRepartition, printRepartition } from '../components/repartition/buildRepartitionFile';
import { StageRecordExportMenu } from '../components/StageRecordExportMenu';

/**
 * «Répartition annuelle des stages» — the one artefact the faculty actually publishes.
 *
 * The page is only a frame: pick a level, read the document, take it away as a printable PDF or a
 * standalone .html to upload. Everything below the toolbar is the document itself.
 */
export default function RepartitionPage() {
  const { currentYearId, currentYear } = useAcademicYear();
  const [levelId, setLevelId] = useState<string | null>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  const { data: levels = [], isLoading: levelsLoading } = useGetPromotionLevelsQuery(undefined);

  const {
    data: report,
    isFetching,
    isError,
  } = useGetLevelRepartitionQuery(
    { levelId: Number(levelId), academicYearId: currentYearId ?? undefined },
    { skip: !levelId || !currentYearId },
  );

  // Grouped by programme rather than suffixed with it: the levels are already named "Troisième
  // Année Médecine", so "— Medecine" on the end only ate the width the name needed.
  const levelOptions = useMemo(() => {
    const byProgram = new Map<string, { value: string; label: string }[]>();

    for (const level of [...levels].sort((a, b) => a.year - b.year)) {
      const option = {
        value: String(level.id),
        label: level.label?.trim() || levelTitle(level.year, level.academicProgram),
      };
      byProgram.set(level.academicProgram, [
        ...(byProgram.get(level.academicProgram) ?? []),
        option,
      ]);
    }

    return [...byProgram.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, items]) => ({ group, items }));
  }, [levels]);

  const fileName = report
    ? `repartition-${levelTitle(report.levelYear, report.program)}-${report.academicYearLabel}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    : 'repartition';

  const title = report
    ? `${levelTitle(report.levelYear, report.program)} — Répartition annuelle des stages ${report.academicYearLabel}`
    : 'Répartition annuelle des stages';

  const exportable = !!report && report.rows.length > 0;

  // The document itself, not the wrapper it is previewed in — the exported file must not carry the
  // page's scaffolding.
  const takeDocument = (action: (node: HTMLElement) => void) => {
    const node = documentRef.current?.querySelector<HTMLElement>('.repartition-doc');
    if (node) action(node);
  };

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Répartition annuelle des stages</Title>
        <Text c="dimmed" size="sm">
          Le tableau publié pour une promotion : chaque service, période par période, avec les
          numéros de groupe qui s’y trouvent. Planification uniquement — aucune note, aucun résultat.
        </Text>
      </div>

      <Paper withBorder p="md" radius="md">
        <Group align="flex-end" justify="space-between" wrap="wrap" gap="md">
          <Group align="flex-end" gap="md">
            <Select
              label="Niveau"
              placeholder={levelsLoading ? 'Chargement…' : 'Choisir un niveau'}
              data={levelOptions}
              value={levelId}
              onChange={setLevelId}
              searchable
              w={280}
              disabled={levelsLoading}
            />
            <Stack gap={2}>
              <Text size="sm" fw={500}>
                Année universitaire
              </Text>
              <Badge size="lg" variant="light" color="navy">
                {currentYear?.label ?? '—'}
              </Badge>
            </Stack>
            <Text size="xs" c="dimmed" maw={220}>
              L’année se change dans la barre de navigation. Une répartition existe par promotion.
            </Text>
          </Group>

          <Group gap="sm">
            <Button
              variant="default"
              leftSection={<IconPrinter size={16} />}
              disabled={!exportable}
              onClick={() => takeDocument((node) => printRepartition(node, title))}
            >
              Imprimer / PDF
            </Button>
            <Button
              leftSection={<IconDownload size={16} />}
              disabled={!exportable}
              onClick={() => takeDocument((node) => downloadRepartition(node, fileName, title))}
            >
              Télécharger (.html)
            </Button>

            {/* The répartition is the plan; this is the record. Same promotion, same année —
                and it is available before the plan is printable, because a promotion can have
                stages served (imported history, délocalisations) with no grid at all. */}
            <StageRecordExportMenu
              scope={{ levelId: levelId ? Number(levelId) : undefined,
                       academicYearId: currentYearId ?? undefined }}
              disabledReason={
                !levelId ? 'Choisissez une promotion.'
                : !currentYearId ? 'Choisissez une année universitaire dans la barre du haut.'
                : undefined
              }
            />
          </Group>
        </Group>
      </Paper>

      {/* Periods exist, nobody is in them — the state right after applying a cycle d'alternance. It
          used to be indistinguishable from "no periods at all", so the apply looked like it had failed.
          The action differs too, which is why this is its own alert and not a shade of the one below. */}
      {report && report.rows.length === 0 && report.summary.declaredSlotCount > 0 && (
        <Alert
          color="blue"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          title="Périodes définies, aucune répartition"
        >
          Les {report.summary.declaredSlotCount} créneaux de ce niveau sont en place
          {report.columns.length > 0 && ` (${report.columns.length} colonnes)`}, mais aucun groupe n’y a
          encore été affecté. Lancez la répartition automatique depuis la grille de planning du stage,
          ou le plan macro depuis <strong>Groupes → Plan macro</strong>.
        </Alert>
      )}

      {report && report.summary.emptyCells > 0 && (
        <Alert
          color="orange"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          title="Périodes non planifiées"
        >
          {report.summary.emptyCells} case{report.summary.emptyCells > 1 ? 's' : ''} sur{' '}
          {report.summary.rowCount * report.summary.columnCount} n’
          {report.summary.emptyCells > 1 ? 'ont' : 'a'} pas de service affecté. Ces cases
          apparaissent hachurées dans le document — à vérifier avant publication.
        </Alert>
      )}

      {isError && (
        <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
          La répartition n’a pas pu être chargée.
        </Alert>
      )}

      {!levelId ? (
        <Paper withBorder p="xl" radius="md">
          <Text c="dimmed" ta="center">
            Choisissez un niveau pour afficher sa répartition.
          </Text>
        </Paper>
      ) : isFetching ? (
        <Center h={240}>
          <Loader color="navy" />
        </Center>
      ) : report ? (
        <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
          <div ref={documentRef}>
            <RepartitionDocument report={report} />
          </div>
        </Paper>
      ) : null}
    </Stack>
  );
}
