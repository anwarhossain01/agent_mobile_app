import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type treeItemTuple = {id: number, name :string};

type CategoryTreeState = {
    is_saved: boolean;
    saved_at: string; /// track save time
  //  category_tree: Array<treeItemTuple>;
//   subcategory_tree: Array<treeItemTuple>;
};

const initialState: CategoryTreeState = {
  is_saved: false,
  saved_at: '',
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
//export const selectCategoryTree = (state: any) => state.categoryTree.category_tree;
//export const selectSubcategoryTree = (state: any) => state.categoryTree.subcategory_tree;

export const { setIsTreeSaved, setSavedAt } = categoryTreeSlice.actions;
export default categoryTreeSlice.reducer;