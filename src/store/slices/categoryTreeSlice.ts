import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type treeItemTuple = {id: number, name :string};

type CategoryTreeState = {
    is_saved: boolean;
    saved_at: string; /// track save time
    total_category_length: number;
    total_product_number: number;
  //  category_tree: Array<treeItemTuple>;
//   subcategory_tree: Array<treeItemTuple>;
};

const initialState: CategoryTreeState = {
  is_saved: false,
  saved_at: '',
  total_category_length: 0,
  total_product_number: 0
//  category_tree: [],
//  subcategory_tree: [],
};

const categoryTreeSlice = createSlice({
  name: 'categoryTree',
  initialState,
  reducers: {
    setIsTreeSaved(state, action: PayloadAction<boolean>) {
      state.is_saved = action.payload; 
    },
    setSavedAt(state, action: PayloadAction<string>) {
      state.saved_at = action.payload;
    },
    setTotalCategoryLength(state, action: PayloadAction<number>) {
      state.total_category_length = action.payload;
    },
    setTotalProductNumber(state, action: PayloadAction<number>) {
      state.total_product_number = action.payload;
    }
    // setCategoryTree(state, action: PayloadAction<Array<treeItemTuple>>) {
    //   state.category_tree = action.payload;
    // },
    // setSubcategoryTree(state, action: PayloadAction<Array<treeItemTuple>>) {
    //   state.subcategory_tree = action.payload;
    // },
  },
});

export const selectIsCategoryTreeSaved = (state: any) => state.categoryTree.is_saved;
export const selectSavedAt = (state: any) => state.categoryTree.saved_at;
export const selectTotalCategoryLength = (state: any) => state.categoryTree.total_category_length;
export const selectTotalProductNumber = (state: any) => state.categoryTree.total_product_number;
//export const selectCategoryTree = (state: any) => state.categoryTree.category_tree;
//export const selectSubcategoryTree = (state: any) => state.categoryTree.subcategory_tree;

export const { setIsTreeSaved, setSavedAt, setTotalCategoryLength, setTotalProductNumber } = categoryTreeSlice.actions;
export default categoryTreeSlice.reducer;