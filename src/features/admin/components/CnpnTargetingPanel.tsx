import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconLock,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useState } from 'react';
import { usePreviewCnpnTargetMutation, useApplyCnpnTargetMutation } from '../api/adminApi';
import type { CnpnTargetPreview, CnpnTargetRowStatus, CnpnVersionResponse } from '../types/admin.types';
import type { AcademicProgram } from '../../../common/types';
import { useNotify } from '../../../common/hooks/useNotify';

/**
 * Rattacher une promotion à un CNPN.
 *
 * The rule is authored, previewed, then frozen — never applied blind. Which text a student follows
 * decides how many years they owe, so the population is shown before it is committed, and the two
 * cases a human has to settle are listed rather than resolved:
 *
 * - **entrée antérieure** — the rule catches them, the arrêté's own wording does not (the repeater
 *   sitting in an early level). Included only if the faculty ticks the box.
 * - **déjà rattaché** — confirmed under another text. Never moved in bulk; that stays a per-student
 *   decision, because doing it wholesale is exactly how the guard gets defeated.
 */

const STATUS_META: Record<CnpnTargetRowStatus, { label: string; color: string }> = {
  WillAssign:             { label: 'À rattacher',      color: 'teal'   },
  AlreadyOnThisText:      { label: 'Déjà à jour',      color: 'gray'   },
  EntryPredatesText:      { label: 'Entrée antérieure', color: 'orange' },
  ConfirmedOnAnotherText: { label: 'Déjà rattaché',    color: 'red'    },
};

interface Props {
  version: CnpnVersionResponse;
}

