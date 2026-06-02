import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useGetAcademicYearsQuery } from '../api/adminApi';
import type { AcademicYearResponse } from '../types/admin.types';

interface AcademicYearContextValue {
  years: AcademicYearResponse[];
  currentYear: AcademicYearResponse | null;
  currentYearId: number | null;
  setCurrentYearId: (id: number | null) => void;
}

const AcademicYearContext = createContext<AcademicYearContextValue>({
  years: [],
  currentYear: null,
  currentYearId: null,
  setCurrentYearId: () => {},
});

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const { data: years = [] } = useGetAcademicYearsQuery();
  const [currentYearId, setCurrentYearId] = useState<number | null>(null);

  useEffect(() => {
    if (currentYearId === null && years.length > 0) {
      const current = years.find((y) => y.isCurrent) ?? years[0];
      setCurrentYearId(current.id);
    }
  }, [years, currentYearId]);

  const currentYear = years.find((y) => y.id === currentYearId) ?? null;

  return (
    <AcademicYearContext.Provider value={{ years, currentYear, currentYearId, setCurrentYearId }}>
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear() {
  return useContext(AcademicYearContext);
}
