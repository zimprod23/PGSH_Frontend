import { useMemo, useRef } from 'react';
import {
  Alert, Badge, Button, Center, Group, Loader, Paper, Select, Stack, Switch, Text, Title,
} from '@mantine/core';
import { IconAlertTriangle, IconDownload, IconInfoCircle, IconPrinter } from '@tabler/icons-react';
import documentCss from '../components/occupancy/occupancyDocument.css?raw';
import {
  useGetHospitalsQuery,
  useGetOccupancyReportQuery,
  useGetPromotionLevelsQuery,
  useGetStagesQuery,
} from '../api/adminApi';
import { useAcademicYear } from '../contexts/useAcademicYear';
import { useListParams } from '../../../common/hooks/useListParams';
import { OccupancyDocument } from '../components/occupancy/OccupancyDocument';
import { downloadPrintable, printPrintable } from '../../../common/utils/printableDocument';

/**
 * «Charge des services» — every service's year at once, as a document.
 *
 * <p>The service detail page answers « what does <em>this</em> service hold ». Nothing answered
 * « which services are the problem », which is the question asked before publishing a promotion and
 * which opening 148 pages does not answer. Two of its findings exist <b>only</b> at this scale: a
 * service that holds nobody all year (invisible from its own page, where it looks like a service
 * with nothing planned) and a stage that uses two of the five services it is allowed.</p>
 *
 * <p>The page is only a frame — everything under the toolbar is the document that gets downloaded,
 * serialized from the node on screen so the preview and the file cannot differ.</p>
 */

type Filters = {
  hospital: string | null;
  level: string | null;
  stage: string | null;
  saturated: string | null;
};

/** Module-level so its identity is stable — useListParams memoises on it. */
const FILTERS: Filters = { hospital: '', level: '', stage: '', saturated: '' };

