import { useState } from 'react';
import {
  Alert, Badge, Button, Divider, Group, Loader, Modal, NumberInput,
  Select, Stack, Text, TextInput, Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle, IconRefresh } from '@tabler/icons-react';
import {
  useGetRevalidationContextQuery,
  useRevalidateStageMutation,
  useGetStagesQuery,
} from '../api/adminApi';
import { useNotify } from '../../../common/hooks/useNotify';

interface Props {
  opened: boolean;
  onClose: () => void;
  /** The registration the student holds NOW — the retake hangs off this one, never off the failed year. */
  registrationId: string;
  levelLabel: string | null;
}

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR') : '—';

/**
 * Re-open a stage the student failed under an earlier registration.
 *
 * The act existed on the API from the start and had **no caller anywhere in this app**: it was
 * reachable only through Scalar, by somebody holding a registration id, a stage id and a cohort id.
 * This is that door.
 *
 * ⚠ The dialog proposes a window from the duration **the student's own text** states, never from the
 * catalogue. MED3 Chirurgie reads 30 jours ouvrables in the catalogue since it was aligned on arrêté
 * 1650.25; the students still owing it are governed by 2174.18, which states 66, and the one such
 * window on record ran 65. A revalidation is by construction a student on an older text, so the
 * catalogue is wrong for exactly the population that reaches this screen. Both numbers are shown —
 * the point is to make the disagreement visible, not to pick a winner silently.
 *
 * Eligibility is the server's: `canOpen` comes from the same rules the command applies, so the
 * dialog cannot offer an act that would then be refused.
 */
