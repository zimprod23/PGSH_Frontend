import type { AcademicProgram } from '../../../common/types';

const ORDINALS = ['', '1ère', '2ème', '3ème', '4ème', '5ème', '6ème', '7ème'];

const PROGRAM_LABELS: Record<AcademicProgram, string> = {
  Medecine:  'Médecine',
  Pharmacie: 'Pharmacie',
  Master:    'Master',
  Doctorat:  'Doctorat',
};

const BAC_SERIES_LABELS: Record<string, string> = {
  BacFrançais: 'Baccalauréat Français',
  BacMission:  'Baccalauréat Mission',
  MathA:       'Mathématiques A',
  MathB:       'Mathématiques B',
  Physique:    'Sciences Physiques',
  SVT:         'Sciences de la Vie et de la Terre',
  Etrangaire:  'Diplôme Étranger',
};

export const formatProgram = (p: AcademicProgram | string) =>
  PROGRAM_LABELS[p as AcademicProgram] ?? p;

export const formatLevel = (year: number, program: AcademicProgram | string) => {
  const ord = ORDINALS[year] ?? `${year}ème`;
  return `${ord} Année ${formatProgram(program)}`;
};

export const formatBacSeries = (series: string) =>
  BAC_SERIES_LABELS[series] ?? series;

export const formatGender = (gender: string) =>
  gender === 'Male' ? 'Masculin' : 'Féminin';

export const formatCivilStatus = (status: string) =>
  status === 'Civil' ? 'Civil(e)' : 'Militaire';

export const formatNationality = (status: string) =>
  status === 'Marocaine' ? 'Marocaine' : 'Étrangère';

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(iso));

export const timeAgo = (iso: string): string => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7)   return `Il y a ${days} jours`;
  if (days < 30)  return `Il y a ${Math.floor(days / 7)} sem.`;
  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`;
  return `Il y a ${Math.floor(days / 365)} an(s)`;
};

/** Groups a date into its Moroccan academic year: Sep–Aug cycle. */
export const getAcademicYear = (iso: string): string => {
  const d = new Date(iso);
  const y = d.getFullYear();
  return d.getMonth() >= 8 ? `${y}–${y + 1}` : `${y - 1}–${y}`;
};

export const initials = (firstName: string, lastName: string) =>
  `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
