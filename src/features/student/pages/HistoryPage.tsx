import { Container, Skeleton, Stack } from '@mantine/core';

// Full rebuild in Phase 2
export default function HistoryPage() {
  return (
    <Container size="md" py="xl">
      <Stack>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={72} radius="md" animate={false} />
        ))}
      </Stack>
    </Container>
  );
}
