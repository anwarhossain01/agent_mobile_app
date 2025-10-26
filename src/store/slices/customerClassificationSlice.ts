import { createSlice, PayloadAction } from '@reduxjs/toolkit';
type namedTuple = [string, number];

type CustomerClassificationState = {
    is_classified?: boolean | null;
    codice_cmnr?: Array<namedTuple> | null;
    numero_ordinale?: Array<namedTuple> | null;
    city?: Array<namedTuple> | null;
};

const initialState: CustomerClassificationState = {
    is_classified: false,
    codice_cmnr: [],
    numero_ordinale: [],
    city: [],
};

const customerClassificationSlice = createSlice({
    name: 'customerClassificationSlice',
    initialState,
    reducers: {
        setClassified(state, action: PayloadAction<boolean | null>) {
            state.is_classified = action.payload;
        },
        setCodiceCmnr(state, action: PayloadAction<Array<namedTuple> | null>) {
            state.codice_cmnr = action.payload;
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
    setCodiceCmnr,
    setNumeroOrdinal,
    setCity,
    clearState } = customerClassificationSlice.actions;

export const selectCustomerClasses = (state: CustomerClassificationState) => state;
export const selectCity = (state: CustomerClassificationState) => state.city;
export const selectCodiceCmnr = (state: CustomerClassificationState) => state.codice_cmnr;
export const selectNumeroOrdinal = (state: CustomerClassificationState) => state.numero_ordinale;
export const selectIsClassified = (state: CustomerClassificationState) => state.is_classified;
export default customerClassificationSlice.reducer;
