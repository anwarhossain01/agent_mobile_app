import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type OrdersState = {
  items: any[]; // include 'synced' boolean flag
};

const initialState: OrdersState = {
  items: [],
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setOrders(state, action: PayloadAction<any[]>) {
      state.items = action.payload;
    },
    addOrder(state, action: PayloadAction<any>) {
      state.items.push(action.payload);
    },
    markOrderSynced(state, action: PayloadAction<string>) {
      const idx = state.items.findIndex(o => o.localId === action.payload);
      if (idx >= 0) state.items[idx].synced = true;
    },
  },
});

export const { setOrders, addOrder, markOrderSynced } = ordersSlice.actions;
export default ordersSlice.reducer;
