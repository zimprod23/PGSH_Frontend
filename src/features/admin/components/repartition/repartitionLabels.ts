import dayjs from 'dayjs';
import type { AcademicProgram } from '../../../../common/types';

/** How the published répartition names things. Shared by the document and the page's file names. */

const PROGRAM_LABELS: Record<AcademicProgram, string> = {
  Medecine: 'médecine',
  Pharmacie: 'pharmacie',
  Master: 'master',
  Doctorat: 'doctorat',
};

/** «3ème année médecine» — the heading centred above the table. */
export function levelTitle(year: number, program: AcademicProgram): string {
  const ordinal = year === 1 ? '1ère' : `${year}ème`;
  return `${ordinal} année ${PROGRAM_LABELS[program]}`;
}

/** The DB stores "2025-2026"; the published header reads "2025/2026". */
export const yearHeading = (label: string) => label.replace('-', '/');

export const printDate = (iso: string) => dayjs(iso).format('DD/MM/YYYY');
