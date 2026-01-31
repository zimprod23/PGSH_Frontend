import { createSlice } from "@reduxjs/toolkit";

const loadingSlice = createSlice({
  name: "loading",
  initialState: { activeRequests: 0 },
  reducers: {
    pending: (state) => {
      state.activeRequests += 1;
    },
    fulfilled: (state) => {
      state.activeRequests = Math.max(0, state.activeRequests - 1);
    },
    rejected: (state) => {
      state.activeRequests = Math.max(0, state.activeRequests - 1);
    },
  },
});

export const { pending, fulfilled, rejected } = loadingSlice.actions;
export default loadingSlice.reducer;
