import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/authSlice';
import clientsReducer from './slices/clientsSlice';
import productsReducer from './slices/productsSlice';
import ordersReducer from './slices/ordersSlice';
import cartReducer from './slices/cartSlice';
import customerClassificationReducer from './slices/customerClassificationSlice';
import categoryTreeReducer from './slices/categoryTreeSlice';
const rootReducer = combineReducers({
  auth: authReducer,
  clients: clientsReducer,
  products: productsReducer,
  orders: ordersReducer,
  cart: cartReducer,
  customerClassification: customerClassificationReducer,
  categoryTree: categoryTreeReducer,
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
