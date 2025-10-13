import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CartItem {
  product_id: string | number;
  name: string;
  quantity: number;
  max_quantity: number | null;
  price: number;
  total: number;
}

interface CartState {
  client_id: string | null;
  delivery_address_id : string | null;
  invoice_address_id : string | null;
  items: CartItem[];
  totalPrice: number;
}

// Initial state
const initialState: CartState = {
  client_id: null,
  items: [],
  delivery_address_id: null,
  invoice_address_id: null,
  totalPrice: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Set client ID
    setClientId: (state, action: PayloadAction<string>) => {
      state.client_id = action.payload;
    },

    setDeliveryAddressId: (state, action: PayloadAction<string>) => {
      state.delivery_address_id = action.payload;
    },

    setInvoiceAddressId: (state, action: PayloadAction<string>) => {
      state.invoice_address_id = action.payload;
    },
    
    // Add item to cart
    addItem: (state, action: PayloadAction<Omit<CartItem, 'total'>>) => {
      const { product_id, quantity, max_quantity, price, name } = action.payload;
      const existingItem = state.items.find(item => item.product_id === product_id);
      
      if (existingItem) {
        // Update existing item
        existingItem.quantity += quantity;
        existingItem.total = existingItem.quantity * existingItem.price;
      } else {
        // Add new item
        state.items.push({
          product_id,
          name,
          quantity,
          max_quantity,
          price,
          total: quantity * price,
        });
      }
      
      // Recalculate total price
      state.totalPrice = state.items.reduce((total, item) => total + item.total, 0);
    },
    
    // Update item quantity
    updateQuantity: (state, action: PayloadAction<{ product_id: string | number; quantity: number }>) => {
      const { product_id, quantity } = action.payload;
      const item = state.items.find(item => item.product_id === product_id);
      
      if (item) {
        item.quantity = quantity;
        item.total = item.quantity * item.price;
        
        // Recalculate total price
        state.totalPrice = state.items.reduce((total, item) => total + item.total, 0);
      }
    },
    
    // Remove item from cart
    removeItem: (state, action: PayloadAction<string | number>) => {
      const product_id = action.payload;
      state.items = state.items.filter(item => item.product_id !== product_id);
      
      // Recalculate total price
      state.totalPrice = state.items.reduce((total, item) => total + item.total, 0);
    },
    
    // Clear entire cart
    clearCart: (state) => {
      state.items = [];
      state.totalPrice = 0;
    },
    
    // Initialize cart with data (useful for loading saved cart)
    initializeCart: (state, action: PayloadAction<CartState>) => {
      state.client_id = action.payload.client_id;
      state.items = action.payload.items;
      state.totalPrice = action.payload.totalPrice;
    },
  },
});

// Export actions
export const {
  setClientId,
  addItem,
  setDeliveryAddressId,
  setInvoiceAddressId,
  updateQuantity,
  removeItem,
  clearCart,
  initializeCart,
} = cartSlice.actions;

// Export selectors
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectTotalPrice = (state: { cart: CartState }) => state.cart.totalPrice;
export const selectClientId = (state: { cart: CartState }) => state.cart.client_id;
export const selectCartItemCount = (state: { cart: CartState }) => 
  state.cart.items.reduce((count, item) => count + item.quantity, 0);
export const selectDeliveryAddressId = (state: { cart: CartState }) => state.cart.delivery_address_id;
export const selectInvoiceAddressId = (state: { cart: CartState }) => state.cart.invoice_address_id;

// Export reducer
export default cartSlice.reducer;