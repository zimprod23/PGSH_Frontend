import {
  Alert,
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCalendarStats,
  IconCircleCheck,
  IconInfoCircle,
  IconLock,
  IconTrash,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import {
  useGetAcademicYearsQuery,
  useGetCnpnEffectivitiesQuery,
  useCreateCnpnEffectivityMutation,
  useDeleteCnpnEffectivityMutation,
  useLazyPreviewCnpnEffectivityQuery,
  useApplyCnpnEffectivityMutation,
  useGetPromotionLevelsQuery,
} from '../api/adminApi';
import type {
  CnpnEffectivityApplyPreview,
  CnpnEffectivityRowStatus,
  CnpnVersionResponse,
} from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';

/**
 * « Ce texte régit tel niveau à partir de telle année ».
 *
 * The other half of who a CNPN binds. The intake year on the text itself governs the promotion
 * *arriving*; these rules govern the promotions already in the building — which is what
 * « la 3ᵉ année de 2026-2027 et en dessous » actually means, and the only shape that catches the
 * repeater while sparing the student one year ahead of him.
 *
 * Two things this screen has to make plain, because both are counter-intuitive:
 *
 * - **A rule is read as each registration is created, and then frozen onto it.** Authoring one before
 *   the réinscription is normally all that is needed; « Appliquer » exists only for the other order.
 * - **Nothing already stamped moves when a rule is deleted.** Removing it changes which text the
 *   *next* registration resolves to, never what a student has been studying against.
 */

const STATUS_META: Record<CnpnEffectivityRowStatus, { label: string; color: string }> = {
  WillMove:        { label: 'À re-rattacher', color: 'teal' },
  AlreadyGoverned: { label: 'Déjà à jour',    color: 'gray' },
  FrozenByOutcome: { label: 'Année close',    color: 'red'  },
};

interface Props {
  version: CnpnVersionResponse;
}

export function CnpnEffectivityPanel({ version }: Props) {
  const notify = useNotify();

  const { data: rules = [], isFetching } = useGetCnpnEffectivitiesQuery({
    cnpnVersionId: version.id,
  });
  const { data: levels = [] } = useGetPromotionLevelsQuery(undefined);
  const { data: years = [] } = useGetAcademicYearsQuery();

  const [levelChoice, setLevelChoice] = useState<string | null>(null);
  const [yearChoice, setYearChoice] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<CnpnEffectivityApplyPreview | null>(null);

  const [create, { isLoading: creating }] = useCreateCnpnEffectivityMutation();
  const [remove, { isLoading: removing }] = useDeleteCnpnEffectivityMutation();
  const [runPreview, { isFetching: previewing }] = useLazyPreviewCnpnEffectivityQuery();
  const [runApply, { isLoading: applying }] = useApplyCnpnEffectivityMutation();

  // Pre-flight, mirroring the server's guards so no click can only fail: a level of this text's own
  // programme, within its span, and not one this text already takes effect for.
  const claimed = useMemo(() => new Set(rules.map((r) => r.levelId)), [rules]);

  const selectableLevels = useMemo(
    () => levels
      .filter((l) => l.academicProgram === version.academicProgram)
      .filter((l) => l.year >= 1 && l.year <= version.totalYears)
      .filter((l) => !claimed.has(l.id))
      .sort((a, b) => a.year - b.year),
    [levels, version.academicProgram, version.totalYears, claimed],
  );

  const canCreate = levelChoice !== null && yearChoice !== null;

  const reason =
    selectableLevels.length === 0
      ? `Tous les niveaux de ${version.academicProgram} couverts par ce texte ont déjà une règle.`
      : !canCreate
        ? 'Choisissez un niveau et une année d’entrée en vigueur.'
        : null;

  const handleCreate = async () => {
    if (!canCreate) return;
    try {
      await create({
        cnpnVersionId: version.id,
        levelId: Number(levelChoice),
        fromAcademicYearId: Number(yearChoice),
        note: note.trim() || undefined,
      }).unwrap();

      notify.success('Entrée en vigueur enregistrée');
      setLevelChoice(null);
      setNote('');
    } catch (err: unknown) {
      notify.error((err as { data?: { detail?: string } })?.data?.detail ?? 'Enregistrement impossible');
    }
  };

  const handleDelete = async (id: number, governed: number) => {
    try {
      const result = await remove(id).unwrap();
      setPreview(null);
      notify.success(
        governed > 0
          ? `Règle supprimée — les ${result.registrationsGoverned} inscription(s) déjà rattachées gardent leur texte.`
          : 'Règle supprimée',
      );
    } catch (err: unknown) {
      notify.error((err as { data?: { detail?: string } })?.data?.detail ?? 'Suppression impossible');
    }
  };

  const handlePreview = async (id: number) => {
    try {
      setPreview(await runPreview(id).unwrap());
    } catch (err: unknown) {
      notify.error((err as { data?: { detail?: string } })?.data?.detail ?? 'Simulation impossible');
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    try {
      // The number that was on screen goes back with the request: a registration created in between
      // widens the act, and the server refuses rather than applying to a population nobody saw.
      const result = await runApply({
        id: preview.effectivityId,
        confirmedMoveCount: preview.willMove,
      }).unwrap();

      setPreview(null);
      notify.success(`${result.willMove} inscription(s) re-rattachée(s) au CNPN ${result.cnpnVersionCode}`);
    } catch (err: unknown) {
      notify.error((err as { data?: { detail?: string } })?.data?.detail ?? 'Application impossible');
    }
  };

  return (
    <Card padding="lg" radius="lg" withBorder shadow="sm">
      <Stack gap="md">
        <Group gap="sm">
          <ThemeIcon size={36} radius="md" variant="light" color="navy">
            <IconCalendarStats size={20} stroke={1.5} />
          </ThemeIcon>
          <Stack gap={0}>
            <Text fw={600} size="sm">Entrée en vigueur par niveau</Text>
            <Text size="xs" c="dimmed">
              À partir de quelle année {version.code} régit chaque niveau, quel que soit le parcours
              de l’étudiant qui s’y trouve.
            </Text>
          </Stack>
        </Group>

        <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
          La règle est lue <strong>à la création de chaque inscription</strong>, puis figée dessus.
          Un redoublant qui se réinscrit dans le niveau visé bascule donc automatiquement — et une
          année déjà faite garde le texte sous lequel elle a été faite, même si le niveau est
          remanié ensuite. « et en dessous » s’écrit une ligne par niveau.
        </Alert>

        <Divider />

        <Group align="flex-end" gap="md" wrap="wrap">
          <Select
            label="Niveau"
            placeholder="Choisir"
            data={selectableLevels.map((l) => ({
              value: String(l.id),
              label: l.label ?? `Niveau ${l.id}`,
            }))}
            value={levelChoice}
            onChange={setLevelChoice}
            disabled={selectableLevels.length === 0}
            searchable
            w={220}
          />
          <Select
            label="À partir de"
            placeholder="Année universitaire"
            data={years.map((y) => ({ value: String(y.id), label: y.label }))}
            value={yearChoice}
            onChange={setYearChoice}
            w={200}
          />
          <TextInput
            label="Motif (facultatif)"
            placeholder="ex : arrêté 1650.25 art. 2, après négociation"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 240 }}
          />
          <Tooltip label={reason} disabled={reason === null} multiline w={260}>
            <Button
              variant="light" color="navy" loading={creating}
              disabled={!canCreate}
              onClick={handleCreate}
            >
              Ajouter
            </Button>
          </Tooltip>
        </Group>

        <Divider label={`${rules.length} règle(s)`} labelPosition="left" />

        {rules.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            Aucune règle : {version.code} ne s’applique qu’aux nouveaux inscrits
            {version.appliesToEntrantsFromLabel ? ` à partir de ${version.appliesToEntrantsFromLabel}` : ''}.
          </Text>
        ) : (
          <Table fz="sm" verticalSpacing={6} highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Niveau</Table.Th>
                <Table.Th>À partir de</Table.Th>
                <Table.Th>Inscriptions régies</Table.Th>
                <Table.Th>Motif</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rules.map((rule) => (
                <Table.Tr key={rule.id}>
                  <Table.Td fw={600}>{rule.levelLabel}</Table.Td>
                  <Table.Td>{rule.fromAcademicYearLabel}</Table.Td>
                  <Table.Td>
                    <Badge
                      variant="light"
                      color={rule.registrationsGoverned > 0 ? 'teal' : 'gray'}
                    >
                      {rule.registrationsGoverned}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">{rule.note ?? '—'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <Tooltip
                        label="Ne sert que si la règle a été écrite après la réinscription : voir les inscriptions déjà créées qu’elle devrait régir."
                        multiline w={280}
                      >
                        <Button
                          size="compact-xs" variant="subtle" color="navy"
                          loading={previewing}
                          onClick={() => handlePreview(rule.id)}
                        >
                          Rattraper
                        </Button>
                      </Tooltip>
                      <Tooltip
                        label={
                          rule.registrationsGoverned > 0
                            ? `Supprime la règle. Les ${rule.registrationsGoverned} inscription(s) déjà rattachées gardent leur texte.`
                            : 'Supprime la règle.'
                        }
                        multiline w={260}
                      >
                        <ActionIcon
                          variant="subtle" color="red" size="sm"
                          loading={removing}
                          onClick={() => handleDelete(rule.id, rule.registrationsGoverned)}
                        >
                          <IconTrash size={15} stroke={1.5} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        {isFetching && <Text size="xs" c="dimmed">Actualisation…</Text>}

        {preview && (
          <>
            <Divider
              label={`Rattrapage — ${preview.levelLabel} depuis ${preview.fromAcademicYearLabel}`}
              labelPosition="left"
            />

            <Group gap="xs" wrap="wrap">
              <Badge variant="light" color="gray">{preview.inScope} inscription(s) concernées</Badge>
              <Badge variant="light" color="teal">{preview.willMove} à re-rattacher</Badge>
              {preview.alreadyGoverned > 0 && (
                <Badge variant="light" color="gray">{preview.alreadyGoverned} déjà à jour</Badge>
              )}
              {preview.studentsMoved > 0 && (
                <Badge variant="light" color="blue">{preview.studentsMoved} étudiant(s)</Badge>
              )}
              {preview.frozenByOutcome > 0 && (
                <Tooltip
                  label="Années déjà prononcées. La décision du jury portait sur les exigences d’alors ; le texte ne peut plus bouger. Rouvrez l’année si le rattachement est erroné."
                  multiline w={300}
                >
                  <Badge variant="light" color="red" leftSection={<IconLock size={11} />}>
                    {preview.frozenByOutcome} année(s) close(s)
                  </Badge>
                </Tooltip>
              )}
            </Group>

            {preview.frozenByOutcome > 0 && (
              <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />}>
                Les années closes ne sont pas modifiables, et il n’existe pas d’option pour forcer :
                un verdict rendu sur des exigences qui changent après coup n’est plus lisible.
              </Alert>
            )}

            {preview.sample.length > 0 && (
              <Card padding="sm" radius="md" withBorder bg="#fffbeb">
                <Text size="xs" fw={600} mb="xs">
                  {preview.sampleTotal} ligne(s)
                  {preview.sample.length < preview.sampleTotal && ` (${preview.sample.length} affichées)`}
                </Text>
                <Table fz="xs" verticalSpacing={4}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Étudiant</Table.Th>
                      <Table.Th>Année</Table.Th>
                      <Table.Th>CNPN actuel</Table.Th>
                      <Table.Th>Cas</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {preview.sample.map((row) => (
                      <Table.Tr key={row.registrationId}>
                        <Table.Td>
                          {row.studentFullName}
                          <Text component="span" c="dimmed" ff="monospace" ml={6}>{row.cne}</Text>
                        </Table.Td>
                        <Table.Td>{row.academicYearLabel}</Table.Td>
                        <Table.Td>{row.currentCnpnCode ?? '—'}</Table.Td>
                        <Table.Td>
                          <Badge size="xs" variant="light" color={STATUS_META[row.status].color}>
                            {STATUS_META[row.status].label}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>
            )}

            <Group justify="flex-end">
              <Button variant="subtle" color="gray" onClick={() => setPreview(null)}>Fermer</Button>
              <Tooltip
                label="Aucune inscription à re-rattacher : elles relèvent déjà de ce texte, ou leur année est close."
                disabled={preview.canApply}
                multiline w={280}
              >
                <Button
                  color="navy"
                  loading={applying}
                  disabled={!preview.canApply}
                  leftSection={<IconCircleCheck size={16} stroke={1.5} />}
                  onClick={handleApply}
                >
                  Re-rattacher {preview.willMove} inscription(s)
                </Button>
              </Tooltip>
            </Group>
          </>
        )}
      </Stack>
    </Card>
  );
}
