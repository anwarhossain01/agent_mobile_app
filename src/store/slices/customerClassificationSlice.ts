import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

type namedTuple = [string, number];

type CustomerClassificationState = {
    is_classified?: boolean | null;
    stop_load: boolean;
    postcode?: Array<namedTuple> | null;
    numero_ordinale?: Array<namedTuple> | null;
    city?: Array<namedTuple> | null;
};

const initialState: CustomerClassificationState = {
    is_classified: false,
    stop_load: false,
    postcode: [],
    numero_ordinale: [],
    city: [],
};

const customerClassificationSlice = createSlice({
    name: 'customerClassificationSlice',
    initialState,
    reducers: {
        setStopLoad(state, action: PayloadAction<boolean>) {            
            state.stop_load = action.payload;
        },
        setClassified(state, action: PayloadAction<boolean | null>) {
            state.is_classified = action.payload;
        },
        setPostcode(state, action: PayloadAction<Array<namedTuple> | null>) {
            state.postcode = action.payload;
        },
        setNumeroOrdinal(state, action: PayloadAction<Array<namedTuple> | null>) {
            state.numero_ordinale = action.payload;
        },
        setCity(state, action: PayloadAction<Array<namedTuple> | null>) {
            state.city = action.payload;
        },
        clearState(state) {
            state = initialState;
        }
    }
});

export const {
    setClassified,
    setStopLoad,
    setPostcode,
    setNumeroOrdinal,
    setCity,
    clearState } = customerClassificationSlice.actions;

export const selectCustomerClasses = (state: CustomerClassificationState) => state;
export const selectIsClassified = (state: CustomerClassificationState) => state.is_classified;
export const selectStopLoad = (state: CustomerClassificationState) => state.stop_load;

export default customerClassificationSlice.reducer;
