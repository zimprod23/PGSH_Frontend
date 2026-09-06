import { Button, Divider, Group, Modal, NumberInput, Select, Skeleton, Stack, Switch, Text, TextInput, Textarea } from '@mantine/core';
import { useState } from 'react';
import { useCreateServiceMutation, useGetPromotionLevelsQuery, useGetServiceByIdQuery, useUpdateServiceMutation } from '../api/adminApi';
import type { ServiceLevelCapacity } from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { ServiceLevelCapacityEditor } from './ServiceLevelCapacityEditor';
import { LocalizationFields } from './LocalizationFields';
import { coordinatePayload, EMPTY_COORDINATES, type Coordinates } from './localization';

const SERVICE_TYPE_OPTIONS = ['Biologie', 'Chirurgie', 'Medical'].map((v) => ({ value: v, label: v }));

type ServiceFormState = Coordinates & {
  name: string;
  hospitalId: string;
  serviceType: string;
  specialty: string;
  capacity: number;
  description: string;
  allowsOverCapacity: boolean;
  isExternal: boolean;
};

/**
 * Create/edit a service, including its coordinates and its per-promotion intake quotas.
 *
 * The summary row the list renders carries none of those, so editing fetches the detail first and
 * the form is not mounted until it arrives — a blank field shown before the data lands is a stored
 * value the next save destroys. `ServiceForm` is keyed on the service id so React discards and
 * rebuilds its state on a different target, rather than an effect copying props into state.
 */
export function ServiceFormModal({
  opened,
  serviceId,
  hospitalOptions,
  onClose,
}: {
  opened: boolean;
  /** null = create. */
  serviceId: number | null;
  hospitalOptions: { value: string; label: string }[];
  onClose: () => void;
}) {
  const { data: detail, isFetching } = useGetServiceByIdQuery(serviceId ?? 0, { skip: serviceId === null });
  const { data: levels = [] } = useGetPromotionLevelsQuery(undefined);

  const loaded = serviceId === null || (detail?.id === serviceId && !isFetching);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={serviceId === null ? 'Nouveau service' : 'Modifier le service'}
      radius="lg"
      size="lg"
    >
      {!loaded ? (
        <Stack gap="md">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={38} radius="md" />)}
        </Stack>
      ) : (
        <ServiceForm
          key={serviceId ?? 'new'}
          serviceId={serviceId}
          initial={
            detail && serviceId !== null
              ? {
                  name: detail.name,
                  hospitalId: String(detail.hospitalId),
                  serviceType: detail.serviceType,
                  specialty: detail.specialty ?? '',
                  capacity: detail.capacity,
                  allowsOverCapacity: detail.allowsOverCapacity,
                  isExternal: detail.isExternal,
                  description: detail.description ?? '',
                  // Only the service's OWN coordinates. The detail falls back to the hospital's for
                  // display, and writing those back would freeze a position that should keep
                  // following the hospital.
                  localizationX: detail.hasOwnLocalization ? detail.localizationX ?? '' : '',
                  localizationY: detail.hasOwnLocalization ? detail.localizationY ?? '' : '',
                  localizationZ: detail.hasOwnLocalization ? detail.localizationZ ?? '' : '',
                }
              : {
                  name: '', hospitalId: '', serviceType: 'Medical', specialty: '', capacity: 10,
                  // A new service has refused nothing, exactly like the 148 the import created.
                  allowsOverCapacity: true,
                  // …and it is one of ours until somebody says otherwise.
                  isExternal: false,
                  description: '', ...EMPTY_COORDINATES,
                }
          }
          initialQuotas={detail && serviceId !== null
            ? detail.levelCapacities.map((c) => ({ levelId: c.levelId, capacity: c.capacity }))
            : []}
          levels={levels}
          hospitalOptions={hospitalOptions}
          onDone={onClose}
        />
      )}
    </Modal>
  );
}

