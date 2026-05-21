import { Box, Button, Container, Group, Stack, Text, ThemeIcon, Title, rem } from '@mantine/core';
import { IconStethoscope } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export default function EmployeePage() {
  const navigate = useNavigate();

  return (
    <Box
      style={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top left, #E8F1FB 0%, #ffffff 100%)',
      }}
    >
      <Container size="xs">
        <Stack align="center" gap="xl">
          <ThemeIcon size={80} radius="xl" variant="light" color="navy">
            <IconStethoscope style={{ width: rem(40), height: rem(40) }} stroke={1.5} />
          </ThemeIcon>

          <Stack align="center" gap="xs">
            <Title order={2} ta="center">Espace Professeur & Employé</Title>
            <Text c="dimmed" ta="center" maw={380}>
              Cet espace est en cours de développement. Il permettra aux professeurs
              et employés hospitaliers de gérer les évaluations, les présences et
              les affectations de service.
            </Text>
          </Stack>

          <Group>
            <Button variant="default" onClick={() => navigate('/')}>Retour à l'accueil</Button>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
