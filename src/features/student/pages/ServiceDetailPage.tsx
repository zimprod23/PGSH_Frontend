import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
  rem,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconBed,
  IconBuildingHospital,
  IconExternalLink,
  IconMapPin,
  IconStethoscope,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetServiceByIdQuery } from '../api/studentApi';

// ─── Full-width map with OSM link ─────────────────────────────────────────────

function MapSection({
  latitude,
  longitude,
  hospitalName,
}: {
  latitude: string;
  longitude: string;
  hospitalName: string;
}) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lon)) return null;

  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.012},${lat - 0.009},${lon + 0.012},${lat + 0.009}&layer=mapnik&marker=${lat},${lon}`;
  const fullSrc  = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=16`;

  return (
    <Box style={{ borderRadius: rem(12), overflow: 'hidden', border: '1px solid #E2E8F0', position: 'relative' }}>
      <iframe
        title={`Carte de ${hospitalName}`}
        src={embedSrc}
        width="100%"
        height={360}
        style={{ display: 'block', border: 'none' }}
        loading="lazy"
      />
      <Box style={{ position: 'absolute', bottom: rem(12), right: rem(12) }}>
        <Button
          component="a"
          href={fullSrc}
          target="_blank"
          rel="noopener noreferrer"
          size="xs"
          leftSection={<IconExternalLink size={12} />}
          variant="white"
          style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.25)' }}
        >
          Ouvrir dans OpenStreetMap
        </Button>
      </Box>
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServiceDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const { data: service, isLoading } = useGetServiceByIdQuery(Number(serviceId), { skip: !serviceId });

  const hasMap     = !!(service?.latitude && service?.longitude);
  // ⚠ Both read the server's attribution, never `serviceChef`. That field is the *link*, null on all
  // 148 services of the base — bound to it, this page said « aucun chef de service désigné » while
  // the student's own répartition named one for 140 of them.
  const chef       = service?.chefAttribution;
  const hasChef    = !!chef?.name;
  const staffCount = service?.staff.length ?? 0;

  return (
    <Container size="lg" pb="xl">
      <Stack gap="xl">

        {/* ── Back nav + title ────────────────────────────────────────────── */}
        <Group gap="sm">
          <ActionIcon variant="subtle" color="gray" radius="md" onClick={() => navigate(-1)}>
            <IconArrowLeft size={18} stroke={1.5} />
          </ActionIcon>
          {isLoading ? (
            <Stack gap={4}>
              <Skeleton height={28} width={220} radius="sm" />
              <Skeleton height={14} width={160} radius="sm" />
            </Stack>
          ) : (
            <Stack gap={2}>
              <Title order={2} fw={700}>{service?.name}</Title>
              <Group gap={4}>
                <IconBuildingHospital size={13} stroke={1.5} color="#94A3B8" />
                <Text size="xs" c="dimmed">
                  {service?.hospitalName} — {service?.hospitalCity}
                </Text>
              </Group>
            </Stack>
          )}
        </Group>

        {/* ── Stats chips ─────────────────────────────────────────────────── */}
        {isLoading ? (
          <Group gap="sm">
            <Skeleton height={26} width={100} radius="xl" />
            <Skeleton height={26} width={80} radius="xl" />
            <Skeleton height={26} width={90} radius="xl" />
          </Group>
        ) : (
          <Group gap="sm" wrap="wrap">
            <Badge
              size="md" color="navy" variant="light"
              leftSection={<IconStethoscope size={12} />}
            >
              {service?.serviceType}
            </Badge>
            <Badge
              size="md" color="blue" variant="outline"
              leftSection={<IconBed size={12} />}
            >
              {service?.capacity} places
            </Badge>
            {hasChef && (
              <Badge size="md" color="teal" variant="light" leftSection={<IconUser size={12} />}>
                Chef de service assigné
              </Badge>
            )}
            {staffCount > 0 && (
              <Badge size="md" color="grape" variant="light" leftSection={<IconUsers size={12} />}>
                {staffCount} membre{staffCount > 1 ? 's' : ''} du personnel
              </Badge>
            )}
          </Group>
        )}

        {/* ── Map (full width, prominent) ─────────────────────────────────── */}
        {isLoading ? (
          <Skeleton height={360} radius="md" />
        ) : hasMap ? (
          <MapSection
            latitude={service!.latitude!}
            longitude={service!.longitude!}
            hospitalName={service!.hospitalName}
          />
        ) : (
          <Box
            p="lg"
            style={{
              background: '#F8FAFC',
              borderRadius: rem(12),
              border: '1px dashed #CBD5E1',
              textAlign: 'center',
            }}
          >
            <Stack align="center" gap="xs" py="sm">
              <ThemeIcon size={44} radius="xl" variant="light" color="gray">
                <IconMapPin size={22} stroke={1.5} />
              </ThemeIcon>
              <Text size="sm" c="dimmed">Localisation non disponible pour cet hôpital</Text>
            </Stack>
          </Box>
        )}

        {/* ── Hospital address strip ───────────────────────────────────────── */}
        {!isLoading && (
          <Card padding="sm" radius="md" withBorder>
            <Group gap="sm" wrap="wrap">
              <ThemeIcon size={32} radius="md" variant="light" color="blue">
                <IconBuildingHospital size={16} stroke={1.5} />
              </ThemeIcon>
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={600}>{service?.hospitalName}</Text>
                <Group gap={4}>
                  <IconMapPin size={11} stroke={1.5} color="#94A3B8" />
                  <Text size="xs" c="dimmed">
                    {service?.hospitalCity}
                    {hasMap && (
                      <>
                        {' · '}
                        {parseFloat(service!.latitude!).toFixed(4)},{' '}
                        {parseFloat(service!.longitude!).toFixed(4)}
                      </>
                    )}
                  </Text>
                </Group>
              </Stack>
              {service?.hospitalDescription && (
                <Text
                  size="xs" c="dimmed"
                  style={{
                    borderLeft: `2px solid #E2E8F0`,
                    paddingLeft: rem(12),
                    maxWidth: 400,
                    lineHeight: 1.5,
                  }}
                >
                  {service.hospitalDescription}
                </Text>
              )}
            </Group>
          </Card>
        )}

        {/* ── Main content grid ────────────────────────────────────────────── */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">

          {/* Left: description + chef */}
          <Stack gap="md">
            {/* Description */}
            {(isLoading || service?.description) && (
              <Card padding="md" radius="lg" withBorder shadow="xs">
                <Stack gap="sm">
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: rem(0.8) }}>
                    À propos du service
                  </Text>
                  {isLoading ? (
                    <>
                      <Skeleton height={14} radius="sm" />
                      <Skeleton height={14} width="85%" radius="sm" />
                      <Skeleton height={14} width="70%" radius="sm" />
                    </>
                  ) : (
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.75 }}>
                      {service?.description}
                    </Text>
                  )}
                </Stack>
              </Card>
            )}

            {/* Chef de service */}
            <Card padding="md" radius="lg" withBorder shadow="xs">
              <Stack gap="sm">
                <Group gap="sm">
                  <ThemeIcon size={28} radius="md" variant="light" color="teal">
                    <IconUser size={14} stroke={1.5} />
                  </ThemeIcon>
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: rem(0.8) }}>
                    Chef de service
                  </Text>
                </Group>
                <Divider />
                {isLoading ? (
                  <Skeleton height={64} radius="md" />
                ) : !chef ? (
                  /* Unknown, not « personne » — an API predating the field. The two call for
                     different reactions, so they do not share a sentence. */
                  <Stack align="center" gap="xs" py="sm">
                    <ThemeIcon size={36} radius="xl" variant="light" color="gray">
                      <IconUser size={18} stroke={1.5} />
                    </ThemeIcon>
                    <Text size="sm" c="dimmed">Information non disponible</Text>
                  </Stack>
                ) : !chef.name ? (
                  <Stack align="center" gap="xs" py="sm">
                    <ThemeIcon size={36} radius="xl" variant="light" color="gray">
                      <IconUser size={18} stroke={1.5} />
                    </ThemeIcon>
                    <Text size="sm" c="dimmed">
                      {chef.linkedChefWithheld ? 'Non communiqué' : 'Aucun chef de service désigné'}
                    </Text>
                  </Stack>
                ) : !service?.serviceChef || chef.fromSourceNote ? (
                  /* The name comes from the service's own fiche: there is no employee record behind
                     it, so no grade and no PPR — and it is undated, which the line below says
                     without jargon. Inventing a « Dr. » or an avatar from initials here would dress
                     a note up as a personnel record. */
                  <Stack gap={4} p="sm" style={{
                    background: '#F8FAFC',
                    borderRadius: rem(10),
                    border: '1px solid #E2E8F0',
                  }}>
                    <Text size="sm" fw={700}>{chef.name}</Text>
                    <Text size="xs" c="dimmed">D'après la fiche du service</Text>
                  </Stack>
                ) : (
                  <Group
                    gap="md" p="sm"
                    style={{
                      background: '#F0FDF9',
                      borderRadius: rem(10),
                      border: '1px solid #CCFBF1',
                    }}
                  >
                    <Avatar size={48} radius="xl" color="teal" variant="filled">
                      {service.serviceChef.firstName[0]}{service.serviceChef.lastName[0]}
                    </Avatar>
                    <Stack gap={4}>
                      <Text size="sm" fw={700}>
                        Dr. {service.serviceChef.firstName} {service.serviceChef.lastName}
                      </Text>
                      <Group gap="xs">
                        <Badge size="xs" color="teal" variant="light">
                          {service.serviceChef.grade}
                        </Badge>
                        {service.serviceChef.ppr && (
                          <Text size="xs" c="dimmed">PPR : {service.serviceChef.ppr}</Text>
                        )}
                      </Group>
                    </Stack>
                  </Group>
                )}
              </Stack>
            </Card>
          </Stack>

          {/* Right: staff list */}
          <Card padding="md" radius="lg" withBorder shadow="xs">
            <Stack gap="sm">
              <Group justify="space-between">
                <Group gap="sm">
                  <ThemeIcon size={28} radius="md" variant="light" color="grape">
                    <IconUsers size={14} stroke={1.5} />
                  </ThemeIcon>
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: rem(0.8) }}>
                    Personnel médical
                  </Text>
                </Group>
                {service && (
                  <Badge size="sm" color="grape" variant="light">
                    {staffCount} membre{staffCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </Group>
              <Divider />
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={56} radius="md" />)
              ) : !staffCount ? (
                <Stack align="center" gap="xs" py="xl">
                  <ThemeIcon size={44} radius="xl" variant="light" color="gray">
                    <IconUsers size={22} stroke={1.5} />
                  </ThemeIcon>
                  <Text size="sm" c="dimmed">Aucun personnel assigné à ce service</Text>
                </Stack>
              ) : (
                <Stack gap="xs">
                  {service!.staff.map((member) => (
                    <Group
                      key={member.id}
                      gap="sm"
                      wrap="nowrap"
                      p="xs"
                      style={{ borderRadius: rem(8), background: '#FAFAFA', border: '1px solid #F1F5F9' }}
                    >
                      <Avatar size={38} radius="xl" color="grape" variant="light">
                        {member.firstName[0]}{member.lastName[0]}
                      </Avatar>
                      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500} truncate>
                          {member.firstName} {member.lastName}
                        </Text>
                        <Group gap="xs">
                          <Badge size="xs" color="grape" variant="dot">{member.grade}</Badge>
                          {member.ppr && (
                            <Text size="xs" c="dimmed">PPR : {member.ppr}</Text>
                          )}
                        </Group>
                      </Stack>
                    </Group>
                  ))}
                </Stack>
              )}
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
