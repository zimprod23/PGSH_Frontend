import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Progress,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCopy,
  IconFileText,
  IconPencil,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import {
  useCreateCnpnVersionMutation,
  useUpdateCnpnVersionMutation,
  useCloneCnpnCurriculaMutation,
  useDeleteCnpnVersionMutation,
  useGetAcademicYearsQuery,
} from '../api/adminApi';
import type { CnpnVersionResponse } from '../types/admin.types';
import type { AcademicProgram } from '../../../common/types';
import { useNotify } from '../../../common/hooks/useNotify';
import { ConfirmModal } from '../../../common/components/ConfirmModal';

/**
 * The ministerial texts themselves — the layer that used to exist only in SQL.
 *
 * A text carries three things: what kind of degree it defines (`totalYears`), which intake it starts
 * to govern, and how it is cited. Its requirements per level are recorded below this panel, and who
 * it binds below that.
 *
 * <b>Two scoping axes meet here and must not be confused.</b> The academic year is *when things
 * happen* — it drives the navbar and every planning screen. The CNPN is *which rules apply*. They
 * touch at exactly one point: « à partir de », the year from which new registrations are attached to
 * this text. That field is an academic year being used to decide a CNPN, and it is the only place
 * the two axes cross.
 */

interface Props {
  versions: CnpnVersionResponse[];
  program: AcademicProgram;
}

interface FormState {
  code: string;
  label: string;
  totalYears: number | string;
  reference: string;
  intakeYearId: string | null;
}

const EMPTY: FormState = { code: '', label: '', totalYears: 6, reference: '', intakeYearId: null };

