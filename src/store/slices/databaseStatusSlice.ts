import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type DatabaseState = {
  is_syncing: boolean;
  sync_status_text: string;
  current_customer_length: number;
  last_customer_id: number;
  last_customer_page_synced: number;
  total_customer_pages_tobe_synced : number;
  total_customers_from_server: number;
  last_customer_sync_date: string;
  stopRequested: boolean;
};

const initialState: DatabaseState = {
  is_syncing: false,
  sync_status_text: 'Non sincronizzato',
  current_customer_length: 0,
  last_customer_id: 0,
  last_customer_page_synced: 0,
  total_customer_pages_tobe_synced: 0,
  total_customers_from_server: 0,
  last_customer_sync_date: '',
  stopRequested: false
};

const databaseStatusSlice = createSlice({
  name: 'databaseStatus',
  initialState,
  reducers: {
    setSyncing(state, action: PayloadAction<boolean>) {
      state.is_syncing = action.payload;
    },
    setCustomerSyncStatus(state, action: PayloadAction<{ current_customer_length: number, last_customer_id: number, last_customer_page_synced: number}>) {
      state.current_customer_length = action.payload.current_customer_length;
      state.last_customer_id = action.payload.last_customer_id;
      state.last_customer_page_synced = action.payload.last_customer_page_synced;
    //  state.total_customer_pages_tobe_synced = action.payload.total_customer_pages_tobe_synced;
    },
    setSyncStatusText(state, action: PayloadAction<string>) {
      state.sync_status_text = action.payload;
    },
    setLastCutomerSyncDate(state, action: PayloadAction<string>) {
      state.last_customer_sync_date = action.payload;
    },
    setTotalCustomersFromServer(state, action: PayloadAction<number>) {
      state.total_customers_from_server = action.payload;
    },
    setStopRequested (state, action: PayloadAction<boolean>) {
      state.stopRequested = action.payload;
    }
  },
});

export const { setSyncing, setCustomerSyncStatus, setSyncStatusText, setLastCutomerSyncDate, setTotalCustomersFromServer, setStopRequested } = databaseStatusSlice.actions;
export const selectIsSyncing = (state: any) => state.databaseStatus.is_syncing;
export const selectCurrentCustomerLength = (state: any) => state.databaseStatus.current_customer_length;
export const selectLastCustomerId = (state: any) => state.databaseStatus.last_customer_id;
export const selectLastCustomerPageSynced = (state: any) => state.databaseStatus.last_customer_page_synced;
export const selectTotalCustomerPagesTobeSynced = (state: any) => state.databaseStatus.total_customer_pages_tobe_synced;
export const selectSyncStatusText = (state: any) => state.databaseStatus.sync_status_text;
export const selectLastCustomerSyncDate = (state: any) => state.databaseStatus.last_customer_sync_date;
export const selectTotalCustomersFromServer = (state: any) => state.databaseStatus.total_customers_from_server;
export const selectStopRequested = (state: any) => state.databaseStatus.stopRequested;
export default databaseStatusSlice.reducer;