export default function OccupancyReportPage() {
  const { currentYearId, currentYear } = useAcademicYear();
  const documentRef = useRef<HTMLDivElement>(null);

  // In the URL so a report somebody is reading survives a refresh and can be sent as a link.
  const { filters, setFilter, setFilters } = useListParams<Filters>(FILTERS);
  const hospital = filters.hospital ?? '';
  const level = filters.level ?? '';
  const stage = filters.stage ?? '';
  const saturated = filters.saturated === '1';

  const { data: hospitals } = useGetHospitalsQuery({ pageNumber: 1, pageSize: 200 });
  const { data: levels = [] } = useGetPromotionLevelsQuery(undefined);
  // Narrowed by the server, not by the rows the client happens to hold: the catalogue is paged at
  // 100 (the query's own ceiling) and a filter applied here would silently miss anything past it.
  const { data: stages } = useGetStagesQuery({
    levelId: level ? Number(level) : undefined,
    pageNumber: 1,
    pageSize: 100,
  });

  const hospitalOptions = useMemo(
    () => (hospitals?.items ?? []).map((h) => ({ value: String(h.id), label: h.name })),
    [hospitals],
  );

  const levelOptions = useMemo(
    () => [...levels]
      .sort((a, b) => a.academicProgram.localeCompare(b.academicProgram) || a.year - b.year)
      .map((l) => ({ value: String(l.id), label: l.label ?? `Année ${l.year}` })),
    [levels],
  );

  const stageOptions = useMemo(
    () => (stages?.items ?? []).map((s) => ({
      value: String(s.id),
      label: s.levelLabel ? `${s.name} — ${s.levelLabel}` : s.name,
    })),
    [stages],
  );

  const { data: report, isFetching, isError, error } = useGetOccupancyReportQuery(
    {
      academicYearId: currentYearId ?? undefined,
      hospitalId: hospital ? Number(hospital) : undefined,
      levelId: level ? Number(level) : undefined,
      stageId: stage ? Number(stage) : undefined,
      onlySaturated: saturated || undefined,
    },
    { skip: !currentYearId },
  );

  const title = `Charge des services hospitaliers — ${report?.academicYearLabel ?? currentYear?.label ?? ''}`;

  const fileName = `charge-services-${report?.academicYearLabel ?? 'annee'}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // The document itself, not the wrapper it is previewed in — the exported file must not carry the
  // page's scaffolding.
  const takeDocument = (action: (node: HTMLElement) => void) => {
    const node = documentRef.current?.querySelector<HTMLElement>('.charge-doc');
    if (node) action(node);
  };

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Charge des services</Title>
        <Text c="dimmed" size="sm">
          Ce que chaque service accueille sur toute l’année, et où la répartition appuie trop fort.
          La fiche d’un service répond pour lui seul&nbsp;; ce rapport répond pour tous à la fois —
          c’est le seul endroit où se voient un service que personne n’utilise et un stage qui
          n’emploie que deux des cinq services autorisés.
        </Text>
      </div>

      <Paper withBorder p="md" radius="md">
        <Group align="flex-end" justify="space-between" wrap="wrap" gap="md">
          <Group align="flex-end" gap="md" wrap="wrap">
            <Stack gap={2}>
              <Text size="sm" fw={500}>Année universitaire</Text>
              <Badge size="lg" variant="light" color="navy">{currentYear?.label ?? '—'}</Badge>
            </Stack>

            <Select
              label="Hôpital"
              placeholder="Tous"
              data={hospitalOptions}
              value={hospital || null}
              onChange={(v) => setFilter('hospital', v ?? '')}
              clearable
              searchable
              w={210}
            />

            <Select
              label="Promotion"
              placeholder="Toutes"
              data={levelOptions}
              value={level || null}
              onChange={(v) => setFilters({ level: v ?? '', stage: '' })}
              clearable
              searchable
              w={200}
            />

            <Select
              label="Stage"
              placeholder="Tous"
              data={stageOptions}
              value={stage || null}
              onChange={(v) => setFilter('stage', v ?? '')}
              clearable
              searchable
              w={230}
            />

            <Switch
              label="Services saturés uniquement"
              checked={saturated}
              onChange={(e) => setFilter('saturated', e.currentTarget.checked ? '1' : '')}
              mb={6}
            />
          </Group>

          <Group gap="sm">
            <Button
              variant="default"
              leftSection={<IconPrinter size={16} />}
              disabled={!report}
              onClick={() => takeDocument((node) => printPrintable(node, title, documentCss))}
            >
              Imprimer / PDF
            </Button>
            <Button
              leftSection={<IconDownload size={16} />}
              disabled={!report}
              onClick={() => takeDocument((node) => downloadPrintable(node, fileName, title, documentCss))}
            >
              Télécharger (.html)
            </Button>
          </Group>
        </Group>

        {/* ⚠ The one thing a reader would otherwise get wrong about the filters, said where the
            filters are. A service is shared: narrowing to a promotion narrows what is *attributed*
            to it, never the load its saturation is measured on — otherwise the report would print
            « ok » for a service that is over because of another promotion, and refuse the publish
            anyway. */}
        {(level || stage) && (
          <Alert mt="md" color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
            <Text size="xs">
              Le filtre choisit les services <strong>listés</strong> et la part qui leur est
              attribuée. Il ne réduit jamais la charge sur laquelle une saturation est mesurée&nbsp;:
              un service est partagé, et le plafond qui refuse une publication compte toutes les
              promotions qui s’y trouvent.
            </Text>
          </Alert>
        )}
      </Paper>

      {!currentYearId ? (
        <Alert color="gray" variant="light">
          Choisissez une année universitaire dans la barre du haut.
        </Alert>
      ) : isError ? (
        <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
          {(error as { data?: { detail?: string } })?.data?.detail
            ?? 'Le rapport n’a pas pu être calculé.'}
        </Alert>
      ) : isFetching && !report ? (
        <Center h={240}><Loader color="navy" /></Center>
      ) : report ? (
        // A grey desk under a white sheet: the preview then reads as the document that will be
        // printed, not as another admin panel. The sheet's own width is capped in the stylesheet,
        // so what is on screen is the shape of the PDF.
        <Paper
          withBorder
          radius="md"
          p={0}
          style={{
            overflow: 'hidden',
            background: 'var(--mantine-color-gray-1)',
            opacity: isFetching ? 0.6 : 1,
            transition: 'opacity 150ms',
          }}
        >
          <div
            ref={documentRef}
            style={{
              background: '#fff',
              maxWidth: 900,
              margin: '18px auto',
              boxShadow: '0 1px 3px rgba(15, 63, 107, 0.10), 0 8px 24px rgba(15, 63, 107, 0.06)',
              borderRadius: 3,
            }}
          >
            <OccupancyDocument report={report} />
          </div>
        </Paper>
      ) : null}
    </Stack>
  );
}
