import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CartItem {
  product_id: string | number;
  name: string;
  quantity: number;
  max_quantity: number | null;
  price: number;
  total: number;
  accisa: number;
}

interface CartState {
  client_id: string | null;
  delivery_address_id : string | null;
  invoice_address_id : string | null;
  items: CartItem[];
  totalPrice: number;
  id_cart: string | number | null;
  id_carrier: string | number| null;
  shipping_price_inc_tax: number;
  shipping_price_exc_tax: number;
}

// Initial state
const initialState: CartState = {
  client_id: null,
  items: [],
  delivery_address_id: null,
  invoice_address_id: null,
  totalPrice: 0,
  id_cart: null,
  id_carrier: null,
  shipping_price_inc_tax: 0,
  shipping_price_exc_tax: 0,
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

    setCartId: (state, action: PayloadAction<string | any>) => {
      state.id_cart = action.payload;
    },

    setCarrierId: (state, action: PayloadAction<string | any>) => {
      state.id_carrier = action.payload;
    },

    setshippingPrice: (state, action: PayloadAction<any>) => {
      const { shipping_price_inc_tax, shipping_price_exc_tax } = action.payload;
      state.shipping_price_inc_tax = shipping_price_inc_tax;
      state.shipping_price_exc_tax = shipping_price_exc_tax;
    },
    
    // Add item to cart
    addItem: (state, action: PayloadAction<Omit<CartItem, 'total'>>) => {
      const { product_id, quantity, max_quantity, price, name , accisa} = action.payload;
      const existingItem = state.items.find(item => item.product_id === product_id);
      
      if (existingItem) {
        // Update existing item
        existingItem.quantity += quantity;
        existingItem.total = existingItem.quantity * (existingItem.price);
      } else {
        // Add new item
        state.items.push({
          product_id,
          name,
          quantity,
          max_quantity,
          price,
          total: quantity * (price ),
          accisa: accisa
        });
      }
      
      // Recalculate total price
      state.totalPrice = state.items.reduce((total, item) => total + (item.total ), 0);
    },
    
    // Update item quantity
    updateQuantity: (state, action: PayloadAction<{ product_id: string | number; quantity: number }>) => {
      const { product_id, quantity } = action.payload;
      const item = state.items.find(item => item.product_id === product_id);
      
      if (item) {
        item.quantity = quantity;
        item.total = item.quantity * (item.price);
        
        // Recalculate total price
        state.totalPrice = state.items.reduce((total, item) => total + (item.total), 0);
      }
    },
    
    // Remove item from cart
    removeItem: (state, action: PayloadAction<string | number>) => {
      const product_id = action.payload;
      state.items = state.items.filter(item => item.product_id !== product_id);
      
      // Recalculate total price
      state.totalPrice = state.items.reduce((total, item) => total + (item.total), 0);
    },
    
    // Clear entire cart
    clearCart: (state) => {
      state.items = [];
      state.totalPrice = 0;
      state.shipping_price_inc_tax = 0;
      state.shipping_price_exc_tax = 0;
      state.id_cart = null;
      state.id_carrier = null;
      state.client_id = null;
      state.delivery_address_id = null;
      state.invoice_address_id = null;
      
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
  setCartId,
  setCarrierId,
  setshippingPrice,
} = cartSlice.actions;

// Export selectors
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectTotalPrice = (state: { cart: CartState }) => state.cart.totalPrice;
export const selectClientId = (state: { cart: CartState }) => state.cart.client_id;
export const selectCartItemCount = (state: { cart: CartState }) => 
  state.cart.items.reduce((count, item) => count + item.quantity, 0);
export const selectCartItemCountMinimal = (state: { cart: CartState }) => state.cart.items.length;
export const selectDeliveryAddressId = (state: { cart: CartState }) => state.cart.delivery_address_id;
export const selectInvoiceAddressId = (state: { cart: CartState }) => state.cart.invoice_address_id;
export const selectCartId = (state: { cart: CartState }) => state.cart.id_cart;
export const selectCarrierId = (state: { cart: CartState }) => state.cart.id_carrier;
export const selectShippingPriceExcTax = (state: { cart: CartState }) => state.cart.shipping_price_exc_tax;
export const selectShippingPriceIncTax = (state: { cart: CartState }) => state.cart.shipping_price_inc_tax;
// Export reducer
export default cartSlice.reducer;