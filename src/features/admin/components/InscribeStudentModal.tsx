import {
  Alert,
  Badge,
  Button,
  Divider,
  Grid,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconMail } from '@tabler/icons-react';
import { useState } from 'react';
import { useInscribeStudentMutation } from '../api/adminApi';
import {
  INSCRIPTION_ACTION_LABEL,
  type InscribeStudentRequest,
  type InscriptionRowReport,
} from '../types/inscription.types';
import type { AdminLevelResponse } from '../types/admin.types';

interface Props {
  opened: boolean;
  onClose: () => void;
  levels: AdminLevelResponse[];
  academicYearId: number | null;
  initialLevelId: string | null;
}

const EMPTY: InscribeStudentRequest = { levelId: 0 };

/**
 * One student, without a file.
 *
 * The November transfer, the returner who turns up in week three, the réorientation settled after the
 * intake file was sent. Every bulk import owes a single-row way in, and it binds harder here than for
 * the déliberation: an inscription file names people who do not exist yet, so re-sending it to add
 * one late arrival means re-stating a whole promotion to say one thing.
 *
 * **Every value is sent as text**, exactly as a sheet cell would be, and the server parses it with
 * the same code. That is why the date field is a plain input with a stated format rather than a
 * picker: the form and the file must not end up with two grammars for one column.
 *
 * ⚠ **No confirmation dialog, deliberately.** The file path asks for the number of creations because
 * it has rows nobody read; here the request *is* the row, typed once, by the person submitting it.
 */
