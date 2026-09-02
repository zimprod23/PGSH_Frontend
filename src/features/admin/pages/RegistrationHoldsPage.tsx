import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Pagination,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconLockOpen,
  IconSearch,
  IconSnowflake,
} from '@tabler/icons-react';
import { TextInput } from '@mantine/core';
import { useMemo, useState } from 'react';
import {
  useGetRegistrationHoldsQuery,
  useReleaseRegistrationHoldMutation,
} from '../api/adminApi';
import {
  REGISTRATION_HOLD_REASON_LABEL,
  type RegistrationHold,
  type RegistrationHoldFilter,
  type RegistrationHoldReason,
} from '../types/registrationHold.types';
import { useAcademicYear } from '../contexts/useAcademicYear';
import { useNotify } from '../../../common/hooks/useNotify';

const PAGE_SIZE = 25;

/**
 * Les signalements — registrations PGSH created but will not plan until somebody settles them.
 *
 * <p>This is the page the whole mechanism exists for. Freezing a registration is half an answer; the
 * other half is walking the list one student at a time and clearing it. Without this screen the flag
 * is a silent exclusion, which is the failure it was built to replace.</p>
 *
 * <p>⚠ <b>No « tout lever ».</b> The réinscription roll raises them by the thousand and they come off
 * one at a time, because each is a different question — is the évaluation keyed in, did this student
 * really defend, is he simply coming back late. A bulk release would undo in one click the only
 * thing that made a 1 267-row inference safe to record.</p>
 */
