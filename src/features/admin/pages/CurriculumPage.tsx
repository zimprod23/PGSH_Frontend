import {
  Alert,
  Badge,
  Card,
  Container,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconArrowRight,
  IconBook2,
  IconCircleCheck,
  IconInfoCircle,
  IconMinus,
  IconPlus,
  IconScale,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import {
  useCompareCurriculaQuery,
  useGetCnpnVersionsQuery,
  useGetCurriculumQuery,
  useGetPromotionLevelsQuery,
} from '../api/adminApi';
import { CurriculumEditor } from '../components/CurriculumEditor';
import { CnpnEffectivityPanel } from '../components/CnpnEffectivityPanel';
import { CnpnTargetingPanel } from '../components/CnpnTargetingPanel';
import { CnpnVersionsPanel } from '../components/CnpnVersionsPanel';
import type { CurriculumChange, CurriculumDiffEntry } from '../types/admin.types';

/**
 * The CNPN of a level, text by text, and what changed between two of them.
 *
 * The comparison is the screen behind manual revalidation: a student is judged against the CNPN they
 * failed under but can only be re-planned against the one now in force, so both have to be visible
 * before anyone decides. A stage marked "Retiré" is the case that strands a failed student — the
 * faculty's rule is that they serve it anyway, since removal releases only *new* students.
 */

const CHANGE_META: Record<CurriculumChange, { label: string; color: string; icon: typeof IconPlus }> = {
  Added:      { label: 'Ajouté',    color: 'teal',   icon: IconPlus },
  Removed:    { label: 'Retiré',    color: 'red',    icon: IconMinus },
  Reweighted: { label: 'Recoté',    color: 'orange', icon: IconScale },
  Unchanged:  { label: 'Inchangé',  color: 'gray',   icon: IconCircleCheck },
};

function ChangeBadge({ change }: { change: CurriculumChange }) {
  const meta = CHANGE_META[change];
  const Icon = meta.icon;
  return (
    <Badge
      variant={change === 'Unchanged' ? 'light' : 'filled'}
      color={meta.color}
      size="sm"
      radius="md"
      leftSection={<Icon size={12} stroke={2} />}
    >
      {meta.label}
    </Badge>
  );
}

/** "2 → 3" when a text reweights a stage it keeps; a single value otherwise. */
function Weight({ from, to }: { from: number | null; to: number | null }) {
  if (from !== null && to !== null && from !== to) {
    return (
      <Group gap={4} wrap="nowrap">
        <Text size="sm" c="dimmed" td="line-through">{from}</Text>
        <IconArrowRight size={12} stroke={1.5} />
        <Text size="sm" fw={600}>{to}</Text>
      </Group>
    );
  }
  return <Text size="sm">{to ?? from ?? '—'}</Text>;
}

export default function CurriculumPage() {
  const { data: levels = [] } = useGetPromotionLevelsQuery(undefined);
  const { data: versions = [] } = useGetCnpnVersionsQuery();

  const [levelChoice, setLevelId] = useState<string | null>(null);
  const [fromChoice, setFromVersion] = useState<string | null>(null);
  const [toChoice, setToVersion] = useState<string | null>(null);

  // Levels are ordered by year, and "Retrait" (withdrawn students) carries year 0 — so the raw first
  // entry opened this page on a category no CNPN has anything to say about. Default to the first
  // real study year instead, falling back to the raw list if a faculty somehow has none.
  const firstStudyLevel = useMemo(
    () => levels.find((l) => l.year >= 1) ?? levels[0],
    [levels],
  );

  const selectedLevel = useMemo(
    () => levels.find((l) => String(l.id) === (levelChoice ?? String(firstStudyLevel?.id ?? ''))),
    [levels, levelChoice, firstStudyLevel],
  );

  // The pickers are over ministerial texts, not academic years: a requirement set belongs to a text,
  // and since arrêté 1650.25 two of them are in force at once. Oldest intake first, so "from"
  // defaults to the superseded text and "to" to the one now governing new entrants.
  //
  // Scoped to the level's programme: a Médecine arrêté has nothing to say about a Pharmacie level,
  // and offering the pair only to reject it at save time (Curriculums.ProgramMismatch) is a guard
  // arriving too late to help. Texts that govern no intake sort last but stay selectable, because
  // comparing against a superseded amendment is a legitimate historical question.
  const sortedVersions = useMemo(
    () => versions
      .filter((v) => !selectedLevel || v.academicProgram === selectedLevel.academicProgram)
      .sort((a, b) => {
        if (a.governsAnIntake !== b.governsAnIntake) return a.governsAnIntake ? -1 : 1;
        return (a.appliesToEntrantsFromLabel ?? '').localeCompare(b.appliesToEntrantsFromLabel ?? '');
      }),
    [versions, selectedLevel],
  );

  // ...but a default is only ever drawn from the texts that actually govern someone. Arrêté 2175.22
  // was explicitly disapplied by 1650.25, so opening the page on it — and worse, offering to record
  // requirements against it, since "Texte comparé" is the one the editor writes to — would invite
  // scolarité to type the new CNPN into a text that binds nobody.
  const defaultable = useMemo(
    () => sortedVersions.filter((v) => v.governsAnIntake),
    [sortedVersions],
  );

  // Defaults are derived, not stored: the lists arrive after the first render, and mirroring them
  // into state through an effect is the cascading-render pattern React now flags.
  //
  // A choice is also dropped once it leaves the filtered list — switching from a Médecine level to a
  // Pharmacie one must not keep a Médecine arrêté selected underneath.
  const levelId = levelChoice ?? (firstStudyLevel ? String(firstStudyLevel.id) : null);
  const inScope = (choice: string | null) =>
    choice !== null && sortedVersions.some((v) => String(v.id) === choice) ? choice : null;

  const fromVersion =
    inScope(fromChoice) ?? (defaultable.length > 0 ? String(defaultable[0].id) : null);
  const toVersion =
    inScope(toChoice) ?? (defaultable.length > 0 ? String(defaultable[defaultable.length - 1].id) : null);

  const ready = levelId !== null && fromVersion !== null && toVersion !== null;

  // "Texte comparé" is the text everything downstream acts on — it is what the editor writes to and
  // what the targeting panel binds students to.
  const targetVersion = sortedVersions.find((v) => String(v.id) === toVersion);

  const { data: comparison, isFetching: comparing, error: comparisonError } = useCompareCurriculaQuery(
    {
      levelId: Number(levelId),
      fromCnpnVersionId: Number(fromVersion),
      toCnpnVersionId: Number(toVersion),
    },
    { skip: !ready },
  );

  // The compared text is also the one that gets edited: it is "ce qui s'applique aujourd'hui", and a
  // level with no set under it is exactly the case that has to be openable from here.
  const { data: current, isFetching: loadingCurrent } = useGetCurriculumQuery(
    { levelId: Number(levelId), cnpnVersionId: Number(toVersion) },
    { skip: !ready },
  );

  const removed = comparison?.entries.filter((e) => e.change === 'Removed') ?? [];

  return (
    <Container fluid>
      <Stack gap="xl">
        <Group gap="sm">
          <ThemeIcon size={38} radius="md" variant="light" color="navy">
            <IconBook2 size={20} stroke={1.5} />
          </ThemeIcon>
          <Stack gap={2}>
            <Title order={2} fw={700}>CNPN — programme des stages</Title>
            <Text size="xs" c="dimmed">
              Les stages exigés d'un niveau par chaque texte, et ce qui a changé de l'un à l'autre.
            </Text>
          </Stack>
        </Group>

        {/* The texts first — you record an arrêté before you can say what it demands or whom it
            binds. Scoped to the selected level's programme, like the pickers below. */}
        {selectedLevel && (
          <CnpnVersionsPanel
            versions={sortedVersions}
            program={selectedLevel.academicProgram}
          />
        )}

        <Card padding="lg" radius="lg" withBorder shadow="sm">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Select
              label="Niveau"
              data={levels.map((l) => ({ value: String(l.id), label: l.label ?? `Niveau ${l.id}` }))}
              value={levelId}
              onChange={setLevelId}
              searchable
            />
            <Select
              label="Texte de référence"
              description="Le CNPN sous lequel l'étudiant a échoué"
              data={sortedVersions.map((v) => ({ value: String(v.id), label: v.label }))}
              value={fromVersion}
              onChange={setFromVersion}
            />
            <Select
              label="Texte comparé"
              description="Ce qui s'applique aujourd'hui"
              data={sortedVersions.map((v) => ({ value: String(v.id), label: v.label }))}
              value={toVersion}
              onChange={setToVersion}
            />
          </SimpleGrid>
        </Card>

        {comparisonError && (
          <Alert color="orange" variant="light" icon={<IconInfoCircle size={16} />} radius="md">
            Aucune exigence enregistrée pour ce niveau dans l’un des deux CNPN. Reconstituez l’historique
            depuis les stages effectivement servis, ou saisissez le texte manquant.
          </Alert>
        )}

        {removed.length > 0 && (
          <Alert color="red" variant="light" icon={<IconMinus size={16} />} radius="md">
            <Text size="sm" fw={600} mb={4}>
              {removed.length} stage(s) supprimé(s) depuis {comparison?.fromCnpnVersionLabel}
            </Text>
            <Text size="sm">
              {removed.map((r) => r.stageName).join(', ')} — un étudiant qui n'a pas validé l'un
              d'eux le repasse malgré tout&nbsp;: la suppression ne libère que les nouveaux inscrits,
              elle n'efface pas une obligation déjà contractée.
            </Text>
          </Alert>
        )}

        <Card padding="lg" radius="lg" withBorder shadow="sm">
          <Stack gap="md">
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                <Text fw={600} size="sm">
                  {comparison
                    ? `${comparison.fromCnpnVersionLabel} → ${comparison.toCnpnVersionLabel}`
                    : 'Comparaison'}
                </Text>
                {comparing && <Loader size="xs" />}
              </Group>
              {comparison && !comparison.hasChanges && (
                <Badge variant="light" color="gray" radius="md">Texte identique</Badge>
              )}
            </Group>

            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Stage</Table.Th>
                  <Table.Th w={130}>Évolution</Table.Th>
                  <Table.Th w={120}>Coefficient</Table.Th>
                  <Table.Th w={120}>Durée (j)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(comparison?.entries ?? []).length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text c="dimmed" size="sm" ta="center" py="md">
                        {comparing ? 'Chargement…' : 'Aucun stage à comparer.'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  comparison!.entries.map((e: CurriculumDiffEntry) => (
                    <Table.Tr key={e.stageId}>
                      <Table.Td>
                        <Text size="sm" fw={e.change === 'Unchanged' ? 400 : 600}>{e.stageName}</Text>
                      </Table.Td>
                      <Table.Td><ChangeBadge change={e.change} /></Table.Td>
                      <Table.Td><Weight from={e.fromCoefficient} to={e.toCoefficient} /></Table.Td>
                      <Table.Td><Weight from={e.fromDurationInDays} to={e.toDurationInDays} /></Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Stack>
        </Card>

        {ready && (
          <CurriculumEditor
            levelId={Number(levelId)}
            cnpnVersionId={Number(toVersion)}
            cnpnVersionLabel={targetVersion?.label ?? ''}
            versions={sortedVersions}
            curriculum={current}
            isLoading={loadingCurrent}
          />
        )}

        {/* Who the compared text binds. Deliberately below the requirements: you settle what a CNPN
            demands before deciding whom it demands it of.

            Two panels because there are two mechanisms, and they answer different questions. The
            effectivity rules are standing — read as each registration is created, so they keep
            catching repeaters and returners year after year. Targeting is a one-shot sweep over the
            students who exist today. Effectivity first: it is the one that should normally be used. */}
        {targetVersion && <CnpnEffectivityPanel version={targetVersion} />}
        {targetVersion && <CnpnTargetingPanel version={targetVersion} />}
      </Stack>
    </Container>
  );
}