export function CnpnTargetingPanel({ version }: Props) {
  const notify = useNotify();

  const [maxLevelYear, setMaxLevelYear] = useState<number | string>(2);
  const [includeContradictions, setIncludeContradictions] = useState(false);
  const [preview, setPreview] = useState<CnpnTargetPreview | null>(null);
  const [applied, setApplied] = useState(false);

  const [runPreview, { isLoading: previewing }] = usePreviewCnpnTargetMutation();
  const [runApply, { isLoading: applying }] = useApplyCnpnTargetMutation();

  const criteria = {
    cnpnVersionId: version.id,
    program: version.academicProgram as AcademicProgram,
    maxLevelYear: Number(maxLevelYear) || 1,
    includeEntryContradictions: includeContradictions,
  };

  // A text with no intake year binds nobody — the server refuses, so say so before the click.
  const blocked = !version.governsAnIntake
    ? 'Ce CNPN ne régit aucune promotion : renseignez son année d’entrée en vigueur d’abord.'
    : null;

  // Any change to the rule invalidates the plan on screen; never let an apply run against a preview
  // the criteria no longer match.
  const invalidate = () => { setPreview(null); setApplied(false); };

  const handlePreview = async () => {
    try {
      setPreview(await runPreview(criteria).unwrap());
      setApplied(false);
    } catch (err: unknown) {
      notify.error((err as { data?: { detail?: string } })?.data?.detail ?? 'Simulation impossible');
    }
  };

  const handleApply = async () => {
    try {
      setPreview(await runApply(criteria).unwrap());
      setApplied(true);
      notify.success('Rattachement enregistré');
    } catch (err: unknown) {
      notify.error((err as { data?: { detail?: string } })?.data?.detail ?? 'Rattachement impossible');
    }
  };

  return (
    <Card padding="lg" radius="lg" withBorder shadow="sm">
      <Stack gap="md">
        <Group gap="sm">
          <ThemeIcon size={36} radius="md" variant="light" color="navy">
            <IconUsersGroup size={20} stroke={1.5} />
          </ThemeIcon>
          <Stack gap={0}>
            <Text fw={600} size="sm">Étudiants rattachés à ce CNPN</Text>
            <Text size="xs" c="dimmed">
              {version.studentCount} étudiant(s) suivent actuellement {version.code}.
              {version.appliesToEntrantsFromLabel &&
                ` Les nouveaux inscrits à partir de ${version.appliesToEntrantsFromLabel} y sont rattachés automatiquement.`}
            </Text>
          </Stack>
        </Group>

        <Divider />

        {blocked ? (
          <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />}>{blocked}</Alert>
        ) : (
          <>
            <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
              La règle ne concerne que les étudiants <strong>déjà inscrits</strong>. Les promotions à
              venir sont couvertes par l’année d’entrée en vigueur du texte.
            </Alert>

            <Group align="flex-end" gap="md" wrap="wrap">
              <NumberInput
                label="Jusqu’à l’année"
                description={`${version.academicProgram} — cette année et en dessous`}
                value={maxLevelYear}
                onChange={(v) => { setMaxLevelYear(v); invalidate(); }}
                min={1}
                max={version.totalYears}
                w={220}
              />
              <Checkbox
                label="Inclure les entrées antérieures au texte"
                description="Les redoublants que l’arrêté exclut normalement"
                checked={includeContradictions}
                onChange={(e) => { setIncludeContradictions(e.currentTarget.checked); invalidate(); }}
                color="orange"
              />
              <Button
                variant="light" color="navy" loading={previewing}
                onClick={handlePreview}
              >
                Simuler
              </Button>
            </Group>
          </>
        )}

        {preview && (
          <>
            <Divider label={applied ? 'Rattachement effectué' : 'Simulation'} labelPosition="left" />

            <Group gap="xs" wrap="wrap">
              <Badge variant="light" color="gray">{preview.totalMatched} concerné(s)</Badge>
              <Badge variant="light" color="teal">
                {preview.willAssign} {applied ? 'rattaché(s)' : 'à rattacher'}
              </Badge>
              {preview.alreadyOnThisText > 0 && (
                <Badge variant="light" color="gray">{preview.alreadyOnThisText} déjà à jour</Badge>
              )}
              {preview.entryPredatesText > 0 && (
                <Badge variant="light" color="orange">
                  {preview.entryPredatesText} entrée antérieure
                </Badge>
              )}
              {preview.confirmedOnAnotherText > 0 && (
                <Tooltip
                  label="Rattachés de façon confirmée à un autre CNPN. Un changement se décide étudiant par étudiant."
                  multiline w={280}
                >
                  <Badge variant="light" color="red" leftSection={<IconLock size={11} />}>
                    {preview.confirmedOnAnotherText} déjà rattaché(s)
                  </Badge>
                </Tooltip>
              )}
            </Group>

            {preview.needsAttention.length > 0 && (
              <Card padding="sm" radius="md" withBorder bg="#fffbeb">
                <Text size="xs" fw={600} mb="xs">
                  À examiner — {preview.needsAttentionTotal} cas
                  {preview.needsAttention.length < preview.needsAttentionTotal &&
                    ` (${preview.needsAttention.length} affichés)`}
                </Text>
                <Table fz="xs" verticalSpacing={4}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Étudiant</Table.Th>
                      <Table.Th>Niveau</Table.Th>
                      <Table.Th>1re inscription</Table.Th>
                      <Table.Th>CNPN actuel</Table.Th>
                      <Table.Th>Cas</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {preview.needsAttention.map((row) => (
                      <Table.Tr key={row.studentId}>
                        <Table.Td>
                          {row.fullName}
                          <Text component="span" c="dimmed" ff="monospace" ml={6}>{row.cne}</Text>
                        </Table.Td>
                        <Table.Td>{row.levelLabel ?? '—'}</Table.Td>
                        <Table.Td>{row.entryYearLabel ?? '—'}</Table.Td>
                        <Table.Td>{row.currentCnpnCode ?? '—'}</Table.Td>
                        <Table.Td>
                          <Badge size="xs" variant="light" color={STATUS_META[row.status].color}>
                            {STATUS_META[row.status].label}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>
            )}

            {!applied && (
              <Group justify="flex-end">
                <Tooltip
                  label="Aucun étudiant à rattacher : la règle ne retient personne de nouveau."
                  disabled={preview.canApply}
                >
                  <Button
                    color="navy"
                    loading={applying}
                    disabled={!preview.canApply}
                    leftSection={<IconCircleCheck size={16} stroke={1.5} />}
                    onClick={handleApply}
                  >
                    Rattacher {preview.willAssign} étudiant(s)
                  </Button>
                </Tooltip>
              </Group>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}