function ServiceForm({
  serviceId,
  initial,
  initialQuotas,
  levels,
  hospitalOptions,
  onDone,
}: {
  serviceId: number | null;
  initial: ServiceFormState;
  initialQuotas: ServiceLevelCapacity[];
  levels: Parameters<typeof ServiceLevelCapacityEditor>[0]['levels'];
  hospitalOptions: { value: string; label: string }[];
  onDone: () => void;
}) {
  const notify = useNotify();
  const [createService, { isLoading: creating }] = useCreateServiceMutation();
  const [updateService, { isLoading: updating }] = useUpdateServiceMutation();

  const [form, setForm] = useState<ServiceFormState>(initial);
  const [quotas, setQuotas] = useState<ServiceLevelCapacity[]>(initialQuotas);

  const canSave = Boolean(form.name.trim()) && Boolean(form.hospitalId);

  const handleSave = async () => {
    if (!canSave) return;
    const payload = {
      hospitalId: Number(form.hospitalId),
      name: form.name.trim(),
      serviceType: form.serviceType,
      specialty: form.specialty.trim() || undefined,
      capacity: form.capacity,
      // ⚠ Always sent. The command defaults it to true when the field is absent, so omitting it here
      // would silently re-open a service its chef had closed — the shape that erased a description
      // once, from a summary response that did not carry the field the form wrote back.
      allowsOverCapacity: form.allowsOverCapacity,
      // ⚠ Always sent too, and for a stronger reason: omitted on an update the server keeps the
      // stored value, so a form that forgets it cannot corrupt anything — but a form that *shows*
      // an unticked switch while the service is external would be lying about what it saves.
      isExternal: form.isExternal,
      description: form.description.trim(),
      ...coordinatePayload(form),
      levelCapacities: quotas,
    };
    try {
      if (serviceId !== null) {
        await updateService({ id: serviceId, ...payload }).unwrap();
        notify.success('Service mis à jour');
      } else {
        await createService(payload).unwrap();
        notify.success('Service créé');
      }
      onDone();
    } catch {
      notify.error('Erreur lors de l\'enregistrement');
    }
  };

  return (
    <Stack gap="md">
      <TextInput label="Nom" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} radius="md" required />
      <Group grow>
        <Select label="Hôpital" data={hospitalOptions} value={form.hospitalId} onChange={(v) => setForm((p) => ({ ...p, hospitalId: v ?? '' }))} radius="md" searchable required />
        <Select label="Type" data={SERVICE_TYPE_OPTIONS} value={form.serviceType} onChange={(v) => setForm((p) => ({ ...p, serviceType: v ?? 'Medical' }))} radius="md" />
      </Group>
      <Group grow>
        <TextInput label="Spécialité" placeholder="ex: Cardiologie, Neurologie…" value={form.specialty} onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))} radius="md" />
        <NumberInput
          label="Capacité totale"
          description={quotas.length > 0
            ? 'Ignorée : des quotas par promotion sont définis'
            : 'Toutes promotions confondues'}
          value={form.capacity}
          onChange={(v) => setForm((p) => ({ ...p, capacity: Number(v) || 1 }))}
          min={1}
          max={200}
          radius="md"
        />
      </Group>
      <Switch
        checked={form.allowsOverCapacity}
        /* ⚠ La valeur est lue **avant** l'updater. React remet `currentTarget` à `null` une fois
           l'événement propagé, et un updater fonctionnel s'exécute au rendu suivant — donc le lire
           dedans lève « Cannot read properties of null ». Trouvé en cliquant l'interrupteur le
           06/09/2026 : la modale tombait dans l'ErrorBoundary. Même forme que `EvaluationModal`. */
        onChange={(e) => {
          const allows = e.currentTarget.checked;
          setForm((p) => ({ ...p, allowsOverCapacity: allows }));
        }}
        color="navy"
        label="Autoriser le dépassement d'effectif"
        description={form.allowsOverCapacity
          ? 'Par défaut. Un administrateur peut publier un planning qui dépasse la limite ci-dessus en cochant « autoriser le dépassement » — la limite est un objectif.'
          : 'La publication sera refusée dès que la limite est dépassée, et la case « autoriser le dépassement » ne lèvera pas ce refus. À décider avec le chef de service.'}
      />
      {!form.allowsOverCapacity && (
        <Text size="xs" c="orange.7" mt={-8}>
          Les plannings déjà publiés ne sont pas touchés&nbsp;: le refus porte sur les publications à venir.
        </Text>
      )}

      <Switch
        checked={form.isExternal}
        /* Same reading rule as above — the value is hoisted out of the event. */
        onChange={(e) => {
          const external = e.currentTarget.checked;
          setForm((p) => ({ ...p, isExternal: external }));
        }}
        color="teal"
        label="Service hors faculté"
        description={form.isExternal
          ? "Un lieu que la faculté ne gère pas (CHU d'une autre région, clinique, étranger). Il ne peut pas figurer dans la rotation d'un stage ni dans une cellule du planning, et sa capacité n'entre dans aucun calcul de charge : les étudiants n'y arrivent que par une délocalisation."
          : 'Par défaut. Le service appartient au réseau de la faculté et participe normalement aux rotations.'}
      />
      {form.isExternal && (
        <Text size="xs" c="teal.7" mt={-8}>
          Aucun chef ne sera rattaché&nbsp;: la validation revient sur papier et se saisit à la scolarité.
        </Text>
      )}

      <Textarea label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} radius="md" autosize minRows={2} />

      <LocalizationFields
        value={form}
        onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
        description="Laissez vide pour utiliser la position de l'hôpital. Ne renseignez ces champs que si le service se trouve ailleurs (pavillon détaché, annexe)."
      />

      <Divider />

      <ServiceLevelCapacityEditor
        value={quotas}
        levels={levels}
        serviceCapacity={form.capacity}
        onChange={setQuotas}
      />

      <Group justify="flex-end">
        <Button variant="subtle" color="gray" radius="md" onClick={onDone}>Annuler</Button>
        <Button color="navy" radius="md" loading={creating || updating} disabled={!canSave} onClick={handleSave}>
          Enregistrer
        </Button>
      </Group>
    </Stack>
  );
}
