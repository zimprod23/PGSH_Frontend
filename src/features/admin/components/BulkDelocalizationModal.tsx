import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDebouncedValue } from '@mantine/hooks';
import { IconAlertTriangle, IconPlaneDeparture } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import {
  useApplyBulkDelocalizationMutation,
  useGetAcademicGroupOptionsQuery,
  useGetServicesQuery,
  usePreviewBulkDelocalizationMutation,
} from '../api/adminApi';
import type {
  BulkDelocalizationReport,
  BulkDelocalizationRowStatus,
} from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';

const STATUS_META: Record<BulkDelocalizationRowStatus, { color: string; label: string }> = {
  WillDelocalize:   { color: 'teal',   label: 'Sera délocalisé' },
  WillReplace:      { color: 'blue',   label: 'Remplace' },
  WillDropUnderway: { color: 'orange', label: 'Rotation en cours supprimée' },
  AlreadyMarked:    { color: 'red',    label: 'Note enregistrée' },
  NoRoster:         { color: 'red',    label: 'Sans groupe' },
  NoCohort:         { color: 'red',    label: 'Pas de cohorte' },
  NotFound:         { color: 'gray',   label: 'Introuvable' },
  WrongYear:        { color: 'gray',   label: 'Autre année' },
};

const ROWS_PER_PAGE = 25;

/**
 * Records that a set of students serves this stage outside the faculty — the answer to a promotion
 * the CHU cannot absorb.
 *
 * ⚠ **Two steps, and the second one carries the first's number.** The apply sends back
 * `applicableCount` exactly as the preview returned it; a registration created, transferred into a
 * roster or evaluated in between changes what the act does without changing anything on screen, and
 * the server refuses on the mismatch. A checkbox could not catch that, which is why the button
 * cannot be armed without a preview — and why any edit to the selection drops the report.
 */
