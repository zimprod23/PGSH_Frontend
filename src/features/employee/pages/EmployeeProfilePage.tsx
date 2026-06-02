import {
  Avatar,
  Badge,
  Box,
  Card,
  Container,
  Grid,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  Title,
  rem,
} from '@mantine/core';
import {
  IconBriefcase,
  IconMail,
  IconUser,
  IconId,
  IconBuilding,
  IconMapPin,
  IconCalendar,
} from '@tabler/icons-react';
import { useGetCurrentEmployeeQuery } from '../api/employeeApi';
import { ProfileFieldCell } from '../../student/components/ProfileFieldCell';
import {
  GRADE_LABELS,
  POSITION_LABELS,
  WORKPLACE_LABELS,
} from '../types/employee.types';

export default function EmployeeProfilePage() {
  const { data: me, isLoading } = useGetCurrentEmployeeQuery();

  const displayName = me
    ? `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim() || me.email
    : '…';

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase() ?? '')
    .join('');

  const gradeLabel    = me?.grade    ? GRADE_LABELS[me.grade]       : '—';
  const positionLabel = me?.position ? POSITION_LABELS[me.position] : '—';
  const workPlaceLabel = me?.workPlace ? WORKPLACE_LABELS[me.workPlace] : '—';

  return (
    <Container fluid maw={960}>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={1} fw={800}>Mon Profil</Title>
          <Text size="sm" c="dimmed">Vos informations personnelles et professionnelles.</Text>
        </Stack>

        <Grid gutter="lg">
          {/* Left panel */}
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Card padding={0} radius="lg" withBorder shadow="sm" style={{ overflow: 'hidden' }}>
              <Box
                style={{
                  background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)',
                  height: 100,
                }}
              />
              <Stack align="center" gap="xs" pb="xl" px="md" mt={-36}>
                <Avatar
                  size={68}
                  radius="xl"
                  style={{
                    background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: rem(22),
                    border: '3px solid #fff',
                  }}
                >
                  {initials}
                </Avatar>
                {isLoading ? (
                  <Skeleton height={20} width={120} radius="sm" />
                ) : (
                  <Text fw={700} size="md" ta="center">{displayName}</Text>
                )}
                {isLoading ? (
                  <Skeleton height={18} width={80} radius="xl" />
                ) : (
                  <Badge variant="outline" color="navy" radius="xl" size="sm">
                    {gradeLabel}
                  </Badge>
                )}
              </Stack>
            </Card>
          </Grid.Col>

          {/* Right panel */}
          <Grid.Col span={{ base: 12, sm: 8 }}>
            <Card padding="lg" radius="lg" withBorder shadow="sm">
              <Tabs defaultValue="personal">
                <Tabs.List mb="lg">
                  <Tabs.Tab value="personal">Informations personnelles</Tabs.Tab>
                  <Tabs.Tab value="professional">Informations professionnelles</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="personal">
                  {isLoading ? (
                    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} height={64} radius="md" />
                      ))}
                    </SimpleGrid>
                  ) : (
                    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
                      <ProfileFieldCell
                        icon={IconUser}
                        iconColor="navy"
                        label="Prénom"
                        value={me?.firstName || '—'}
                      />
                      <ProfileFieldCell
                        icon={IconUser}
                        iconColor="navy"
                        label="Nom"
                        value={me?.lastName || '—'}
                      />
                      <ProfileFieldCell
                        icon={IconMail}
                        iconColor="sky"
                        label="Email"
                        value={me?.email || '—'}
                      />
                      <ProfileFieldCell
                        icon={IconId}
                        iconColor="teal"
                        label="CIN"
                        value={me?.cin || '—'}
                        mono
                      />
                      <ProfileFieldCell
                        icon={IconCalendar}
                        iconColor="gray"
                        label="Date de naissance"
                        value={me?.dateOfBirth || '—'}
                      />
                      <ProfileFieldCell
                        icon={IconMapPin}
                        iconColor="gray"
                        label="Lieu de naissance"
                        value={me?.placeOfBirth || '—'}
                      />
                    </SimpleGrid>
                  )}
                </Tabs.Panel>

                <Tabs.Panel value="professional">
                  {isLoading ? (
                    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} height={64} radius="md" />
                      ))}
                    </SimpleGrid>
                  ) : (
                    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
                      <ProfileFieldCell
                        icon={IconBriefcase}
                        iconColor="navy"
                        label="Grade"
                        value={gradeLabel}
                      />
                      <ProfileFieldCell
                        icon={IconBriefcase}
                        iconColor="sky"
                        label="Poste"
                        value={positionLabel}
                      />
                      <ProfileFieldCell
                        icon={IconBuilding}
                        iconColor="teal"
                        label="Lieu de travail"
                        value={workPlaceLabel}
                      />
                      <ProfileFieldCell
                        icon={IconId}
                        iconColor="gray"
                        label="PPR"
                        value={me?.ppr || '—'}
                        mono
                      />
                      {me?.label && (
                        <ProfileFieldCell
                          icon={IconUser}
                          iconColor="gray"
                          label="Intitulé"
                          value={me.label}
                        />
                      )}
                      {me?.pvSignatureDate && (
                        <ProfileFieldCell
                          icon={IconCalendar}
                          iconColor="gray"
                          label="Date PV"
                          value={me.pvSignatureDate}
                        />
                      )}
                    </SimpleGrid>
                  )}
                </Tabs.Panel>
              </Tabs>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
