import { Container, Skeleton, Stack } from '@mantine/core';

// Full rebuild in Phase 2
export default function StageDetailsPage() {
  return (
    <Container size="md" py="xl">
      <Stack>
        <Skeleton height={200} radius="lg" animate={false} />
        <Skeleton height={60}  radius="md" animate={false} />
        <Skeleton height={60}  radius="md" animate={false} />
      </Stack>
    </Container>
  );
}