export function BulkDelocalizationModal({
  opened,
  onClose,
  stageId,
  stageName,
  academicYearId,
  levelId,
}: {
  opened: boolean;
  onClose: () => void;
  stageId: number;
  stageName: string;
  academicYearId: number;
  /**
   * The stage's promotion. ⚠ The roster picker is scoped to it: a stage belongs to one level, so a
   * roster of any other promotion has no cohorte on it — the preview would answer « pas de cohorte »
   * for every one of its students, which is a refusal the admin had to try before learning it was
   * one. Null when the stage carries no level, and then nothing can scope the list.
   */
  levelId: number | null;
}) {
  const notify = useNotify();

  const [groupIds, setGroupIds]           = useState<string[]>([]);
  const [identifiers, setIdentifiers]     = useState('');
  const [service, setService]             = useState<{ value: string; label: string } | null>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [debouncedServiceSearch]          = useDebouncedValue(serviceSearch, 350);
  const [range, setRange]                 = useState<[string | null, string | null]>([null, null]);
  const [reason, setReason]               = useState('');
  const [report, setReport]               = useState<BulkDelocalizationReport | null>(null);
  const [page, setPage]                   = useState(1);

  const [preview, { isLoading: previewing }] = usePreviewBulkDelocalizationMutation();
  const [apply,   { isLoading: applying }]   = useApplyBulkDelocalizationMutation();

  const { data: groups = [] } = useGetAcademicGroupOptionsQuery({
    academicYearId,
    levelId: levelId ?? undefined,
  });

  // An external service is the one this act names, so it is the one offered first — but the search
  // is not restricted to them: a délocalisation towards a service the faculty does run is unusual
  // and legitimate, and hiding the option would make it look forbidden rather than uncommon.
  const { data: servicesPage, isFetching: servicesFetching } = useGetServicesQuery(
    { searchTerm: debouncedServiceSearch || undefined, pageSize: 20 },
    { skip: debouncedServiceSearch.length < 2 },
  );

  const serviceData = useMemo(() => {
    const opts = (servicesPage?.items ?? []).map((s) => ({
      value: String(s.id),
      label: s.isExternal ? `${s.name} — hors faculté` : `${s.name} — ${s.hospitalName}`,
    }));
    if (service && !opts.some((o) => o.value === service.value)) opts.unshift(service);
    return opts;
  }, [servicesPage, service]);

  /**
   * ⚠ `?levelId=` is deliberately **wider** than « rosters of this promotion » server-side: it also
   * matches a level-less roster holding a registration of that level, so that « Non réparti » — one
   * bucket, 4 725 students, no level — stays findable on the screen scolarité assigns from. Here it
   * must not be offered: a roster with no promotion has no cohorte on this stage, so every student in
   * it would come back « pas de cohorte ». Same filter the transfer, the change and the swap apply.
   */
  const groupOptions = useMemo(
    () => groups
      .filter((g) => g.levelId !== null)
      .map((g) => ({ value: String(g.id), label: `${g.label} — ${g.studentCount} étudiant(s)` })),
    [groups],
  );

  const identifierList = useMemo(
    () => identifiers.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean),
    [identifiers],
  );

  const [startDate, endDate] = range;
  const datesOmitted = !startDate && !endDate;
  const datesValid = datesOmitted || (!!startDate && !!endDate && endDate >= startDate);
  const hasTargets = groupIds.length > 0 || identifierList.length > 0;
  const canPreview = !!service && hasTargets && datesValid;

  // Any change to what is being asked invalidates the number the apply would send back.
  const resetReport = () => { setReport(null); setPage(1); };

  const targets = () => ({
    academicGroupIds: groupIds.length ? groupIds.map(Number) : undefined,
    identifiers:      identifierList.length ? identifierList : undefined,
  });

  const dates = () => (datesOmitted ? {} : { startDate: startDate!, endDate: endDate! });

  const handlePreview = async () => {
    if (!canPreview || !service) return;
    try {
      const result = await preview({
        stageId,
        serviceId: Number(service.value),
        academicYearId,
        targets: targets(),
        ...dates(),
      }).unwrap();
      setReport(result);
      setPage(1);
    } catch {
      // errorMiddleware shows the server's sentence — « aucun créneau », typically.
      setReport(null);
    }
  };

  const handleApply = async () => {
    if (!report || !service || !reason.trim()) return;
    try {
      const result = await apply({
        stageId,
        serviceId: Number(service.value),
        academicYearId,
        targets: targets(),
        reason: reason.trim(),
        confirmedCount: report.applicableCount,
        ...dates(),
      }).unwrap();
      notify.success(`${result.applicableCount} étudiant(s) délocalisé(s) vers ${result.serviceName}`);
      setReport(null);
      onClose();
    } catch {
      // A count mismatch lands here, and its sentence names both numbers. Re-previewing is the fix,
      // so the report is dropped rather than left arming a button whose number is now wrong.
      setReport(null);
    }
  };

  const rows = report?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const pageRows = rows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Délocaliser en masse — ${stageName}`}
      radius="lg"
      size="xl"
      transitionProps={{ duration: 0 }}
    >
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          Les étudiants nommés effectuent la totalité de ce stage hors faculté. Leur rotation prévue
          est supprimée, leur stage est clôturé, et la validation revient sur papier — elle se saisit
          ensuite étudiant par étudiant ou par le canevas d’évaluation du stage.
        </Text>

        <Select
          label="Service d’accueil (hors faculté)"
          placeholder="Rechercher un service (min. 2 car.)…"
          data={serviceData}
          value={service?.value ?? null}
          searchable
          searchValue={serviceSearch}
          onSearchChange={setServiceSearch}
          onChange={(val, opt) => { setService(val ? { value: val, label: opt.label } : null); resetReport(); }}
          rightSection={servicesFetching ? <Loader size={14} /> : null}
          nothingFoundMessage={serviceSearch.length < 2 ? 'Tapez pour rechercher…' : 'Aucun service'}
          required
        />

        <MultiSelect
          label="Groupes concernés"
          description="Les groupes de la promotion de ce stage, et eux seuls."
          placeholder={groupIds.length ? undefined : 'Choisir un ou plusieurs groupes'}
          data={groupOptions}
          value={groupIds}
          onChange={(v) => { setGroupIds(v); resetReport(); }}
          searchable
          clearable
        />

        <Textarea
          label="Étudiants nommés (CNE ou Apogée)"
          description="Un par ligne, ou séparés par des virgules — la liste collée depuis le formulaire."
          placeholder="R130896&#10;AP2200A"
          value={identifiers}
          onChange={(e) => { const v = e.currentTarget.value; setIdentifiers(v); resetReport(); }}
          minRows={2}
          maxRows={6}
          autosize
        />

        <DatePickerInput
          type="range"
          label="Période enregistrée (facultatif)"
          description="Laissez vide pour reprendre les dates officielles du stage pour cette promotion."
          placeholder="Dates du stage"
          value={range}
          onChange={(v) => { setRange(v); resetReport(); }}
          allowSingleDateInRange
          numberOfColumns={2}
          clearable
          popoverProps={{ withinPortal: true }}
        />

        <Group>
          <Button
            variant="light"
            color="navy"
            loading={previewing}
            disabled={!canPreview}
            onClick={handlePreview}
          >
            Aperçu
          </Button>
          {!hasTargets && (
            <Text size="xs" c="dimmed">Choisissez au moins un groupe ou collez une liste.</Text>
          )}
        </Group>

        {report && (
          <>
            <Divider />

            {/* ⚠ Every count comes from the server and is measured before the row cap. A number
                counted from the rows on screen would read low the moment a promotion is selected. */}
            <Card withBorder radius="md" padding="sm">
              <Group gap="lg" wrap="wrap">
                <Stat label="Seront délocalisés" value={report.applicableCount} color="teal" />
                <Stat label="Refusés" value={report.refusedCount} color={report.refusedCount ? 'red' : 'gray'} />
                <Stat label="Rotations en cours supprimées" value={report.underwayCount} color={report.underwayCount ? 'orange' : 'gray'} />
                <Stat label="Déjà délocalisés (remplacés)" value={report.replacedCount} color="blue" />
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                {report.serviceName} · {report.academicYearLabel} · du {report.startDate} au {report.endDate}
              </Text>
            </Card>

            {report.isEmpty && (
              <Alert color="gray" variant="light">
                <Text size="sm">
                  Cette sélection ne désigne aucun étudiant. Vérifiez que les groupes appartiennent bien
                  à {report.academicYearLabel} et que les identifiants collés sont ceux de cette année.
                </Text>
              </Alert>
            )}

            {report.underwayCount > 0 && (
              <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />}>
                <Text size="sm">
                  {report.underwayCount} étudiant(s) ont une rotation déjà commencée&nbsp;: elle sera
                  supprimée. Les notes déjà saisies, elles, ne peuvent pas l’être — ces étudiants sont
                  refusés et listés ci-dessous.
                </Text>
              </Alert>
            )}

            {rows.length > 0 && (
              <>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Étudiant</Table.Th>
                      <Table.Th>Groupe</Table.Th>
                      <Table.Th>Identifiant</Table.Th>
                      <Table.Th>État</Table.Th>
                      <Table.Th>Détail</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {pageRows.map((r, i) => (
                      <Table.Tr key={r.registrationId ?? `${r.sourceIdentifier}-${i}`}>
                        <Table.Td><Text size="sm">{r.studentName}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{r.groupLabel ?? '—'}</Text></Table.Td>
                        <Table.Td>
                          <Text size="xs" ff="monospace" c="dimmed">
                            {r.cne ?? r.appogee ?? r.sourceIdentifier ?? '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="sm" variant="light" radius="xl" color={STATUS_META[r.status].color}>
                            {STATUS_META[r.status].label}
                          </Badge>
                        </Table.Td>
                        <Table.Td><Text size="xs" c="dimmed">{r.message}</Text></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>

                <Group justify="space-between">
                  {/* Says what the list is not showing. A capped list's last page looks exactly
                      like a complete one, and the refusals are the rows kept. */}
                  <Text size="xs" c="dimmed">
                    {rows.length} ligne(s) affichée(s)
                    {report.rowsTruncated && ` sur ${report.totalRowCount} — les refus sont tous listés`}
                  </Text>
                  {totalPages > 1 && (
                    <Pagination value={page} onChange={setPage} total={totalPages} size="sm" radius="md" />
                  )}
                </Group>
              </>
            )}

            <Textarea
              label="Motif de la délocalisation"
              placeholder="Saturation des services — accueil à Kénitra…"
              value={reason}
              onChange={(e) => { const v = e.currentTarget.value; setReason(v); }}
              minRows={2}
              autosize
              required
            />
          </>
        )}

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>Fermer</Button>
          <Button
            color="teal"
            loading={applying}
            disabled={!report || report.applicableCount === 0 || !reason.trim()}
            leftSection={<IconPlaneDeparture size={16} stroke={1.5} />}
            onClick={handleApply}
          >
            {report ? `Délocaliser ${report.applicableCount} étudiant(s)` : 'Délocaliser'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Stack gap={0}>
      <Title order={3} c={value > 0 ? color : 'dimmed'}>{value}</Title>
      <Text size="xs" c="dimmed">{label}</Text>
    </Stack>
  );
}
