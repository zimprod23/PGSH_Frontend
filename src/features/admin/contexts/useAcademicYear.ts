import { createContext, useContext } from 'react';
import type { AcademicYearResponse } from '../types/admin.types';

export interface AcademicYearContextValue {
  years: AcademicYearResponse[];
  currentYear: AcademicYearResponse | null;
  currentYearId: number | null;
  setCurrentYearId: (id: number | null) => void;
}

/**
 * The navbar's academic year, shared by every admin screen.
 *
 * The context and its hook live apart from `AcademicYearProvider` because a module that exports a
 * component alongside anything else cannot be hot-reloaded by react-refresh — editing the provider
 * forced a full reload of the whole admin shell.
 */
export const AcademicYearContext = createContext<AcademicYearContextValue>({
  years: [],
  currentYear: null,
  currentYearId: null,
  setCurrentYearId: () => {},
});

export function useAcademicYear() {
  return useContext(AcademicYearContext);
}
