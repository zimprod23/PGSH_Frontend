import { useState } from "react";
import {
  Stack,
  Title,
  Text,
  Button,
  Group,
  Paper,
  Badge,
  Table,
  ActionIcon,
  Menu,
  Modal,
  TextInput,
  Select,
  Textarea,
  FileInput,
  Divider,
  Alert,
  ThemeIcon,
  Box,
  Tooltip,
  ScrollArea,
} from "@mantine/core";
import {
  IconPlus,
  IconDotsVertical,
  IconEye,
  IconDownload,
  IconFileText,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconMessage2,
  IconInbox,
} from "@tabler/icons-react";
import type { StudentDemand } from "../types";

// --- MOCK DATA ---
const MOCK_DEMANDS: StudentDemand[] = [
  {
    id: "1",
    type: "Convention de Stage",
    title: "Stage PFE - Dev Backend",
    body: "Je sollicite une convention pour mon stage chez...",
    status: "APPROVED",
    createdAt: "2026-01-20",
    response: {
      message: "Convention signée disponible en téléchargement.",
      fileUrl: "#",
      respondedAt: new Date().toISOString(),
    },
  },
  {
    id: "2",
    type: "Autre",
    title: "Correction de Nom",
    body: "Mon nom est mal orthographié sur mon compte...",
    status: "PENDING",
    createdAt: "2026-01-28",
  },
];

export default function DemandsPage() {
  const [opened, setOpened] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<StudentDemand | null>(
    null
  );

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="center">
        <Box>
          <Title order={2} fw={800} style={{ letterSpacing: "-0.5px" }}>
            Mes Demandes
          </Title>
          <Text c="dimmed" size="sm">
            Gérez et suivez l'état de vos requêtes administratives
          </Text>
        </Box>
        <Button
          leftSection={<IconPlus size={18} />}
          radius="md"
          onClick={() => setOpened(true)}
          // FIX 1: Use width style for responsiveness instead of fullWidth object
          w={{ base: "100%", sm: "auto" }}
        >
          Nouvelle Demande
        </Button>
      </Group>

      <Paper withBorder radius="lg" shadow="xs" style={{ overflow: "hidden" }}>
        <ScrollArea h={MOCK_DEMANDS.length > 0 ? "auto" : 300}>
          {/* FIX 2: Use miw (Minimum Width) shorthand prop instead of minWidth */}
          <Table
            verticalSpacing="md"
            horizontalSpacing="xl"
            highlightOnHover
            miw={700}
          >
            <Table.Thead
              bg="gray.0"
              style={{ position: "sticky", top: 0, zIndex: 1 }}
            >
              <Table.Tr>
                <Table.Th style={{ width: "40%" }}>Type & Titre</Table.Th>
                <Table.Th>Date de soumission</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th ta="right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {MOCK_DEMANDS.length > 0 ? (
                MOCK_DEMANDS.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <ThemeIcon
                          variant="light"
                          color="blue"
                          radius="md"
                          visibleFrom="sm"
                        >
                          <IconFileText size={16} />
                        </ThemeIcon>
                        <Box>
                          <Text size="sm" fw={700}>
                            {item.title}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {item.type}
                          </Text>
                        </Box>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{item.createdAt}</Text>
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge status={item.status} />
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        <Tooltip
                          label={
                            item.response ? "Voir la réponse" : "En attente"
                          }
                        >
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => setSelectedDemand(item)}
                            disabled={!item.response}
                          >
                            <IconMessage2 size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <DemandMenu />
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <EmptyState />
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      <CreateDemandModal opened={opened} onClose={() => setOpened(false)} />
      <ViewResponseModal
        demand={selectedDemand}
        onClose={() => setSelectedDemand(null)}
      />
    </Stack>
  );
}

// --- SUB-COMPONENTS (SRP) ---

function StatusBadge({ status }: { status: StudentDemand["status"] }) {
  const configs = {
    PENDING: {
      color: "orange",
      label: "En cours",
      icon: <IconClock size={12} />,
    },
    APPROVED: {
      color: "green",
      label: "Acceptée",
      icon: <IconCircleCheck size={12} />,
    },
    REJECTED: {
      color: "red",
      label: "Rejetée",
      icon: <IconCircleX size={12} />,
    },
  };
  const config = configs[status];
  return (
    <Badge
      color={config.color}
      variant="light"
      leftSection={config.icon}
      radius="sm"
    >
      {config.label}
    </Badge>
  );
}

function CreateDemandModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const [type, setType] = useState<string | null>(null);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="lg">
          Nouvelle Demande Administrative
        </Text>
      }
      size="lg"
      radius="md"
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
    >
      <Stack gap="md">
        <Select
          label="Nature de la demande"
          placeholder="Choisissez un motif"
          data={[
            { value: "attestation", label: "Attestation de scolarité" },
            { value: "releve", label: "Relevé de notes" },
            { value: "convention", label: "Convention de Stage" },
            { value: "autre", label: "Autre (Saisie personnalisée)" },
          ]}
          value={type}
          onChange={setType}
          required
        />

        {type === "autre" && (
          <TextInput
            label="Spécifiez le type de document"
            placeholder="Ex: Attestation de réussite..."
            required
          />
        )}

        <TextInput
          label="Objet"
          placeholder="Titre court de votre demande"
          required
        />

        <Textarea
          label="Corps de la demande"
          placeholder="Détaillez votre requête ici..."
          required
          autosize
          minRows={4}
          maxRows={12}
        />

        <FileInput
          label="Pièce jointe"
          description="Formats : PDF, PNG, JPG (Max 5MB)"
          placeholder="Ajouter un document"
          leftSection={<IconDownload size={14} />}
          clearable
        />

        <Divider mt="md" />

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="filled" px="xl" onClick={onClose}>
            Soumettre
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function ViewResponseModal({
  demand,
  onClose,
}: {
  demand: StudentDemand | null;
  onClose: () => void;
}) {
  if (!demand) return null;
  return (
    <Modal
      opened={!!demand}
      onClose={onClose}
      title="Détails de la réponse"
      radius="md"
    >
      <Stack gap="md">
        <Alert color="blue" icon={<IconMessage2 size={18} />}>
          <Text fw={700} size="sm" mb={4}>
            Administration :
          </Text>
          <Text size="sm">
            {demand.response?.message || "Aucun message d'accompagnement."}
          </Text>
        </Alert>

        {demand.response?.fileUrl && (
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Group>
                <ThemeIcon color="green" variant="light">
                  <IconFileText size={18} />
                </ThemeIcon>
                <Text size="sm" fw={500}>
                  Document_Reponse.pdf
                </Text>
              </Group>
              <ActionIcon variant="light" color="blue">
                <IconDownload size={18} />
              </ActionIcon>
            </Group>
          </Paper>
        )}
        <Button fullWidth onClick={onClose} mt="md">
          Fermer
        </Button>
      </Stack>
    </Modal>
  );
}

function DemandMenu() {
  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray">
          <IconDotsVertical size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconEye size={14} />}>Détails</Menu.Item>
        <Menu.Item color="red" leftSection={<IconCircleX size={14} />}>
          Annuler
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function EmptyState() {
  return (
    <Stack align="center" py={50} gap="xs">
      <ThemeIcon size={50} radius={50} variant="light" color="gray">
        <IconInbox size={30} />
      </ThemeIcon>
      <Text fw={600}>Aucune demande</Text>
      <Text size="sm" c="dimmed">
        Vos demandes apparaîtront ici.
      </Text>
    </Stack>
  );
}
