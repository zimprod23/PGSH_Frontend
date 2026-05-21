import { Container, Skeleton, SimpleGrid } from '@mantine/core';

// Full rebuild in Phase 2
export default function StageListPage() {
  return (
    <Container py="xl">
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height={160} radius="lg" animate={false} />
        ))}
      </SimpleGrid>
    </Container>
  );
}