export function RevalidateStageModal({ opened, onClose, registrationId, levelLabel }: Props) {
  const notify = useNotify();
  const [stageId, setStageId] = useState<string | null>(null);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [place, setPlace] = useState(true);

  // The dates are DERIVED from the proposal, with an override for what the operator types. Synced
  // into state by an effect instead, they would keep the previous stage's window for one render
  // after the stage changes — and the window is the whole point of this dialog.
  const [startOverride, setStartOverride] = useState<string | null>(null);
  const [endOverride,   setEndOverride]   = useState<string | null>(null);

  // pageSize 100 is the server's own ceiling (GetStagesQueryValidator caps it there); 200 is a 400,
  // and a rejected lookup shows up only as a select that will not open. The catalogue holds 33
  // stages and grows by a handful per arrêté, so one page covers it — if it ever stops covering it,
  // this needs a server-side search, not a bigger page.
  const { data: stages } = useGetStagesQuery(
    { pageNumber: 1, pageSize: 100 },
    { skip: !opened },
  );

  const { data: ctx, isFetching } = useGetRevalidationContextQuery(
    { registrationId, stageId: Number(stageId) },
    { skip: !opened || !stageId },
  );

  const [revalidate, { isLoading: saving }] = useRevalidateStageMutation();

  const start = startOverride ?? ctx?.proposedWindow?.start ?? '';
  const end   = endOverride   ?? ctx?.proposedWindow?.end   ?? '';

  const pickStage = (value: string | null) => {
    setStageId(value);
    // A window typed for one stage means nothing for the next: fall back to that stage's proposal.
    setStartOverride(null);
    setEndOverride(null);
    setCohortId(null);
  };

  const close = () => {
    setStageId(null); setCohortId(null); setServiceId('');
    setStartOverride(null); setEndOverride(null); setReason(''); setPlace(true);
    onClose();
  };

  const submit = async () => {
    if (!stageId) return;
    try {
      await revalidate({
        registrationId,
        stageId: Number(stageId),
        cohortId: cohortId ? Number(cohortId) : undefined,
        serviceId: serviceId === '' ? undefined : Number(serviceId),
        startDate: place && start ? start : undefined,
        endDate: place && end ? end : undefined,
        reason: reason.trim() || undefined,
      }).unwrap();
      notify.success('Stage rouvert en revalidation.');
      close();
    } catch {
      // Deliberately silent: errorMiddleware already toasts every rejected mutation in the server's
      // own words (frontend CLAUDE.md §1e). The catch is control flow — keep the dialog open on the
      // values the operator entered — not a second message.
    }
  };

  // Pre-flight (frontend CLAUDE.md §1): placement is all-or-nothing server-side, so a half-filled
  // window can only be refused. Disable and say why rather than spend the round-trip.
  const placementIncomplete = place && (!start || !end);
  // No cohorte named and none to fall back on: the command answers NoGroupForRevalidation. Caught
  // in the browser — the button was offered on exactly the student this dialog exists for.
  const cohorteMissing = !!ctx && !cohortId && ctx.fallbackCohortId == null;
  const blocked = !ctx?.canOpen || placementIncomplete || cohorteMissing;

  const text = ctx?.governingText;
  const disagrees =
    text?.durationInDays != null && text.durationInDays !== ctx?.catalogueDurationInDays;

  return (
    <Modal
      opened={opened}
      onClose={close}
      title="Revalider un stage"
      radius="lg"
      size="lg"
    >
      <Stack gap="sm">
        <Text size="xs" c="dimmed">
          Rouvre un stage échoué sous une inscription antérieure, sur l'inscription que l'étudiant
          détient aujourd'hui{levelLabel ? ` (${levelLabel})` : ''}. La tentative échouée reste
          l'historique&nbsp;: elle n'est pas modifiée.
        </Text>

        <Select
          label="Stage à revalider"
          placeholder="Choisir un stage…"
          searchable
          value={stageId}
          onChange={pickStage}
          data={(stages?.items ?? []).map((s) => ({
            value: String(s.id),
            label: `${s.name}${s.levelLabel ? ` — ${s.levelLabel}` : ''}`,
          }))}
          radius="md"
        />

        {isFetching && <Group gap="xs"><Loader size="xs" /><Text size="xs" c="dimmed">Lecture…</Text></Group>}

        {ctx && !ctx.canOpen && (
          <Alert color="red" radius="md" icon={<IconAlertTriangle size={16} />}>
            {ctx.refusalMessage ?? 'Ce stage ne peut pas être rouvert.'}
          </Alert>
        )}

        {ctx?.canOpen && (
          <>
            <Divider label="Ce que dit son texte" labelPosition="left" />

            {text ? (
              <Group gap="xs" wrap="wrap">
                <Badge variant="light" color="navy" radius="sm">{text.code}</Badge>
                <Tooltip
                  withArrow
                  multiline
                  w={280}
                  label={text.fromRegistration
                    ? "Lu sur l'inscription elle-même : ce qu'il devait cette année-là ne bouge pas quand son texte actuel change."
                    : "Aucun texte n'est figé sur cette inscription ; c'est le texte courant de l'étudiant qui répond."}
                >
                  <Badge variant="outline" color="gray" radius="sm" style={{ cursor: 'help' }}>
                    {text.fromRegistration ? 'inscription' : 'étudiant'}
                  </Badge>
                </Tooltip>
                {text.statesThisStage ? (
                  <Text size="sm">
                    <b>{text.durationInDays} j.o.</b>
                    {text.coefficient != null && <> · coefficient <b>{text.coefficient}</b></>}
                  </Text>
                ) : (
                  <Text size="sm" c="dimmed">ce texte n'énonce rien pour ce stage</Text>
                )}
              </Group>
            ) : (
              <Text size="sm" c="dimmed">
                Aucun texte résolu pour cette inscription — « jamais résolu », et non « ne doit rien ».
              </Text>
            )}

            {disagrees && (
              <Alert color="orange" radius="md" icon={<IconInfoCircle size={16} />}>
                Le catalogue annonce <b>{ctx.catalogueDurationInDays} j.o.</b> pour ce stage, son
                texte <b>{text!.durationInDays} j.o.</b> Aucune des deux valeurs n'est fausse&nbsp;:
                la fenêtre proposée suit <b>son texte</b>, qui est celui qui le régit.
              </Alert>
            )}

            {ctx.lastFailure && (
              <Text size="xs" c="dimmed">
                Échec en {ctx.lastFailure.academicYearLabel}
                {ctx.lastFailure.serviceName && <> · {ctx.lastFailure.serviceName}</>}
                {' · '}{fmt(ctx.lastFailure.startDate)} → {fmt(ctx.lastFailure.endDate)}
                {ctx.lastFailure.workingDaysServed != null &&
                  <> · <b>{ctx.lastFailure.workingDaysServed} j.o. réellement servis</b></>}
              </Text>
            )}

            <Divider label="Placement" labelPosition="left" />

            <Select
              label="Placer maintenant ?"
              value={place ? 'now' : 'later'}
              onChange={(v) => setPlace(v === 'now')}
              data={[
                { value: 'now',   label: 'Oui — créer la période tout de suite' },
                { value: 'later', label: 'Non — créer l’affectation, planifier plus tard' },
              ]}
              radius="md"
            />

            {place && (
              <>
                <Group grow>
                  <TextInput
                    label="Début" type="date" radius="md"
                    value={start} onChange={(e) => setStartOverride(e.currentTarget.value)}
                  />
                  <TextInput
                    label="Fin" type="date" radius="md"
                    value={end} onChange={(e) => setEndOverride(e.currentTarget.value)}
                  />
                </Group>

                {ctx.proposedWindow ? (
                  <Text size="xs" c="dimmed">
                    Proposé&nbsp;: {ctx.proposedWindow.workingDays} jours ouvrables
                    ({ctx.proposedWindow.calendarDays} jours calendaires)
                    {ctx.proposedWindow.holidaysHit.length > 0 &&
                      <> · fériés traversés&nbsp;: {ctx.proposedWindow.holidaysHit.join(', ')}</>}
                    {ctx.proposedWindow.hasProvisionalDates &&
                      <> · ⚠ une date lunaire de cette fenêtre est encore une estimation</>}
                  </Text>
                ) : (
                  <Text size="xs" c="dimmed">
                    Aucune fenêtre proposée&nbsp;: son texte n'énonce pas de durée pour ce stage.
                    Rien n'est déduit du catalogue — ce serait une valeur qu'aucun texte n'affirme.
                  </Text>
                )}

                <NumberInput
                  label="Service (facultatif)"
                  description={ctx.lastFailure?.serviceName
                    ? `Laissé vide, il est renvoyé dans ${ctx.lastFailure.serviceName}, là où il a échoué.`
                    : 'Laissé vide, le service de la tentative échouée est repris.'}
                  value={serviceId}
                  onChange={(v) => setServiceId(v === '' ? '' : Number(v))}
                  min={1}
                  radius="md"
                />
              </>
            )}

            <Select
              label="Cohorte d'accueil"
              description={ctx.fallbackCohortId == null
                ? "Obligatoire : son inscription ne relève d'aucune cohorte de ce stage cette année."
                : "Facultatif : sans choix, la cohorte de son propre groupe est utilisée."}
              placeholder={ctx.cohorts.length ? 'Choisir une cohorte…' : 'Aucune cohorte pour ce stage cette année'}
              value={cohortId}
              onChange={setCohortId}
              disabled={ctx.cohorts.length === 0}
              data={ctx.cohorts.map((c) => ({
                value: String(c.cohortId),
                label: `${c.groupLabel ?? `Groupe ${c.groupNumber}`}${c.rotationGroup ? ` · ${c.rotationGroup}` : ''}`,
              }))}
              radius="md"
            />

            <TextInput
              label="Motif"
              placeholder="Rattrapage 3ᵉ année — arrêté…"
              value={reason}
              onChange={(e) => setReason(e.currentTarget.value)}
              radius="md"
            />
          </>
        )}

        <Group justify="flex-end" mt="xs">
          {placementIncomplete && (
            <Text size="xs" c="dimmed">Renseignez les deux dates, ou choisissez « planifier plus tard ».</Text>
          )}
          {cohorteMissing && !placementIncomplete && (
            <Text size="xs" c="dimmed">
              {ctx!.cohorts.length === 0
                ? "Aucune cohorte ne fait tourner ce stage cette année : la promotion doit d'abord être planifiée."
                : "Choisissez une cohorte d'accueil."}
            </Text>
          )}
          <Button variant="subtle" color="gray" radius="md" onClick={close}>Annuler</Button>
          <Button
            radius="md"
            color="navy"
            leftSection={<IconRefresh size={15} stroke={1.5} />}
            disabled={blocked}
            loading={saving}
            onClick={submit}
          >
            Rouvrir le stage
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
