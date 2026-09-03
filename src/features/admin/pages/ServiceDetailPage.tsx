import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import {
  Alert, Anchor, Badge, Breadcrumbs, Button, Card, Center, Divider, Group, Loader, Paper,
  SimpleGrid, Stack, Table, Text, Title, Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle, IconBuildingHospital, IconEdit, IconInfoCircle, IconUsers,
} from '@tabler/icons-react';
import {
  useGetHospitalsQuery,
  useGetServiceByIdQuery,
  useGetServiceOccupancyQuery,
  useGetServiceStagesQuery,
} from '../api/adminApi';
import { useAcademicYear } from '../contexts/useAcademicYear';
import { ServiceFormModal } from '../components/ServiceFormModal';
import { ServiceOccupancyTimeline } from '../components/service/ServiceOccupancyTimeline';
import { PATHS } from '../../../routes/paths';

/**
 * Everything about one service: what it holds, who may send students to it, who leads it.
 *
 * The page exists because capacity is felt *here* and was only ever readable from the plan's side —
 * `RotationArranger` reports a bare count of saturated services and `SchedulePublisher` refuses one
 * service at a time, neither of which tells you which service is under pressure, when, or from whom.
 */
export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const serviceId = Number(id);
  const { currentYearId } = useAcademicYear();
  const [editOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  const { data: service, isLoading } = useGetServiceByIdQuery(serviceId, { skip: !serviceId });

  // academicYearId is in the arg, not a client filter — the arg is the cache key, so changing the
  // navbar year refetches rather than showing last year's load under this year's heading.
  const { data: occupancy, isFetching: occupancyLoading } = useGetServiceOccupancyQuery(
    { serviceId, academicYearId: currentYearId ?? undefined },
    { skip: !serviceId || !currentYearId },
  );

  const { data: stages = [] } = useGetServiceStagesQuery(serviceId, { skip: !serviceId });

  const { data: hospitals } = useGetHospitalsQuery({ pageNumber: 1, pageSize: 200 });
  const hospitalOptions = useMemo(
    () => (hospitals?.items ?? []).map((h) => ({ value: String(h.id), label: h.name })),
    [hospitals],
  );

  if (isLoading || !service) {
    return <Center h={280}><Loader color="navy" /></Center>;
  }

  const restricted = service.levelCapacities.length > 0;

  // Defaulted rather than assumed: the AppHost is long-lived here, so an API still serving a
  // previous response shape is a normal state during development, and reading `.length` off
  // undefined would white-screen the whole page over a section it does not need.
  const chefHistory = service.chefHistory ?? [];

  // ⚠ Absent means *unknown*, never « the note ». Filling it in from `chefFromSourceNote` would put
  // a second resolution order back on the client — the exact defect this field removes — for the
  // sake of an API process predating it. An unresolved answer says so instead.
  const chef = service.chefAttribution;

  return (
    <Stack gap="lg">
      <Breadcrumbs>
        <Anchor component={Link} to={`${PATHS.ADMIN.ROOT}/${PATHS.ADMIN.HOSPITALS}`} size="sm">
          Infrastructure
        </Anchor>
        <Text size="sm">{service.name}</Text>
      </Breadcrumbs>

      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>{service.name}</Title>
          <Group gap="xs" mt={4}>
            <IconBuildingHospital size={15} opacity={0.6} />
            <Text c="dimmed" size="sm">
              {service.hospitalName} · {service.hospitalCity} · {service.serviceType}
              {service.specialty && ` · ${service.specialty}`}
            </Text>
          </Group>
        </div>
        <Button variant="default" leftSection={<IconEdit size={16} />} onClick={openEdit}>
          Modifier le service et ses quotas
        </Button>
      </Group>

      {/* ── The limit in force ──────────────────────────────────────────────────────────────────
          ⚠ The two numbers are never both live. Quotas *replace* Service.Capacity rather than
          sitting under it, so on a restricted service the total is dead data — and an empty quota
          table means "open to everyone", not "not configured yet". Both are said out loud here,
          because both read as the opposite of what they mean. */}
      <Card withBorder radius="md" padding="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="lg">
          <Stack gap={4}>
            <Text size="xs" tt="uppercase" c="dimmed" fw={600}>Limite en vigueur</Text>
            {restricted ? (
              <>
                <Group gap="xs">
                  {service.levelCapacities.map((q) => (
                    <Badge key={q.levelId} size="lg" variant="light" color="navy">
                      {q.levelLabel ?? `niveau ${q.levelId}`} · {q.capacity}
                    </Badge>
                  ))}
                </Group>
                <Text size="xs" c="dimmed">
                  Un quota par promotion, compté sur cette promotion seule. La capacité totale du
                  service ({service.capacity}) <strong>n’est pas consultée</strong> tant qu’un quota
                  existe.
                </Text>
              </>
            ) : (
              <>
                <Badge size="lg" variant="light" color="navy">
                  {service.capacity} — toutes promotions confondues
                </Badge>
                <Text size="xs" c="dimmed">
                  Aucun quota par promotion n’est défini, donc ce service <strong>accepte toutes les
                  promotions</strong> et elles se partagent ce seul plafond.
                </Text>
              </>
            )}
          </Stack>

          {!restricted && (
            <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />} maw={430}>
              <Text size="xs">
                Le <strong>premier</strong> quota que vous ajoutez ferme le service à toute promotion
                qui n’en a pas. C’est un acte, pas un réglage&nbsp;: tant que la liste est vide, le
                service est ouvert.
              </Text>
            </Alert>
          )}
        </Group>
      </Card>

      {/* ── Occupancy ─────────────────────────────────────────────────────────────────────────── */}
      <div>
        <Group justify="space-between" align="baseline" mb="xs">
          <Title order={4}>Occupation réelle</Title>
          <Text size="xs" c="dimmed">
            {occupancy?.academicYearLabel ?? '—'} · toutes promotions et tous stages confondus
          </Text>
        </Group>
        <Text size="xs" c="dimmed" mb="sm">
          Chaque ligne est un intervalle pendant lequel les occupants ne changent pas — et non une
          période de stage. Deux stages n’ont aucune raison d’avoir les mêmes dates&nbsp;: le pic
          d’occupation se trouve dans leur <em>chevauchement</em>, qu’un tableau période par période
          ne montrerait jamais.
        </Text>

        {occupancyLoading ? (
          <Center h={140}><Loader size="sm" color="navy" /></Center>
        ) : occupancy ? (
          <ServiceOccupancyTimeline report={occupancy} />
        ) : (
          <Alert color="gray" variant="light">Occupation indisponible.</Alert>
        )}
      </div>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        {/* ── Who may send students here ─────────────────────────────────────────────────────── */}
        <Paper withBorder radius="md" p="md">
          <Title order={5} mb={4}>Stages autorisés</Title>
          {/* ⚠ Two different things on one page, and this is the one that gets read as the other.
              « Promotion » here is the promotion of the *stage*, from a catalogue that carries no
              year; « Limite en vigueur » above is who the service **admits**. A reader coming down
              from « Occupation réelle · 2026-2027 » carries the year with them and concludes the
              service is restricted to these promotions — which is the report that brought us here. */}
          <Text size="xs" c="dimmed" mb="sm">
            Les stages qui listent ce service. C’est l’envers de la liste tenue sur la fiche du
            stage — elle n’était jusqu’ici lisible que de ce côté-là.
          </Text>
          <Text size="xs" c="dimmed" mb="sm">
            <strong>Catalogue, sans année</strong>&nbsp;: changer l’année en haut ne modifie rien
            ici. « Promotion » est celle du stage — ce n’est <strong>pas</strong> la liste des
            promotions que ce service admet, qui se lit dans «&nbsp;Limite en vigueur&nbsp;».
          </Text>

          {stages.length === 0 ? (
            <Text size="sm" c="dimmed">
              Aucun stage ne peut envoyer d’étudiants ici. La répartition automatique ne proposera
              jamais ce service tant qu’il n’est pas ajouté depuis la fiche d’un stage.
            </Text>
          ) : (
            <Table verticalSpacing={4} horizontalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Stage</Table.Th>
                  <Table.Th>Promotion</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Places</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {stages.map((s) => (
                  <Table.Tr key={s.stageId}>
                    <Table.Td>
                      <Anchor
                        component={Link}
                        to={`${PATHS.ADMIN.ROOT}/${PATHS.ADMIN.STAGES}/${s.stageId}`}
                        size="sm"
                      >
                        {s.stageName}
                      </Anchor>
                    </Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{s.levelLabel}</Text></Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      {s.notAdmitted ? (
                        // A contradiction between two authored lists, invisible from either side
                        // alone: the stage names this service, the service's quotas exclude the
                        // stage's promotion — so auto-arrange silently drops it.
                        <Tooltip
                          withArrow
                          multiline
                          w={280}
                          label="Ce stage liste ce service, mais les quotas du service n’admettent pas sa promotion. La répartition automatique l’écarte et la publication le refuserait."
                        >
                          <Badge size="sm" color="red" variant="light"
                                 leftSection={<IconAlertTriangle size={11} />}>
                            non admis
                          </Badge>
                        </Tooltip>
                      ) : (
                        <Text size="sm" fw={500} style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {s.capacity}
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>

        {/* ── Chef and staff ─────────────────────────────────────────────────────────────────── */}
        <Paper withBorder radius="md" p="md">
          <Title order={5} mb="sm">Chef de service et équipe</Title>

          {/* ⚠ The server's own answer, printed as it arrives. This block used to rank the three
              sources itself — the sitting FK, then the note, with the open tenure below under
              « Historique » — and it disagreed with the répartition and the export, which resolve
              them through `ServiceChefDirectory`. Pédiatrie1 read « Pr.N.Elhafidi » here and
              exported as « Youssef Alaoui », and neither screen said the other existed. One rule,
              one side of the boundary. */}
          {!chef ? (
            <Text size="sm" c="dimmed">
              Chef de service non communiqué par l’API (processus antérieur à ce champ).
            </Text>
          ) : chef.name ? (
            <>
              <Group gap="xs" wrap="nowrap" align="center">
                <Text size="sm" fw={500}>{chef.name}</Text>
                <Badge size="xs" variant="light" color={chef.fromSourceNote ? 'yellow' : 'teal'}>
                  {chef.fromSourceNote ? 'note (import)' : 'affectation'}
                </Badge>
              </Group>
              {chef.fromSourceNote && (
                <Alert color="yellow" variant="light" icon={<IconInfoCircle size={16} />} mt="xs">
                  <Text size="xs">
                    Nom repris de la fiche importée, <strong>sans date</strong>.{' '}
                    {chef.linkedChefWithheld ? (
                      // ⚠ The sentence the page owed and did not have: a tenure sits below marked
                      // « en cours » while the headline names somebody else, and nothing explained
                      // it. That is the confusion this whole change removes, not a detail.
                      <>
                        Un chef est pourtant <strong>rattaché</strong> à ce service (voir
                        ci-dessous), mais les documents ne lisent que la note pour l’instant : les
                        seules affectations enregistrées sont des liens de test.
                      </>
                    ) : (
                      <>
                        Désignez un chef de service pour que l’attribution soit datée et survive à
                        une réimpression de la répartition.
                      </>
                    )}
                  </Text>
                </Alert>
              )}
            </>
          ) : chef.linkedChefWithheld ? (
            // « Personne » and « quelqu'un que rien n'imprime » call for opposite acts, so they get
            // different sentences — the same rule as `ExportNotes` and `OutsideYearCount`.
            <Alert color="yellow" variant="light" icon={<IconInfoCircle size={16} />}>
              <Text size="xs">
                Un chef est <strong>rattaché</strong> à ce service (voir ci-dessous), mais aucun nom
                n’est imprimé : les documents ne lisent que la note d’import pour l’instant, et ce
                service n’en a pas.
              </Text>
            </Alert>
          ) : (
            <Text size="sm" c="dimmed">Aucun chef de service désigné.</Text>
          )}

          {/* ⚠ Shown whether or not it is the printed name. It is the *rattachement* — configuration
              an admin edits — and the attribution above is who PGSH names; under the current policy
              those differ on purpose. Left out, « un chef est rattaché (voir ci-dessous) » pointed at
              an « Historique » that lists tenures only, so a chef linked through this FK alone was
              nowhere on the page. */}
          {service.serviceChef && (
            <Group gap="xs" mt="xs" wrap="nowrap" align="center">
              <Badge size="xs" variant="light" color="blue">rattaché</Badge>
              <Text size="sm">
                {service.serviceChef.firstName} {service.serviceChef.lastName}
              </Text>
              <Text size="xs" c="dimmed">{service.serviceChef.grade}</Text>
            </Group>
          )}

          {chefHistory.length > 0 && (
            <>
              <Divider my="sm" label="Historique" labelPosition="left" />
              <Stack gap={6}>
                {chefHistory.map((tenure) => (
                  <Group key={`${tenure.employeeId}-${tenure.startDate}`} gap="xs" wrap="nowrap">
                    <Badge size="xs" variant="light" color={tenure.endDate ? 'gray' : 'teal'}>
                      {tenure.endDate ? 'passé' : 'en cours'}
                    </Badge>
                    <Text size="sm">{tenure.firstName} {tenure.lastName}</Text>
                    <Text size="xs" c="dimmed">{tenure.grade}</Text>
                    <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      depuis {tenure.startDate}{tenure.endDate && ` — ${tenure.endDate}`}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </>
          )}

          <Divider my="sm" label={`Équipe (${service.staff.length})`} labelPosition="left" />
          {service.staff.length === 0 ? (
            <Text size="sm" c="dimmed">Aucun membre rattaché.</Text>
          ) : (
            <Stack gap={4}>
              {service.staff.map((member) => (
                <Group key={member.id} gap="xs">
                  <IconUsers size={13} opacity={0.5} />
                  <Text size="sm">{member.firstName} {member.lastName}</Text>
                  <Text size="xs" c="dimmed">{member.grade}</Text>
                </Group>
              ))}
            </Stack>
          )}
        </Paper>
      </SimpleGrid>

      <ServiceFormModal
        opened={editOpen}
        serviceId={serviceId}
        hospitalOptions={hospitalOptions}
        onClose={closeEdit}
      />
    </Stack>
  );
}
