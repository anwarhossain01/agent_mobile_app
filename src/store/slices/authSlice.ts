import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type AuthState = {
  token?: string | null;
  employeeId?: number | null;
  isLoggedIn?: boolean | false;
};

const initialState: AuthState = {
  token: null,
  employeeId: null,
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<{ token: string; employeeId: number, isLoggedIn: boolean }>) {
      state.token = action.payload.token;
      state.employeeId = action.payload.employeeId;
      state.isLoggedIn = action.payload.isLoggedIn;
    },
    logout(state) {
      state.token = null;
      state.employeeId = null;
      state.isLoggedIn = false;
      // hey don't forget to empty database
    },
  },
});

export const { setAuth, logout } = authSlice.actions;
export default authSlice.reducer;
