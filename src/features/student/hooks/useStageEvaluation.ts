import { useState, useCallback } from 'react';
import { useDisclosure } from '@mantine/hooks';

// Placeholder type until Phase 2 rebuilds the stage data model
interface StageStub { id: string; name: string }

export function useStageEvaluation() {
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedStage, setSelectedStage] = useState<StageStub | null>(null);

  const handleOpenEvaluation = useCallback((stage: StageStub) => {
    setSelectedStage(stage);
    open();
  }, [open]);

  const handleClose = useCallback(() => {
    close();
    setTimeout(() => setSelectedStage(null), 200);
  }, [close]);

  return { opened, selectedStage, handleOpenEvaluation, handleClose };
}
