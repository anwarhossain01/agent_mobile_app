import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type treeItemTuple = {id: number, name :string};

type CategoryTreeState = {
    is_saved: boolean;
  //  category_tree: Array<treeItemTuple>;
//   subcategory_tree: Array<treeItemTuple>;
};

const initialState: CategoryTreeState = {
  is_saved: false,
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
    // setCategoryTree(state, action: PayloadAction<Array<treeItemTuple>>) {
    //   state.category_tree = action.payload;
    // },
    // setSubcategoryTree(state, action: PayloadAction<Array<treeItemTuple>>) {
    //   state.subcategory_tree = action.payload;
    // },
  },
});

export const selectIsCategoryTreeSaved = (state: any) => state.categoryTree.is_saved;
//export const selectCategoryTree = (state: any) => state.categoryTree.category_tree;
//export const selectSubcategoryTree = (state: any) => state.categoryTree.subcategory_tree;

export const { setIsTreeSaved } = categoryTreeSlice.actions;
export default categoryTreeSlice.reducer;