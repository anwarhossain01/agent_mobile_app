import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ClientsState = {
  items: any[];
};

const initialState: ClientsState = {
  items: []
};

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    setClients(state, action: PayloadAction<any[]>) {
      state.items = action.payload;
    },
    addClient(state, action: PayloadAction<any>) {
      state.items.push(action.payload);
    },
  },
});

export const { setClients, addClient } = clientsSlice.actions;
export default clientsSlice.reducer;