export default function RegistrationHoldsPage() {
  const notify = useNotify();
  const { currentYearId } = useAcademicYear();

  const [filter, setFilter] = useState<RegistrationHoldFilter>('Active');
  const [reason, setReason] = useState<RegistrationHoldReason | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Every server-querying search is debounced, and nothing is sent below two characters.
  const [debounced] = useDebouncedValue(search, 350);
  const searchTerm = debounced.trim().length >= 2 ? debounced.trim() : undefined;

  const { data, isLoading, isFetching } = useGetRegistrationHoldsQuery({
    academicYearId: currentYearId ?? undefined,
    filter,
    reason: reason ?? undefined,
    searchTerm,
    pageNumber: page,
    pageSize: PAGE_SIZE,
  });

  const [release, { isLoading: releasing }] = useReleaseRegistrationHoldMutation();

  // ⚠ The row itself, not its id. Derived as `rows.find(r => r.id === openRow)` the dialog becomes
  // a function of the list, so anything refetching underneath it — the release's own cache
  // invalidation, a filter change, a page change — empties it mid-interaction and the dialog
  // vanishes. The dialog describes the row the operator clicked: that is a snapshot, and it has to
  // survive the list moving under it.
  const [active, setActive] = useState<RegistrationHold | null>(null);
  const [note, setNote] = useState('');

  const rows = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const reasonOptions = useMemo(
    () =>
      (Object.keys(REGISTRATION_HOLD_REASON_LABEL) as RegistrationHoldReason[]).map((value) => ({
        value,
        label: REGISTRATION_HOLD_REASON_LABEL[value],
      })),
    [],
  );

  async function onRelease(hold: RegistrationHold) {
    try {
      const report = await release({ holdId: hold.id, releaseNote: note }).unwrap();

      // ⚠ « c'est réglé » and « il en reste un » are different facts, and the server is the only one
      // that knows which. Saying « levé » on a registration that is still frozen would send the
      // operator away from a student who still needs him.
      // ⚠ « il en reste un » and « il est encore gelé » are different facts, and only the server knows
      // which: a registration left carrying nothing but « dossier à compléter » is on the worklist
      // and IS planned. Saying it stays frozen would send the operator chasing a block that is not
      // there.
      notify.success(
        report.stillBlocked
          ? `Signalement levé. L'inscription reste gelée : ${report.stillHeld} signalement(s) bloquant(s).`
          : report.stillHeld > 0
            ? `Signalement levé. ${hold.studentFullName} participe de nouveau à la planification — `
              + `il reste ${report.stillHeld} signalement(s) non bloquant(s) à traiter.`
            : `Signalement levé. ${hold.studentFullName} participe de nouveau à la planification.`,
      );

      setActive(null);
      setNote('');
    } catch {
      // ⚠ Deliberately silent. `errorMiddleware` already toasts every rejected mutation in the
      // server's own words; a second notify here prints the same sentence twice — see
      // PGSH.Frontend/CLAUDE.md §1e. The catch exists for the control flow only: the modal stays
      // open with the note intact so the operator can correct and retry.
    }
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" variant="light" color="orange">
              <IconSnowflake size={20} />
            </ThemeIcon>
            <div>
              <Title order={3}>Signalements</Title>
              <Text size="sm" c="dimmed">
                Inscriptions gelées : elles n'entrent dans aucun groupe et ne reçoivent aucune
                affectation de stage tant que le signalement n'est pas levé.
              </Text>
            </div>
          </Group>
          {isFetching && <Loader size="sm" />}
        </Group>

        <Alert color="blue" variant="light" radius="md" icon={<IconInfoCircle size={16} />}>
          <Text size="xs">
            Un signalement <b>ne change rien d'autre</b> : l'inscription existe, elle garde son statut
            et ses périodes déjà publiées. <b>Tous ne gèlent pas.</b> Un signalement{' '}
            <b>gelé</b> empêche de construire de <b>nouvelles</b> affectations tant qu'un humain n'a
            pas tranché ; un signalement <b>« à compléter »</b> ne bloque rien — l'étudiant entre dans
            les groupes et la planification comme les autres, il manque seulement des informations à
            sa fiche. Il se lève <b>un étudiant à la fois</b>,
            avec un motif — la ligne est conservée après la levée, pour que le dossier puisse dire qui
            a débloqué l'étudiant et sur quoi.
          </Text>
        </Alert>

        <Card withBorder radius="md" p="md">
          <Group gap="sm" wrap="wrap" mb="md">
            <SegmentedControl
              size="xs"
              value={filter}
              onChange={(v) => {
                setFilter(v as RegistrationHoldFilter);
                setPage(1);
              }}
              data={[
                { value: 'Active', label: 'Encore gelés' },
                { value: 'Released', label: 'Levés' },
                { value: 'All', label: 'Tous' },
              ]}
            />
            <Select
              size="xs"
              w={280}
              clearable
              placeholder="Tous les motifs"
              value={reason}
              onChange={(v) => {
                setReason(v as RegistrationHoldReason | null);
                setPage(1);
              }}
              data={reasonOptions}
            />
            <TextInput
              size="xs"
              w={260}
              leftSection={<IconSearch size={14} />}
              placeholder="Nom, CNE ou Apogée…"
              value={search}
              onChange={(e) => {
                setSearch(e.currentTarget.value);
                setPage(1);
              }}
            />
            <Badge variant="light" color="orange" radius="sm">
              {total} ligne(s)
            </Badge>
          </Group>

          {/*
            ⚠ Above the table, not below it. The first attempt put this panel after the rows: with 60
            of them, clicking « Lever » on row 1 showed nothing and the button read as broken — found
            running the smoke test on the real roll. A Mantine `Modal` was tried next and would not
            mount here, so this is the version with no portal and no transition to go wrong: the
            confirmation appears exactly where the operator just clicked.
          */}
          {active && (
            <Card withBorder radius="md" p="sm" mb="md" bg="var(--mantine-color-orange-0)">
              <Stack gap="xs">
                <Group gap="xs" wrap="nowrap">
                  <IconAlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                  <div>
                    <Text size="sm" fw={600}>
                      Lever le signalement — {active.studentFullName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {active.levelLabel} · {active.academicYearLabel}
                    </Text>
                  </div>
                </Group>

                <Text size="xs">{active.evidence}</Text>
                <Text size="xs" c="dimmed">{active.remedy}</Text>

                <Textarea
                  autosize
                  minRows={2}
                  size="xs"
                  label="Motif de la levée"
                  description="Ce qui a été vérifié. Conservé avec la ligne, même après la levée."
                  value={note}
                  onChange={(e) => setNote(e.currentTarget.value)}
                />

                <Group justify="flex-end" gap="xs">
                  <Button size="xs" variant="subtle" color="gray"
                    onClick={() => { setActive(null); setNote(''); }}>
                    Annuler
                  </Button>
                  <Button
                    size="xs"
                    color="teal"
                    loading={releasing}
                    disabled={note.trim().length === 0}
                    leftSection={<IconLockOpen size={13} />}
                    onClick={() => void onRelease(active)}
                  >
                    Lever le signalement
                  </Button>
                </Group>
              </Stack>
            </Card>
          )}

          {isLoading ? (
            <Group justify="center" py="xl">
              <Loader />
            </Group>
          ) : rows.length === 0 ? (
            <Alert color="teal" variant="light" radius="md" icon={<IconInfoCircle size={16} />}>
              <Text size="sm">
                {filter === 'Active'
                  ? "Aucune inscription gelée pour cette année : rien ne bloque la planification."
                  : 'Aucun signalement à afficher pour cette sélection.'}
              </Text>
            </Alert>
          ) : (
            <>
              <Table.ScrollContainer minWidth={900}>
                <Table striped highlightOnHover fz="xs" verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Étudiant</Table.Th>
                      <Table.Th>Identifiants</Table.Th>
                      <Table.Th>Niveau</Table.Th>
                      <Table.Th>Motif</Table.Th>
                      <Table.Th>Constat</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows.map((hold) => (
                      <Table.Tr key={hold.id}>
                        <Table.Td>
                          <Text size="xs" fw={600}>{hold.studentFullName}</Text>
                          <Text size="10px" c="dimmed">{hold.academicYearLabel}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="10px" c="dimmed">{hold.appogee ?? '—'}</Text>
                          <Text size="10px" c="dimmed">{hold.cne ?? '—'}</Text>
                        </Table.Td>
                        <Table.Td>{hold.levelLabel}</Table.Td>
                        <Table.Td>
                          <Stack gap={4} align="flex-start">
                            <Badge
                              size="sm"
                              radius="sm"
                              variant="light"
                              color={hold.releasedOn ? 'gray' : hold.blocksPlanning ? 'orange' : 'blue'}
                            >
                              {hold.reasonLabel}
                            </Badge>
                            {/*
                              ⚠ The two are different situations and the list has to separate them:
                              « gelé » is holding a promotion up, « à compléter » is not holding up
                              anything. Without this the page reads as 1 353 blocked students when
                              only 1 327 are.
                            */}
                            {!hold.releasedOn && (
                              <Badge
                                size="xs" radius="sm" variant="outline"
                                color={hold.blocksPlanning ? 'red' : 'teal'}
                              >
                                {hold.blocksPlanning ? 'Gelé' : 'Planifié — à compléter'}
                              </Badge>
                            )}
                          </Stack>
                        </Table.Td>
                        <Table.Td style={{ maxWidth: 380 }}>
                          <Text size="xs">{hold.evidence}</Text>
                          {hold.releasedOn ? (
                            <Text size="10px" c="dimmed" mt={4}>
                              Levé : {hold.releaseNote}
                            </Text>
                          ) : (
                            <Tooltip label={hold.remedy} multiline w={320} withArrow>
                              <Text size="10px" c="dimmed" mt={4} style={{ cursor: 'help' }}>
                                Que faire ?
                              </Text>
                            </Tooltip>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {!hold.releasedOn && (
                            <Button
                              size="compact-xs"
                              variant="light"
                              color="teal"
                              leftSection={<IconLockOpen size={13} />}
                              onClick={() => {
                                setActive(hold);
                                setNote('');
                              }}
                            >
                              Lever
                            </Button>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>

              {pageCount > 1 && (
                <Group justify="center" mt="md">
                  <Pagination size="sm" value={page} onChange={setPage} total={pageCount} />
                </Group>
              )}
            </>
          )}
        </Card>
      </Stack>

    </Container>
  );
}
