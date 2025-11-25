import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setProducts } from '../store/slices/productsSlice';
import { getActiveCategories, getCategoriesSubsAndProds, getProducts } from '../api/prestashop';
import { dark, darkBg, darkerBg, darkestBg, lightdark, textColor } from '../../colors';
import { selectIsCategoryTreeSaved, setIsTreeSaved } from '../store/slices/categoryTreeSlice';
import { saveCategoryTree } from '../sync/cached';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { queryData } from '../database/db';
import { useNavigation } from '@react-navigation/native';

export default function CatalogScreen({route }: { route: any }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);

  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState('');

  const is_saved = useSelector(selectIsCategoryTreeSaved);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  
  useEffect(() => {
    const load = async () => {
      try {
        let categoriesTreeData = [];

     //   if (is_saved) {
          // ✅ Load from SQLite
        //  console.log('📦 Loading categories from local SQLite...');
          categoriesTreeData = await queryData('category_tree_categories', '1=1');
          //console.log(categoriesTreeData);

          setCategories(categoriesTreeData);
          setFilteredCategories(categoriesTreeData);
        // } else {
        //   // 🌐 Fetch from server
        //   console.log('🌍 Fetching categories from server...');
        //   const categoriesTree = await getCategoriesSubsAndProds();

        //   if (categoriesTree.success) {
        //     await saveCategoryTree(categoriesTree.data);
        //     dispatch(setIsTreeSaved(true));
        //     setCategories(categoriesTree.data);
        //     setFilteredCategories(categoriesTree.data);
        //   }
        // }
      } catch (e) {
        console.log('❌ products load err:', e);
      }
    };

    load();
  }, []);

  const handleCategoryPress = async (category: any) => {
    setSelectedCategory(category);
    setSearchMode(false);
    setSearchText('');

    try {
      // fetch subcategories from SQLite using category_id
      const subs = await queryData(
        'category_tree_subcategories',
        'category_id = ?',
        [category.id]
      );

      setSubcategories(subs);
      setFilteredSubcategories(subs);
    } catch (error) {
      console.log('❌ Error fetching subcategories:', error);
      setSubcategories([]);
      setFilteredSubcategories([]);
    }
  };


  const handleBack = () => {
    setSelectedCategory(null);
    setSearchMode(false);
    setSearchText('');
  };

  const handleSearch = async () => {
    if (!searchText.trim()) {
      // reset
      if (selectedCategory) {
        setFilteredSubcategories(subcategories);
      } else {
        setFilteredCategories(categories);
      }
      return;
    }

    try {
      if (selectedCategory) {
        // searching subcategories
        const res = await queryData(
          'category_tree_subcategories',
          'name LIKE ? AND category_id = ?',
          [`%${searchText}%`, selectedCategory.id]
        );
        setFilteredSubcategories(res);
      } else {
        // searching categories
        const res = await queryData(
          'category_tree_categories',
          'name LIKE ?',
          [`%${searchText}%`]
        );
        setFilteredCategories(res);
      }
    } catch (err) {
      console.log('Search error:', err);
    }
  };

  const renderCategoryItem = ({ item }: any) => (
    <TouchableOpacity
      onPress={() => handleCategoryPress(item)}
      style={styles.row}
    >
      <Text style={styles.rowText}>{item.name}</Text>
      <Ionicons name="chevron-forward" size={18} color="#000" />
    </TouchableOpacity>
  );

  const renderSubcategoryItem = ({ item }: any) => {

    const goToProducts = () => {
      (navigation as any).navigate('Main', {
        screen: 'CatalogTab',
        params: {
          screen: 'ProductList',
          params:{
            subcategoryId: item.id,
            subcategoryName: item.name,
          }
        },
      });
    };

    return (
      <TouchableOpacity style={styles.subRow} onPress={goToProducts}>
        <Text style={styles.subRowText}>{item.name}</Text>
        <Ionicons name="chevron-forward" size={16} color={darkestBg} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {selectedCategory && (
          <TouchableOpacity onPress={handleBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={22} color="#000" />
          </TouchableOpacity>
        )}

        {!searchMode ? (
          <>
            <Text style={styles.title}>
              {selectedCategory ? 'Cerca categoria' : 'Cerca categoria'} 
            </Text>
            <TouchableOpacity
              onPress={() => setSearchMode(true)}
              style={styles.iconButton}
            >
              <Ionicons name="search" size={20} color="#000" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.searchBar}>
            <TextInput
              placeholder="Cerca..."
              placeholderTextColor="#888"
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              autoFocus
              returnKeyType="search"
            />
            <TouchableOpacity
              onPress={() => {
                setSearchMode(false);
                setSearchText('');
                if (selectedCategory)
                  setFilteredSubcategories(subcategories);
                else
                  setFilteredCategories(categories);
              }}
            >
              <Ionicons name="close" size={22} color="#000" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* List */}
      {selectedCategory ? (
        filteredSubcategories.length > 0 ? (
          <FlatList
            data={filteredSubcategories}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderSubcategoryItem}
          />
        ) : (
          <Text style={styles.noDataText}>Nessun dato disponibile</Text>
        )
      ) : filteredCategories.length > 0 ? (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCategoryItem}
        />
      ) : (
        <Text style={styles.noDataText}>Nessun dato disponibile</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 600,
    color: textColor,
  },
  iconButton: {
    padding: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
  },
  searchInput: {
    flex: 1,
    color: textColor,
    fontSize: 16,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: darkBg,
  },
  rowText: {
    color: textColor,
    fontSize: 16,
  },
  subRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkBg,
  },
  subRowText: {
    color: textColor,
    fontSize: 15,
  },
  noDataText: {
    color: '#888',
    fontSize: 16,
    marginTop: 20,
  },
});