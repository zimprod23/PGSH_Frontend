import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ErrorState {
  message: string | null;
  status: number | null;
}

const initialState: ErrorState = { message: null, status: null };

const errorSlice = createSlice({
  name: "error",
  initialState,
  reducers: {
    setError: (
      state,
      action: PayloadAction<{ title: string; status?: number }>,
    ) => {
      state.message = action.payload.title;
      state.status = action.payload.status ?? null;
    },
    clearError: (state) => {
      state.message = null;
      state.status = null;
    },
  },
});

export const { setError, clearError } = errorSlice.actions;
export default errorSlice.reducer;
