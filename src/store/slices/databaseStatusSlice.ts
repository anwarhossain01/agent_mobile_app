import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type DatabaseState = {
  is_syncing: boolean;
};

const initialState: DatabaseState = {
  is_syncing: false,
};

const databaseStatusSlice = createSlice({
  name: 'databaseStatus',
  initialState,
  reducers: {
    setSyncing(state, action: PayloadAction<boolean>) {
      state.is_syncing = action.payload;
    },
  },
});

export const { setSyncing } = databaseStatusSlice.actions;
export const selectIsSyncing = (state: any) => state.databaseStatus.is_syncing;
export default databaseStatusSlice.reducer;
