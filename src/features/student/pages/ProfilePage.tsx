import { Container, Skeleton, Stack } from '@mantine/core';
import { useGetCurrentStudentQuery } from '../api/studentApi';

// Full rebuild in Phase 2 — currently shows real data skeleton
export default function ProfilePage() {
  const { isLoading } = useGetCurrentStudentQuery();

  if (isLoading) {
    return (
      <Container size="md" py="xl">
        <Stack>
          <Skeleton height={120} radius="lg" />
          <Skeleton height={40}  radius="md" />
          <Skeleton height={40}  radius="md" />
          <Skeleton height={40}  radius="md" />
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Skeleton height={400} radius="lg" animate={false} />
    </Container>
  );
}
