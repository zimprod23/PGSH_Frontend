import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  List,
  Modal,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconPencil,
  IconSchool,
  IconTrash,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import {
  useGetPromotionLevelsQuery,
  useGetPromotionPausesQuery,
  usePreviewPromotionPauseMutation,
  useDeclarePromotionPauseMutation,
  useCorrectPromotionPauseMutation,
  useRevokePromotionPauseMutation,
} from '../api/adminApi';
import type { PauseKind, PromotionPause, PromotionPauseImpact } from '../types/admin.types';
import { useAcademicYear } from '../contexts/useAcademicYear';
import { useNotify } from '../../../common/hooks/useNotify';
import { ConfirmModal } from '../../../common/components/ConfirmModal';

const KIND_LABEL: Record<PauseKind, string> = {
  Exam: 'Examens',
  Holiday: 'Vacances',
  Other: 'Autre',
};

const KIND_COLOR: Record<PauseKind, string> = {
  Exam: 'grape',
  Holiday: 'teal',
  Other: 'gray',
};

interface FormState {
  id: number | null;
  levelId: string | null;
  range: [string | null, string | null];
  kind: PauseKind;
  reason: string;
  isConfirmed: boolean;
}

const EMPTY: FormState = {
  id: null,
  levelId: null,
  range: [null, null],
  kind: 'Exam',
  reason: '',
  isConfirmed: true,
};

const fr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');

/**
 * « Suspension d'examens » — a window during which **one promotion** is out of its services.
 *
 * Lives on the calendar screen and not on a stage page, because that is what it is: a second, narrower
 * calendar. Two promotions rotate through the same services on the same morning and only one of them is
 * sitting an exam, so the unit of the act is (année, niveau) — never the faculty, never a stage.
 *
 * ⚠ **Declaring one moves no date by itself, and the panel says so rather than implying otherwise.**
 * The window joins that promotion's working-day calendar; the axis laid afterwards steps over it on its
 * own, in jours ouvrables. Declared *after* a grid is laid, it leaves the créneaux where they are and
 * the preview counts exactly what they lose.
 *
 * ⚠ **And it never prescribes « reposez l'axe », because that button refuses once anything has been
 * published from the grid** — measured on the live base, where the 3ᵉ MED holds 1 000 published cells.
 * The impact report carries `publishedCellsInGrid` and the server's warning branches on it.
 *
 * ⚠ **But « refusé » is not « rien à faire », and showing only the first number said it was.** A
 * published promotion is repaired by moving the crossed columns one at a time, so `slotsMovable` — how
 * many of them that act would accept — sits beside `publishedCellsInGrid` and neither is rendered alone.
 * Every sentence here comes from the server: the four-way split of what a rotation permits is one rule,
 * and writing it again in TypeScript is two sides of a network boundary with nothing able to catch them
 * disagreeing.
 */
