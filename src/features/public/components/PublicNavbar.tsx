import {
  Box,
  Burger,
  Button,
  Container,
  Divider,
  Drawer,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate, useLocation } from 'react-router-dom';
import { PATHS } from '../../../routes/paths';

export function PublicNavbar() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  const navLinks = [
    { label: 'Accueil', path: '#accueil' },
    { label: 'À Propos', path: '/about'  },
    { label: 'Contact',  path: '#contact' },
  ];

  const handleNavClick = (path: string) => {
    close();
    if (path.startsWith('#')) {
      const id = path.slice(1);
      if (location.pathname === '/') {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate(`/${path}`);
      }
    } else {
      navigate(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <Box
      component="header"
      h={70}
      bg="white"
      style={{ borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 1000 }}
    >
      <Container size="lg" h="100%">
        <Group justify="space-between" h="100%">
          <Text
            fw={900}
            size="xl"
            c="navy.6"
            style={{ cursor: 'pointer' }}
            onClick={() => handleNavClick('#accueil')}
          >
            PGSH
          </Text>

          {/* Desktop */}
          <Group gap={5} visibleFrom="sm">
            {navLinks.map((link) => (
              <Button key={link.label} variant="subtle" color="gray" onClick={() => handleNavClick(link.path)}>
                {link.label}
              </Button>
            ))}
            <Divider orientation="vertical" mx="sm" />
            <Button variant="default" onClick={() => navigate(PATHS.STUDENT.ROOT)}>
              Espace Étudiant
            </Button>
            <Button color="navy" onClick={() => navigate(PATHS.EMPLOYEE)}>
              Espace Employé
            </Button>
          </Group>

          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        </Group>
      </Container>

      {/* Mobile drawer */}
      <Drawer opened={opened} onClose={close} size="100%" padding="md" title="Menu" hiddenFrom="sm" zIndex={2000}>
        <Stack gap="md">
          {navLinks.map((link) => (
            <Button key={link.label} variant="light" fullWidth onClick={() => handleNavClick(link.path)}>
              {link.label}
            </Button>
          ))}
          <Divider label="Accès" labelPosition="center" />
          <Button variant="outline" color="navy" fullWidth onClick={() => { close(); navigate(PATHS.STUDENT.ROOT); }}>
            Espace Étudiant
          </Button>
          <Button color="navy" fullWidth onClick={() => { close(); navigate(PATHS.EMPLOYEE); }}>
            Espace Employé
          </Button>
        </Stack>
      </Drawer>
    </Box>
  );
}
