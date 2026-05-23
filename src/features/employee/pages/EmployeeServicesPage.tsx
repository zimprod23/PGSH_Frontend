import {
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Modal,
  NumberInput,
  Skeleton,
  Stack,
  Table,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  rem,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBuildingHospital, IconClipboardList, IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { useGetCurrentUserQuery, useGetMyServicesAsChefQuery, useGetServicePeriodsByServiceQuery, useSubmitEvaluationMutation } from '../api/employeeApi';
import type { MyServicePeriodResponse } from '../types/employee.types';
import { useNotify } from '../../../common/hooks/useNotify';

// ─── Evaluation modal ─────────────────────────────────────────────────────────

function EvaluationModal({
  period,
  opened,
  onClose,
}: {
  period: MyServicePeriodResponse | null;
  opened: boolean;
  onClose: () => void;
}) {
  const notify = useNotify();
  const [score, setScore]     = useState<number>(10);
  const [comment, setComment] = useState('');
  const [submit, { isLoading }] = useSubmitEvaluationMutation();

  const handleSubmit = async () => {
    if (!period) return;
    try {
      await submit({
        servicePeriodId: period.id,
        totalScore: score,
        supervisorComment: comment.trim() || undefined,
        objectiveScores: [],
      }).unwrap();
      notify.success('Évaluation soumise');
      onClose();
    } catch {
      notify.error('Erreur lors de la soumission');
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Évaluation — ${period?.studentFullName ?? ''}`}
      size="sm"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Période : {period?.startDate} → {period?.endDate}
        </Text>

        <NumberInput
          label="Note finale (0 – 20)"
          value={score}
          onChange={(v) => setScore(Number(v) || 0)}
          min={0}
          max={20}
          step={0.5}
          decimalScale={2}
          required
        />

        <Textarea
          label="Commentaire du superviseur"
          placeholder="Observations, points forts, axes d'amélioration…"
          value={comment}
          onChange={(e) => setComment(e.currentTarget.value)}
          minRows={3}
          maxRows={6}
          autosize
        />

        <Group justify="flex-end" pt="sm" style={{ borderTop: '1px solid #E2E8F0' }}>
          <Button variant="subtle" color="gray" onClick={onClose}>Annuler</Button>
          <Button
            color="navy"
            loading={isLoading}
            leftSection={<IconCheck size={16} stroke={1.5} />}
            onClick={handleSubmit}
          >
            Soumettre
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Service card ─────────────────────────────────────────────────────────────

function ServiceCard({ serviceId, serviceName, hospitalName }: {
  serviceId: number;
  serviceName: string;
  hospitalName: string;
}) {
  const [evalPeriod, setEvalPeriod] = useState<MyServicePeriodResponse | null>(null);
  const [modalOpen, { open: openModal, close: closeModal }] = useDisclosure(false);

  const { data: activePage, isLoading: loadingActive } =
    useGetServicePeriodsByServiceQuery({ serviceId, isComplete: false });

  const { data: donePage, isLoading: loadingDone } =
    useGetServicePeriodsByServiceQuery({ serviceId, isComplete: true });

  const active   = activePage?.items ?? [];
  const done     = donePage?.items ?? [];
  const pending  = done.filter((p) => !p.hasEvaluation);

  return (
    <>
      <Card padding="lg" radius="lg" withBorder shadow="sm">
        <Stack gap="md">
          <Group gap="sm">
            <ThemeIcon size={40} radius="md" variant="light" color="navy">
              <IconBuildingHospital size={20} stroke={1.5} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text fw={700} size="md">{serviceName}</Text>
              <Text size="xs" c="dimmed">{hospitalName}</Text>
            </Stack>
          </Group>

          <Divider label="Rotations en cours" labelPosition="left" />

          {loadingActive ? (
            <Skeleton height={48} radius="md" />
          ) : active.length === 0 ? (
            <Text size="sm" c="dimmed">Aucune rotation active.</Text>
          ) : (
            <Table striped verticalSpacing="xs" fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Étudiant</Table.Th>
                  <Table.Th>Début</Table.Th>
                  <Table.Th>Fin</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {active.map((p) => (
                  <Table.Tr key={p.id}>
                    <Table.Td>{p.studentFullName}</Table.Td>
                    <Table.Td><Text ff="monospace" size="xs">{p.startDate}</Text></Table.Td>
                    <Table.Td><Text ff="monospace" size="xs">{p.endDate}</Text></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}

          {pending.length > 0 && (
            <>
              <Divider
                label={
                  <Group gap="xs">
                    <Text size="xs">Évaluations en attente</Text>
                    <Badge size="xs" color="orange" variant="light">{pending.length}</Badge>
                  </Group>
                }
                labelPosition="left"
              />

              {loadingDone ? (
                <Skeleton height={48} radius="md" />
              ) : (
                <Table striped verticalSpacing="xs" fz="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Étudiant</Table.Th>
                      <Table.Th>Période</Table.Th>
                      <Table.Th w={rem(140)} />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {pending.map((p) => (
                      <Table.Tr key={p.id}>
                        <Table.Td>{p.studentFullName}</Table.Td>
                        <Table.Td>
                          <Text ff="monospace" size="xs">{p.startDate} → {p.endDate}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Button
                            size="xs"
                            variant="light"
                            color="navy"
                            leftSection={<IconClipboardList size={14} stroke={1.5} />}
                            onClick={() => { setEvalPeriod(p); openModal(); }}
                          >
                            Évaluer
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </>
          )}
        </Stack>
      </Card>

      <EvaluationModal period={evalPeriod} opened={modalOpen} onClose={closeModal} />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeeServicesPage() {
  const { data: me } = useGetCurrentUserQuery();

  const { data: servicesPage, isLoading } = useGetMyServicesAsChefQuery(
    me?.id ?? '', { skip: !me?.id }
  );

  const services = servicesPage?.items ?? [];

  return (
    <Container fluid>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={2} fw={700}>Mes Services</Title>
          <Text size="sm" c="dimmed">
            Services dont vous êtes chef — rotations actives et évaluations en attente.
          </Text>
        </Stack>

        {isLoading ? (
          <Stack gap="md">
            {[1, 2].map((i) => <Skeleton key={i} height={200} radius="lg" />)}
          </Stack>
        ) : services.length === 0 ? (
          <Card padding="xl" radius="lg" withBorder shadow="sm">
            <Stack align="center" gap="sm">
              <ThemeIcon size={56} radius="xl" variant="light" color="gray">
                <IconBuildingHospital size={28} stroke={1.5} />
              </ThemeIcon>
              <Text fw={600} c="dimmed">Aucun service assigné</Text>
              <Text size="sm" c="dimmed" ta="center" maw={320}>
                Vous n'êtes actuellement chef d'aucun service. Contactez l'administrateur.
              </Text>
            </Stack>
          </Card>
        ) : (
          <Stack gap="lg">
            {services.map((s) => (
              <ServiceCard
                key={s.id}
                serviceId={s.id}
                serviceName={s.name}
                hospitalName={s.hospitalName}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