export function PromotionPausesPanel() {
  const notify = useNotify();
  const { currentYearId } = useAcademicYear();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<PromotionPause | null>(null);
  const [impact, setImpact] = useState<PromotionPauseImpact | null>(null);

  // ⚠ Which impact request is still the current one. The auto-preview below is fired from openEdit and
  // resolves over the network, while the effect that clears `impact` fires on every keystroke: without
  // this, a slow answer for the window the user opened lands *after* they have edited the dates, and
  // the screen then shows one window's numbers beside another's — the one thing this panel must not do.
  const impactRequest = useRef(0);

  // ⚠ Promotion levels, not every level: « Retrait » is a withdrawal marker the import kept as a level
  // and it sits no exams. The server refuses it either way; offering it would only make the refusal a
  // surprise.
  const { data: levels } = useGetPromotionLevelsQuery(undefined);

  // The year is part of the cache key, or changing it in the navbar shows the previous year's windows.
  const { data: page, isFetching } = useGetPromotionPausesQuery(
    { academicYearId: currentYearId ?? undefined, pageSize: 100 },
    { skip: currentYearId == null },
  );

  const [preview, { isLoading: previewing }] = usePreviewPromotionPauseMutation();
  const [declare, { isLoading: declaring }] = useDeclarePromotionPauseMutation();
  const [correct, { isLoading: correcting }] = useCorrectPromotionPauseMutation();
  const [revoke] = useRevokePromotionPauseMutation();

  const [from, to] = form.range;
  const canSubmit =
    form.levelId != null && from != null && to != null && form.reason.trim().length > 0;

  // A preview describes the window in the form; the moment any of it changes, the numbers on screen are
  // about something else. Clearing beats showing a stale count beside new dates.
  useEffect(() => { setImpact(null); }, [form.levelId, form.range, form.reason]);

  const openCreate = () => {
    impactRequest.current++;
    setForm(EMPTY);
    setImpact(null);
    setModalOpen(true);
  };

  // ⚠ Opening a window that is already in force used to clear the impact and show nothing — the same
  // blank as a fresh form, for the opposite situation. A declared window has consequences and this is
  // where they are read, so the report is fetched rather than waited for.
  //
  // ⚠ The `useEffect` above clears `impact` whenever the form changes, and setting the form here *is*
  // a change: the fetch is therefore started after it, and its result lands last. Clearing first is
  // what keeps the previous window's numbers off this one's screen while it loads.
  const openEdit = (pause: PromotionPause) => {
    setForm({
      id: pause.id,
      levelId: String(pause.levelId),
      range: [pause.startDate.slice(0, 10), pause.endDate.slice(0, 10)],
      kind: pause.kind,
      reason: pause.reason,
      isConfirmed: pause.isConfirmed,
    });
    setImpact(null);
    setModalOpen(true);

    const token = ++impactRequest.current;

    void preview({
      levelId: pause.levelId,
      startDate: pause.startDate.slice(0, 10),
      endDate: pause.endDate.slice(0, 10),
      kind: pause.kind,
      reason: pause.reason,
      isConfirmed: pause.isConfirmed,
      academicYearId: currentYearId ?? undefined,
      excludingPauseId: pause.id,
    })
      .unwrap()
      .then((report) => { if (token === impactRequest.current) setImpact(report); })
      .catch(() => { /* toasted by errorMiddleware */ });
  };

  const body = () => ({
    levelId: Number(form.levelId),
    startDate: from!,
    endDate: to!,
    kind: form.kind,
    reason: form.reason.trim(),
    isConfirmed: form.isConfirmed,
    academicYearId: currentYearId ?? undefined,
  });

  const handlePreview = async () => {
    if (!canSubmit) return;
    impactRequest.current++;
    try {
      // ⚠ The window being corrected is left out, or the impact is measured against a calendar that
      // already contains it — and every window then costs zero worked days.
      setImpact(await preview({
        ...body(),
        excludingPauseId: form.id ?? undefined,
      }).unwrap());
    } catch {
      /* toasted by errorMiddleware */
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      if (form.id == null) {
        const res = await declare(body()).unwrap();
        notify.success(
          `Suspension enregistrée du ${fr(res.startDate)} au ${fr(res.endDate)} — `
          + `${res.workingDaysLost} jour(s) ouvrable(s).`,
        );

        // Said only when there is something to say: the créneaux keep their dates, so the days come out
        // of the stage rather than off the end of the column.
        if (res.slotsSpanning > 0)
          notify.info(
            `${res.slotsSpanning} créneau(x) traversent cette fenêtre et gardent leurs dates`
            + (res.periodsUnderway > 0
              ? `, dont ${res.periodsUnderway} rotation(s) en cours`
              : '')
            + '. Lancez l\'aperçu pour savoir si l\'axe peut encore être reposé.',
          );
      } else {
        const res = await correct({
          id: form.id,
          startDate: from!,
          endDate: to!,
          kind: form.kind,
          reason: form.reason.trim(),
          isConfirmed: form.isConfirmed,
        }).unwrap();

        notify.success(`« ${res.reason} » mis à jour.`);

        if (res.datesMoved && res.slotsSpanning > 0)
          notify.info(
            `Les dates ont changé : ${res.slotsSpanning} créneau(x) couvrent l'ancienne ou la `
            + 'nouvelle période, et gardent leurs dates.',
          );
      }
      setModalOpen(false);
    } catch {
      /* toasted */
    }
  };

  const handleRevoke = async () => {
    if (!pendingRevoke) return;
    try {
      const res = await revoke(pendingRevoke.id).unwrap();
      notify.success(`« ${res.reason} » retirée du calendrier de la promotion.`);

      if (res.hadBegun)
        notify.info(
          'La fenêtre avait déjà commencé. Le retrait est prospectif : rien n\'est rattrapé, '
          + 'les créneaux et les rotations gardent ce qui a eu lieu — ce sont les décomptes à venir '
          + 'qui changent.',
        );
    } catch {
      /* toasted */
    } finally {
      setPendingRevoke(null);
    }
  };

  const pauses = page?.items ?? [];

  return (
    <>
      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Group gap="sm">
              <ThemeIcon size={38} radius="md" variant="light" color="grape">
                <IconSchool size={20} stroke={1.5} />
              </ThemeIcon>
              <Stack gap={0}>
                <Title order={4}>Suspensions de promotion</Title>
                <Text size="sm" c="dimmed">
                  Une semaine d'examens appartient à une promotion, pas à un stage
                </Text>
              </Stack>
            </Group>
            <Button
              radius="md"
              color="grape"
              onClick={openCreate}
              disabled={currentYearId == null}
            >
              Déclarer une suspension
            </Button>
          </Group>

          <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />} radius="md">
            Une suspension est un <b>fait de calendrier</b>, pas un décalage de dates : elle rejoint le
            calendrier de cette promotion, et l'axe posé ensuite l'enjambe de lui-même, en jours
            ouvrables. Déclarez-la donc <b>avant</b> de poser l'axe. Déclarée après, elle ne déplace
            rien — l'aperçu dit exactement ce que chaque colonne y perd, et si l'axe est <b>déjà
            publié</b> il ne peut plus être reposé : les jours sont perdus.
          </Alert>

          <Divider />

          <Group justify="space-between">
            <Text fw={600} size="sm">{pauses.length} fenêtre(s) déclarée(s)</Text>
            {isFetching && <Text size="xs" c="dimmed">Actualisation…</Text>}
          </Group>

          {pauses.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="lg">
              Aucune promotion n'a déclaré de fenêtre cette année. Déclarez-la <b>avant</b> de poser
              l'axe : les colonnes l'enjamberont sans avoir à être reposées.
            </Text>
          ) : (
            <ScrollArea>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Promotion</Table.Th>
                    <Table.Th>Dates</Table.Th>
                    <Table.Th>Motif</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Jours</Table.Th>
                    <Table.Th>Ouvrables perdus</Table.Th>
                    <Table.Th>Ce qu'elle coupe</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {pauses.map((p) => (
                    <Table.Tr key={p.id}>
                      <Table.Td><Text size="sm" fw={500}>{p.levelLabel}</Text></Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {p.startDate === p.endDate
                            ? fr(p.startDate)
                            : `${fr(p.startDate)} → ${fr(p.endDate)}`}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6}>
                          <Text size="sm">{p.reason}</Text>
                          {/* ⚠ Only the rare state is drawn (§1k): every window is confirmed by
                              default, so a badge on each one would bury the handful that can move. */}
                          {!p.isConfirmed && (
                            <Tooltip label="Dates encore provisoires — la fenêtre compte, mais peut bouger">
                              <Badge size="xs" variant="light" color="orange" style={{ cursor: 'help' }}>
                                provisoire
                              </Badge>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={KIND_COLOR[p.kind]}>{KIND_LABEL[p.kind]}</Badge>
                      </Table.Td>
                      <Table.Td>{p.dayCount}</Table.Td>
                      <Table.Td>
                        {/* Zero means the window fell on a weekend or on days already férié: it is
                            real and it costs no day of stage. */}
                        <Badge variant="light" color={p.workingDaysLost === 0 ? 'gray' : 'grape'}>
                          {p.workingDaysLost}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {/* ⚠ Ce qu'une fenêtre *coûte* et ce qu'elle *coupe* sont deux faits, et la
                            ligne ne portait que le premier : « 29 ouvrables perdus » seul se lit comme
                            une note comptable. Et zéro est ici la **bonne** nouvelle — déclarée avant
                            que l'axe soit posé, une fenêtre ne traverse rien parce que l'axe l'enjambe.
                            Les deux états ne doivent donc pas se ressembler. */}
                        {p.slotsSpanning === 0 ? (
                          <Tooltip label="Aucune colonne posée sur cette fenêtre — c'est ce que « déclarée à temps » donne">
                            <Badge size="sm" variant="light" color="teal" style={{ cursor: 'help' }}>
                              rien
                            </Badge>
                          </Tooltip>
                        ) : (
                          <Tooltip
                            label={`${p.slotsSpanning} colonne(s) et ${p.periodsSpanning} rotation(s) traversent cette fenêtre. Déclarer ne déplace rien : ces jours sont perdus tant que les colonnes ne sont pas déplacées.`}
                          >
                            <Badge size="sm" variant="light" color="orange" style={{ cursor: 'help' }}>
                              {p.slotsSpanning} col. · {p.periodsSpanning} rot.
                            </Badge>
                          </Tooltip>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="flex-end">
                          <ActionIcon variant="subtle" onClick={() => openEdit(p)}>
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon variant="subtle" color="red" onClick={() => setPendingRevoke(p)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Stack>
      </Card>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id == null ? 'Déclarer une suspension' : 'Corriger la suspension'}
        radius="md"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Select
            label="Promotion"
            placeholder="3ème année Médecine"
            description={
              form.id == null
                ? undefined
                : 'La promotion ne se change pas : une fenêtre appartient à celle qui l\'a déclarée.'
            }
            data={(levels ?? []).map((l) => ({ value: String(l.id), label: l.label ?? `Niveau ${l.id}` }))}
            value={form.levelId}
            onChange={(v) => setForm((p) => ({ ...p, levelId: v }))}
            disabled={form.id != null}
            searchable
            radius="md"
            required
          />

          <DatePickerInput
            type="range"
            label="Fenêtre"
            description="Bornes incluses — une seule journée : cliquez deux fois sur la même date"
            placeholder="Début → fin"
            value={form.range}
            onChange={(v) => setForm((p) => ({ ...p, range: v as [string | null, string | null] }))}
            radius="md"
            required
          />

          <Textarea
            label="Motif"
            placeholder="Examens du premier semestre"
            description="Cette fenêtre déplace ce contre quoi chaque stage de la promotion est mesuré : dites laquelle et pourquoi."
            value={form.reason}
            /* ⚠ La valeur est lue avant l'updater (§1l) : React remet `currentTarget` à `null` une
               fois l'événement propagé, et un updater fonctionnel s'exécute au rendu suivant. */
            onChange={(e) => { const v = e.currentTarget.value; setForm((p) => ({ ...p, reason: v })); }}
            autosize
            minRows={2}
            radius="md"
            required
          />

          <Select
            label="Type"
            data={(['Exam', 'Holiday', 'Other'] as PauseKind[]).map((k) => ({
              value: k,
              label: KIND_LABEL[k],
            }))}
            value={form.kind}
            onChange={(v) => setForm((p) => ({ ...p, kind: (v as PauseKind) ?? 'Exam' }))}
            radius="md"
            allowDeselect={false}
          />

          <Checkbox
            label="Dates confirmées"
            description="Décochez tant que la date n'est pas arrêtée — la fenêtre est comptée quand même, mais signalée comme susceptible de bouger."
            checked={form.isConfirmed}
            onChange={(e) => { const v = e.currentTarget.checked; setForm((p) => ({ ...p, isConfirmed: v })); }}
          />

          {impact && <ImpactReport impact={impact} />}

          <Group justify="space-between">
            <Button
              variant="light"
              color="grape"
              onClick={handlePreview}
              loading={previewing}
              disabled={!canSubmit}
            >
              Aperçu
            </Button>
            <Group>
              <Button variant="subtle" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button
                color="grape"
                onClick={handleSubmit}
                loading={declaring || correcting}
                disabled={!canSubmit}
              >
                {form.id == null ? 'Déclarer' : 'Enregistrer'}
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      <ConfirmModal
        opened={pendingRevoke != null}
        onClose={() => setPendingRevoke(null)}
        onConfirm={handleRevoke}
        title="Retirer cette suspension ?"
        message={
          `« ${pendingRevoke?.reason ?? ''} » (${pendingRevoke?.levelLabel ?? ''}) ne comptera plus `
          + 'comme fenêtre non ouvrable. Le retrait est prospectif : les créneaux déjà datés et les '
          + 'rotations déjà servies gardent ce qui a eu lieu, seuls les décomptes à venir changent.'
        }
        confirmLabel="Retirer"
      />
    </>
  );
}

/**
 * What the window costs the plan already laid.
 *
 * ⚠ Bounded by construction: the rows are créneaux and stages — one per stage per column, tens of them
 * — while cohortes, rotations and students are **counted**. A panel that listed one row per student is
 * the shape that put 4 725 of them in a single response (§1b).
 */
function ImpactReport({ impact }: { impact: PromotionPauseImpact }) {
  return (
    <Card withBorder radius="md" padding="md" bg="var(--mantine-color-gray-0)">
      <Stack gap="sm">
        <Text fw={600} size="sm">
          {impact.levelLabel} — {fr(impact.startDate)} → {fr(impact.endDate)}
        </Text>

        <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="xs">
          {[
            { label: 'Ouvrables perdus', value: impact.workingDaysLost, color: 'grape' },
            { label: 'Créneaux traversés', value: impact.slotsSpanning, color: 'navy' },
            {
              label: 'Rotations en cours',
              value: impact.periodsUnderway,
              color: impact.periodsUnderway > 0 ? 'orange' : 'dimmed',
            },
            { label: 'Étudiants concernés', value: impact.studentsAffected, color: 'dimmed' },
            // ⚠ « Cellules publiées » says the axis cannot be re-laid; on its own it reads as « rien à
            // faire ». « Déplaçables » is the half that says what can still be done, so the two sit
            // side by side and neither is shown alone.
            {
              label: 'Cellules publiées',
              value: impact.publishedCellsInGrid,
              color: impact.publishedCellsInGrid > 0 ? 'red' : 'dimmed',
            },
            {
              label: 'Créneaux déplaçables',
              value: `${impact.slotsMovable} / ${impact.slotsSpanning}`,
              color: impact.slotsSpanning === 0 ? 'dimmed'
                : impact.slotsMovable === 0 ? 'red'
                  : impact.slotsMovable === impact.slotsSpanning ? 'teal' : 'orange',
            },
          ].map(({ label, value, color }) => (
            <Stack key={label} gap={0}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
              <Text size="lg" fw={700} c={color === 'dimmed' ? 'dimmed' : color}>{value}</Text>
            </Stack>
          ))}
        </SimpleGrid>

        {impact.warnings.length > 0 && (
          <Alert variant="light" color="orange" icon={<IconAlertTriangle size={16} />} radius="md">
            <List size="sm" spacing={4}>
              {impact.warnings.map((w) => <List.Item key={w}>{w}</List.Item>)}
            </List>
          </Alert>
        )}

        {impact.stages.length > 0 && (
          <ScrollArea.Autosize mah={220}>
            <Table withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Stage</Table.Th>
                  <Table.Th>Colonnes</Table.Th>
                  <Table.Th>Ouvrables perdus</Table.Th>
                  <Table.Th>Restant / colonne</Table.Th>
                  <Table.Th>Durée annoncée</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {impact.stages.map((s) => (
                  <Table.Tr key={s.stageId}>
                    <Table.Td><Text size="sm">{s.name}</Text></Table.Td>
                    <Table.Td>{s.slotsSpanning}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={s.workingDaysLost === 0 ? 'gray' : 'orange'}>
                        {s.workingDaysLost}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {s.minWorkingDaysAfter === s.maxWorkingDaysAfter
                        ? s.minWorkingDaysAfter
                        : `${s.minWorkingDaysAfter} – ${s.maxWorkingDaysAfter}`}
                    </Table.Td>
                    {/* ⚠ Reported beside the measured figures, never compared to them: which column is
                        authoritative on a stage's duration is still open. */}
                    <Table.Td><Text size="sm" c="dimmed">{s.statedDurationInDays}</Text></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        )}

        {impact.slotsTruncated && (
          <Text size="xs" c="dimmed">
            Le détail par créneau est tronqué ; les {impact.slotsSpanning} créneaux comptés ci-dessus
            sont le total réel.
          </Text>
        )}
      </Stack>
    </Card>
  );
}