export function InscribeStudentModal({ opened, onClose, levels, academicYearId, initialLevelId }: Props) {
  // Seeded once per mount. The parent keys this component on `opened`, so re-opening it remounts and
  // the form is empty again — no effect resetting state, which is a cascading render and the thing
  // `react-hooks/set-state-in-effect` is about.
  const [form, setForm] = useState<InscribeStudentRequest>(
    () => ({ ...EMPTY, levelId: initialLevelId ? Number(initialLevelId) : 0 }),
  );
  const [result, setResult] = useState<InscriptionRowReport | null>(null);
  const [refusal, setRefusal] = useState<{ code: string; detail: string } | null>(null);

  const [inscribe, { isLoading }] = useInscribeStudentMutation();

  const set = <K extends keyof InscribeStudentRequest>(key: K, value: InscribeStudentRequest[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setRefusal(null);
  };

  const level = levels.find((l) => l.id === form.levelId) ?? null;
  const originRequired = !!level && level.year > 1;

  const hasIdentifier = !!(form.cne?.trim() || form.appogee?.trim());
  const hasName = !!(form.lastName?.trim() || form.firstName?.trim());
  const hasOrigin = !!(
    form.originInstitution?.trim() &&
    form.originLastYearCompleted?.trim() &&
    form.equivalenceReference?.trim()
  );

  // Pre-flight: the server's rules, mirrored so a click that can only fail never leaves the browser.
  // The server still validates — this is the fast path, never a replacement.
  const blocker =
    academicYearId === null ? 'Aucune année universitaire sélectionnée.'
    : !form.levelId ? 'Choisissez la promotion.'
    : !hasIdentifier ? 'Indiquez au moins un CNE ou un numéro Apogée.'
    : !hasName ? 'Indiquez le nom de l’étudiant.'
    : originRequired && !hasOrigin
      ? 'Au-dessus de la 1ʳᵉ année, l’établissement d’origine, la dernière année suivie et la référence d’équivalence sont requis ensemble.'
      : null;

  const submit = async () => {
    if (blocker) return;
    try {
      setRefusal(null);
      setResult(await inscribe({ ...form, academicYearId: academicYearId ?? undefined }).unwrap());
    } catch (err: unknown) {
      // Shown inline rather than only as a toast: on a form the sentence has to sit beside the field
      // it is about. `errorMiddleware` already raises the toast — no second notify.error here, which
      // is the double-toast the other panels still carry.
      const data = (err as { data?: { title?: string; detail?: string } })?.data;
      setRefusal({
        code: data?.title ?? 'Inscription.Refus',
        detail: data?.detail ?? "L'inscription a été refusée.",
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>Inscrire un étudiant</Text>}
      size="lg"
      radius="lg"
    >
      <Stack gap="md">
        {result ? (
          <Outcome result={result} onClose={onClose} onAgain={() => { setResult(null); setForm({ ...EMPTY, levelId: form.levelId }); }} />
        ) : (
          <>
            <Text size="xs" c="dimmed">
              Pour un nouvel arrivant que la réinscription ne reporte pas : un transfert, un retour
              après interruption, une réorientation, ou une inscription tardive. Un redoublant est
              reporté automatiquement depuis sa décision de déliberation.
            </Text>

            <Select
              label="Promotion"
              placeholder="Choisir…"
              size="xs"
              required
              searchable
              data={levels.map((l) => ({ value: String(l.id), label: l.label ?? `Niveau ${l.id}` }))}
              value={form.levelId ? String(form.levelId) : null}
              onChange={(v) => set('levelId', v ? Number(v) : 0)}
            />

            <Divider label="Identité" labelPosition="left" />

            <Grid gutter="xs">
              <Grid.Col span={6}>
                <TextInput
                  label="CNE" size="xs"
                  description="Ou le numéro Apogée — au moins l'un des deux"
                  value={form.cne ?? ''} onChange={(e) => set('cne', e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Numéro Apogée" size="xs"
                  value={form.appogee ?? ''} onChange={(e) => set('appogee', e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Nom" size="xs" required
                  value={form.lastName ?? ''} onChange={(e) => set('lastName', e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Prénom" size="xs"
                  value={form.firstName ?? ''} onChange={(e) => set('firstName', e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="CIN" size="xs"
                  value={form.cin ?? ''} onChange={(e) => set('cin', e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="E-mail" size="xs"
                  description="Sinon PGSH en génère une — c'est un identifiant de connexion"
                  value={form.email ?? ''} onChange={(e) => set('email', e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <Select
                  label="Sexe" size="xs" clearable
                  data={[{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]}
                  value={form.gender ?? null} onChange={(v) => set('gender', v ?? undefined)}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label="Date de naissance" size="xs" placeholder="jj/mm/aaaa"
                  value={form.dateOfBirth ?? ''} onChange={(e) => set('dateOfBirth', e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label="Lieu de naissance" size="xs"
                  value={form.placeOfBirth ?? ''} onChange={(e) => set('placeOfBirth', e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label="Année du bac" size="xs"
                  value={form.bacYear ?? ''} onChange={(e) => set('bacYear', e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <Select
                  label="Série du bac" size="xs" clearable
                  data={['SVT', 'PC', 'Math A', 'Math B', 'Bac Français', 'Bac Mission', 'Étranger']}
                  value={form.bacSeries ?? null} onChange={(v) => set('bacSeries', v ?? undefined)}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label="Note d'accès" size="xs" placeholder="14,25"
                  value={form.accessGrade ?? ''} onChange={(e) => set('accessGrade', e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Convention" size="xs" clearable
                  description="Comment la place est financée"
                  data={['Aucune', 'Payée amie', 'International', 'Autre']}
                  value={form.agreement ?? null} onChange={(v) => set('agreement', v ?? undefined)}
                />
              </Grid.Col>
            </Grid>

            <Divider
              label={originRequired ? 'Provenance — obligatoire' : 'Provenance — si l’étudiant vient d’ailleurs'}
              labelPosition="left"
            />

            {originRequired && (
              <Alert color="orange" variant="light" radius="md" icon={<IconAlertTriangle size={16} />}>
                <b>{level?.label} n'est pas une 1ʳᵉ année.</b> Un étudiant inconnu de la faculté y
                entrant a suivi les années précédentes ailleurs : les trois champs ci-dessous vont
                ensemble, et sans eux rien ne dira que ces années ont été reconnues.
              </Alert>
            )}

            <Grid gutter="xs">
              <Grid.Col span={8}>
                <TextInput
                  label="Établissement d'origine" size="xs" required={originRequired}
                  value={form.originInstitution ?? ''}
                  onChange={(e) => set('originInstitution', e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label="Pays" size="xs" placeholder="Maroc"
                  value={form.originCountry ?? ''}
                  onChange={(e) => set('originCountry', e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label="Dernière année suivie" size="xs" required={originRequired} placeholder="2"
                  description="En années d'études"
                  value={form.originLastYearCompleted ?? ''}
                  onChange={(e) => set('originLastYearCompleted', e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label="Référence d'équivalence" size="xs" required={originRequired}
                  placeholder="Arrêté …"
                  value={form.equivalenceReference ?? ''}
                  onChange={(e) => set('equivalenceReference', e.currentTarget.value)}
                />
              </Grid.Col>
              <Grid.Col span={4}>
                <TextInput
                  label="Date d'équivalence" size="xs" placeholder="jj/mm/aaaa"
                  value={form.equivalenceDate ?? ''}
                  onChange={(e) => set('equivalenceDate', e.currentTarget.value)}
                />
              </Grid.Col>
            </Grid>

            {refusal && (
              <Alert color="red" variant="light" radius="md" icon={<IconAlertTriangle size={16} />}>
                <Text size="sm" fw={600} mb={2}>{INSCRIPTION_LABEL_OF(refusal.code)}</Text>
                <Text size="xs">{refusal.detail}</Text>
              </Alert>
            )}

            <Group justify="flex-end">
              <Button variant="subtle" color="gray" size="xs" onClick={onClose}>Annuler</Button>
              <Tooltip label={blocker ?? ''} disabled={!blocker} withArrow multiline w={280}>
                <div>
                  <Button
                    color="grape" size="xs" radius="md"
                    loading={isLoading}
                    disabled={!!blocker}
                    onClick={submit}
                  >
                    Inscrire
                  </Button>
                </div>
              </Tooltip>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}

function Outcome({
  result, onClose, onAgain,
}: { result: InscriptionRowReport; onClose: () => void; onAgain: () => void }) {
  return (
    <Stack gap="md">
      <Alert color="teal" variant="light" radius="md" icon={<IconCheck size={16} />}>
        <Text size="sm" fw={600} mb={4}>{result.studentFullName} — inscrit</Text>
        <Group gap="xs">
          <Badge size="xs" color="grape" variant="light">
            {INSCRIPTION_ACTION_LABEL[result.action]}
          </Badge>
          {result.createsStudent && (
            <Badge size="xs" color="red" variant="light">Étudiant créé</Badge>
          )}
          {result.recordsOrigin && (
            <Badge size="xs" color="orange" variant="light">Équivalence enregistrée</Badge>
          )}
        </Group>
        <Text size="xs" mt={6}>{result.message}</Text>
      </Alert>

      {/* ⚠ A manufactured address is the account the student will log in with. Say it out loud. */}
      {result.generatedEmail && (
        <Alert color="yellow" variant="light" radius="md" icon={<IconMail size={16} />}>
          <Text size="sm" fw={600} mb={2}>Adresse générée</Text>
          <Text size="xs">
            Aucune adresse n'était renseignée. PGSH a attribué{' '}
            <Text span ff="monospace" fw={600}>{result.generatedEmail}</Text> — c'est par elle que le
            compte Keycloak sera rattaché. Communiquez-la, ou corrigez-la sur la fiche de l'étudiant.
          </Text>
        </Alert>
      )}

      <Group justify="flex-end">
        <Button variant="light" color="grape" size="xs" onClick={onAgain}>
          Inscrire un autre
        </Button>
        <Button color="navy" size="xs" onClick={onClose}>Fermer</Button>
      </Group>
    </Stack>
  );
}

/**
 * The server sends the refusal's *cause* as the problem `title` (`Inscription.OriginRequired`), and
 * the sentence in `detail`. Translating the code gives the alert a heading in the same vocabulary the
 * file import uses; the sentence underneath is always the server's own.
 */
function INSCRIPTION_LABEL_OF(code: string): string {
  const action = code.replace(/^Inscription\./, '');
  return (INSCRIPTION_ACTION_LABEL as Record<string, string>)[action] ?? 'Inscription refusée';
}