export function CnpnVersionsPanel({ versions, program }: Props) {
  const notify = useNotify();
  const { data: years = [] } = useGetAcademicYearsQuery();

  const [editing, setEditing] = useState<CnpnVersionResponse | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [cloneInto, setCloneInto] = useState<CnpnVersionResponse | null>(null);
  const [cloneFrom, setCloneFrom] = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<CnpnVersionResponse | null>(null);

  const [create, { isLoading: saving }]   = useCreateCnpnVersionMutation();
  const [update, { isLoading: updating }] = useUpdateCnpnVersionMutation();
  const [clone,  { isLoading: cloning }]  = useCloneCnpnCurriculaMutation();
  const [remove, { isLoading: removing }] = useDeleteCnpnVersionMutation();

  const yearOptions = [...years]
    .sort((a, b) => b.label.localeCompare(a.label))
    .map((y) => ({ value: String(y.id), label: y.label }));

  const openCreate = () => { setForm(EMPTY); setCreating(true); };

  const openEdit = (v: CnpnVersionResponse) => {
    setForm({
      code: v.code,
      label: v.label,
      totalYears: v.totalYears,
      reference: v.reference ?? '',
      intakeYearId: v.appliesToEntrantsFromAcademicYearId
        ? String(v.appliesToEntrantsFromAcademicYearId)
        : null,
    });
    setEditing(v);
  };

  const body = {
    code: form.code.trim(),
    label: form.label.trim(),
    totalYears: Number(form.totalYears) || 1,
    reference: form.reference.trim() || undefined,
    appliesToEntrantsFromAcademicYearId: form.intakeYearId ? Number(form.intakeYearId) : null,
  };

  const canSave = body.code.length > 0 && body.label.length > 0;

  const handleSave = async () => {
    try {
      if (editing) {
        await update({ id: editing.id, ...body }).unwrap();
        notify.success(`CNPN ${body.code} mis à jour`);
        setEditing(null);
      } else {
        await create({ ...body, academicProgram: program }).unwrap();
        notify.success(`CNPN ${body.code} enregistré`);
        setCreating(false);
      }
    } catch (err: unknown) {
      notify.error((err as { data?: { detail?: string } })?.data?.detail ?? 'Enregistrement impossible');
    }
  };

  const handleClone = async () => {
    if (!cloneInto || !cloneFrom) return;
    try {
      const r = await clone({
        cnpnVersionId: cloneInto.id,
        fromCnpnVersionId: Number(cloneFrom),
      }).unwrap();

      notify.success(
        `${r.levelsCloned} niveau(x) repris, ${r.stagesCopied} stage(s)` +
        (r.levelsSkipped > 0 ? ` · ${r.levelsSkipped} déjà saisi(s), conservé(s)` : '') +
        (r.levelsOutsideProgramme > 0 ? ` · ${r.levelsOutsideProgramme} hors de la durée du texte` : ''),
      );
      setCloneInto(null);
      setCloneFrom(null);
    } catch (err: unknown) {
      notify.error((err as { data?: { detail?: string } })?.data?.detail ?? 'Reprise impossible');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const r = await remove(deleting.id).unwrap();
      notify.success(
        `CNPN ${deleting.code} supprimé` +
        (r.curriculaRemoved > 0 ? ` — ${r.curriculaRemoved} niveau(x) d’exigences retirés` : ''),
      );
      setDeleting(null);
    } catch (err: unknown) {
      notify.error((err as { data?: { detail?: string } })?.data?.detail ?? 'Suppression impossible');
    }
  };

  return (
    <>
      <Card padding="lg" radius="lg" withBorder shadow="sm">
        <Stack gap="md">
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm">
              <ThemeIcon size={36} radius="md" variant="light" color="navy">
                <IconFileText size={20} stroke={1.5} />
              </ThemeIcon>
              <Stack gap={0}>
                <Text fw={600} size="sm">Textes CNPN — {program}</Text>
                <Text size="xs" c="dimmed">
                  Les arrêtés enregistrés, ce qu’ils organisent et l’état de leur saisie.
                </Text>
              </Stack>
            </Group>
            <Button
              size="xs" color="navy" variant="light" radius="md"
              leftSection={<IconPlus size={14} stroke={1.5} />}
              onClick={openCreate}
            >
              Nouveau texte
            </Button>
          </Group>

          <Table striped highlightOnHover verticalSpacing="sm" fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Référence</Table.Th>
                <Table.Th>Durée</Table.Th>
                <Table.Th>S’applique aux entrants</Table.Th>
                <Table.Th>Saisie</Table.Th>
                <Table.Th>Étudiants</Table.Th>
                <Table.Th w={90} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {versions.map((v) => {
                const pct = v.totalYears > 0
                  ? Math.round((v.levelsRecorded / v.totalYears) * 100)
                  : 0;
                const complete = v.levelsRecorded >= v.totalYears;

                return (
                  <Table.Tr key={v.id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>{v.code}</Text>
                      <Text size="xs" c="dimmed">{v.label}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="navy" size="sm">{v.totalYears} ans</Badge>
                    </Table.Td>
                    <Table.Td>
                      {v.governsAnIntake ? (
                        <Text size="xs">à partir de {v.appliesToEntrantsFromLabel}</Text>
                      ) : (
                        <Tooltip
                          label="Texte conservé pour la citation : il ne régit aucune promotion et n’est jamais choisi automatiquement."
                          multiline w={280}
                        >
                          <Badge variant="light" color="gray" size="sm">citation seule</Badge>
                        </Tooltip>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {/* The completeness indicator: half-configured used to be invisible. */}
                      <Group gap={6} wrap="nowrap">
                        <Progress
                          value={pct}
                          w={70}
                          size="sm"
                          radius="xl"
                          color={complete ? 'teal' : pct === 0 ? 'gray' : 'orange'}
                        />
                        <Text size="xs" c={complete ? 'teal' : 'dimmed'} fw={complete ? 600 : 400}>
                          {v.levelsRecorded} / {v.totalYears} niveaux
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">{v.studentCount}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap" justify="flex-end">
                        <Tooltip label="Reprendre les exigences d’un autre texte" position="top">
                          <ActionIcon
                            variant="subtle" color="navy" size="sm"
                            onClick={() => { setCloneInto(v); setCloneFrom(null); }}
                          >
                            <IconCopy size={14} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Corriger le texte" position="top">
                          <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => openEdit(v)}>
                            <IconPencil size={14} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                        {/* Disabled rather than left to fail: the server refuses a text anyone
                            follows, and a control that can only error is worse than no control. */}
                        <Tooltip
                          label={
                            v.studentCount > 0
                              ? `${v.studentCount} étudiant(s) relèvent de ce texte — rattachez-les ailleurs d’abord.`
                              : 'Supprimer ce texte'
                          }
                          position="top" multiline w={250}
                        >
                          <ActionIcon
                            variant="subtle" color="red" size="sm"
                            disabled={v.studentCount > 0}
                            onClick={() => setDeleting(v)}
                          >
                            <IconTrash size={14} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>

      {/* ── Create / correct ── */}
      <Modal
        opened={creating || editing !== null}
        onClose={() => { setCreating(false); setEditing(null); }}
        title={editing ? `Corriger ${editing.code}` : `Nouveau texte — ${program}`}
        radius="lg"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Référence de l’arrêté" placeholder="1650.25" required
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.currentTarget.value }))}
          />
          <TextInput
            label="Intitulé" placeholder="CNPN 2025 — Docteur en Médecine (6 ans)" required
            value={form.label}
            onChange={(e) => setForm((p) => ({ ...p, label: e.currentTarget.value }))}
          />
          <NumberInput
            label="Durée du cursus (années)"
            description="Ce que le texte organise — 6 sous l’arrêté 1650.25, 7 sous le 2174.18"
            min={1} max={10}
            value={form.totalYears}
            onChange={(v) => setForm((p) => ({ ...p, totalYears: v }))}
          />
          <Select
            label="S’applique aux entrants à partir de"
            description="Chaque nouvelle inscription à partir de cette année est rattachée automatiquement. Laisser vide pour un texte conservé uniquement pour la citation."
            data={yearOptions}
            value={form.intakeYearId}
            onChange={(v) => setForm((p) => ({ ...p, intakeYearId: v }))}
            clearable
            searchable
          />
          <TextInput
            label="Publication" placeholder="BO 7422 du 17 juillet 2025"
            value={form.reference}
            onChange={(e) => setForm((p) => ({ ...p, reference: e.currentTarget.value }))}
          />

          {editing && editing.studentCount > 0 && (
            <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />}>
              {editing.studentCount} étudiant(s) relèvent de ce texte. Leur rattachement ne bouge pas,
              mais réduire la durée du cursus est refusé si un niveau au-delà comporte des exigences.
            </Alert>
          )}

          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => { setCreating(false); setEditing(null); }}>
              Annuler
            </Button>
            <Button color="navy" loading={saving || updating} disabled={!canSave} onClick={handleSave}>
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── « X reprend Y » ── */}
      <Modal
        opened={cloneInto !== null}
        onClose={() => setCloneInto(null)}
        title={cloneInto ? `${cloneInto.code} reprend…` : ''}
        radius="lg"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Reprend les exigences de tous les niveaux d’un autre texte en une seule fois. Les niveaux
            déjà saisis ici sont <strong>conservés</strong>, et ceux qui dépassent la durée du cursus
            sont ignorés. Modifiez ensuite les seules années que l’arrêté change.
          </Text>
          <Select
            label="Texte source"
            placeholder="Choisir"
            data={versions
              .filter((v) => v.id !== cloneInto?.id && v.levelsRecorded > 0)
              .map((v) => ({ value: String(v.id), label: `${v.code} — ${v.levelsRecorded} niveau(x)` }))}
            value={cloneFrom}
            onChange={setCloneFrom}
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setCloneInto(null)}>Annuler</Button>
            <Button color="navy" loading={cloning} disabled={!cloneFrom} onClick={handleClone}>
              Reprendre
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Delete ── */}
      <ConfirmModal
        opened={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Supprimer le CNPN ${deleting?.code ?? ''}`}
        message={
          `Supprimer définitivement « ${deleting?.label ?? ''} » ?` +
          (deleting && deleting.levelsRecorded > 0
            ? ` Les exigences de ${deleting.levelsRecorded} niveau(x) seront retirées avec lui.`
            : ' Ce texte ne comporte aucune exigence.')
        }
        confirmLabel="Supprimer"
        confirmColor="red"
        onConfirm={handleDelete}
        loading={removing}
      >
        {/* The consequence that is not obvious from the row: removing the only text governing an
            intake sends new registrations back to the previous one — for Médecine, seven years
            instead of six. */}
        {deleting?.governsAnIntake && (
          <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />}>
            Ce texte régit les entrants à partir de {deleting.appliesToEntrantsFromLabel}. Après
            suppression, les nouvelles inscriptions relèveront du texte précédent de la filière.
          </Alert>
        )}
      </ConfirmModal>
    </>
  );
}
