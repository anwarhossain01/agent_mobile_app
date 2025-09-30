import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ProductsState = {
  items: any[];
};

const initialState: ProductsState = {
  items: [],
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProducts(state, action: PayloadAction<any[]>) {
      state.items = action.payload;
    },
    updateProduct(state, action: PayloadAction<any>) {
      const idx = state.items.findIndex(p => p.id === action.payload.id);
      if (idx >= 0) state.items[idx] = action.payload;
    },
  },
});

export const { setProducts, updateProduct } = productsSlice.actions;
export default productsSlice.reducer;
