import { useState, useCallback } from "react";
import { useDisclosure } from "@mantine/hooks";
import { type StudentStage } from "../types";

/**
 * useStageEvaluation Hook
 * * Logic abstraction for handling the selection and modal state
 * of stage evaluations. Decouples UI from state logic.
 */
export function useStageEvaluation() {
  // 1. Manage Modal Visibility (using Mantine's high-performance disclosure)
  const [opened, { open, close }] = useDisclosure(false);

  // 2. Track the currently active stage for evaluation
  const [selectedStage, setSelectedStage] = useState<StudentStage | null>(null);

  // 3. Memoize handlers to prevent unnecessary re-renders in parent components
  const handleOpenEvaluation = useCallback(
    (stage: StudentStage) => {
      setSelectedStage(stage);
      open();
    },
    [open],
  );

  const handleClose = useCallback(() => {
    // We delay clearing the selected stage slightly to avoid
    // visual glitches during the modal exit animation
    close();
    setTimeout(() => setSelectedStage(null), 200);
  }, [close]);

  return {
    opened,
    selectedStage,
    handleOpenEvaluation,
    handleClose,
  };
}
