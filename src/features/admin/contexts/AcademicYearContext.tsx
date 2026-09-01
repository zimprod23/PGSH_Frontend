import { useMemo, useState, type ReactNode } from 'react';
import { AcademicYearContext } from './useAcademicYear';
import { useGetAcademicYearsQuery } from '../api/adminApi';

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const { data: years = [] } = useGetAcademicYearsQuery();

  // Only the user's explicit choice is stored. The year actually in force is derived from it and
  // from the years the server sent.
  //
  // ⚠ It used to be stored and back-filled by an effect once the years arrived, which committed a
  // render where every consumer read `currentYearId === null`. A handler that omits the year resolves
  // it to the current one server-side, so that render is not merely empty — it is a request for a
  // *different* promotion, made on every first paint of the admin shell.
  const [chosenYearId, setChosenYearId] = useState<number | null>(null);

  const value = useMemo(() => {
    const fallback = years.find((y) => y.isCurrent) ?? years[0] ?? null;
    const currentYear = years.find((y) => y.id === chosenYearId) ?? fallback;

    return {
      years,
      currentYear,
      currentYearId: currentYear?.id ?? null,
      setCurrentYearId: setChosenYearId,
    };
    // A fresh object each render would re-render every consumer of this context on every paint.
  }, [years, chosenYearId]);

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
}

