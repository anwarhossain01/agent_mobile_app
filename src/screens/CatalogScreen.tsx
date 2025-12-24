import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setProducts } from '../store/slices/productsSlice';
import { getActiveCategories, getCategoriesSubsAndProds, getProducts } from '../api/prestashop';
import { dark, darkBg, darkerBg, darkestBg, lightdark, lighterTextColor, textColor, theme } from '../../colors';
import { selectIsCategoryTreeSaved, selectSavedAt, setIsTreeSaved, setSavedAt } from '../store/slices/categoryTreeSlice';
import { initializeAllProductStock, saveCategoryTree } from '../sync/cached';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { queryData } from '../database/db';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { selectIsSyncing, selectSyncStatusText, setSyncing } from '../store/slices/databaseStatusSlice';

type SearchResult =
  | { type: 'category'; id: number; name: string }
  | { type: 'subcategory'; id: number; name: string; category_id: number };
export default function CatalogScreen({ route }: { route: any }) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const [categories, setCategories] = useState<any[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState('');

  const is_saved = useSelector(selectIsCategoryTreeSaved);
  const is_syncing = useSelector(selectIsSyncing);
  const syncStatusText = useSelector(selectSyncStatusText);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  let saved_at = useSelector(selectSavedAt);

  useEffect(() => {
    const load = async () => {
      try {
       // dispatch(setSyncing(false));
        const netInfo = await NetInfo.fetch();

        //  1. Load from local DB (always try — even if stale, show something fast)
        const localCategories = await queryData('category_tree_categories', '1=1');
        setCategories(localCategories);
        setFilteredCategories(localCategories);

        //  2. Decide whether to refresh from server: only based on time
        const now = Date.now();
        const FIXED_HOURS_MS = 25 * 60 * 60 * 1000; // 25 hours

        let lastSavedTime = 0; // defaults to "never" → expired

        if (saved_at) {
          const parsed = new Date(saved_at).getTime();
          if (!isNaN(parsed)) {
            lastSavedTime = parsed;
          }
        }

        const isStale = (now - lastSavedTime) > FIXED_HOURS_MS;

        // 🌐 Only refresh if stale AND online
        if (netInfo.isConnected && isStale && !is_syncing) {
          console.log(
            saved_at
              ? ` Category tree last saved at ${saved_at} — refreshing (age: ${Math.round((now - lastSavedTime) / 60000)} min)`
              : ' No saved timestamp — fetching category tree from server'
          );
          try {
            const categoriesTree = await getCategoriesSubsAndProds();

            if (categoriesTree.success) {
              dispatch(setSyncing(true));
              setShowModal(true);
              await saveCategoryTree(categoriesTree.data);

              //  Update cache timestamp — this is the key for next check
              const newSavedAt = new Date().toISOString();
              saved_at = newSavedAt;
              dispatch(setSavedAt(newSavedAt));

              // Update UI with fresh data
              setCategories(categoriesTree.data);
              setFilteredCategories(categoriesTree.data);
            } else {
              console.warn('⚠️ Server returned success=false for category tree');
            }
          } catch (error) {
            console.log('❌ Category tree load error:', error);

          } finally {
            dispatch(setSyncing(false));
            setShowModal(false);
          }
        } else if (!netInfo.isConnected && isStale) {
          console.log(' Offline & category tree stale — using local cache');
        }
      } catch (e) {
        console.error('❌ Category tree load error:', e);
      }
    };

    load();
  }, [dispatch, is_syncing]);

  const formatTime = (isoString: string | null): string => {
    if (!isoString) return 'Mai';
    const d = new Date(isoString);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // e.g., "14:32"
    }
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' }); // e.g., "27/11"
  };

  const syncCategoryTree = async () => {
    try {
      dispatch(setSyncing(true));
      setShowModal(true);
      const categoriesTree = await getCategoriesSubsAndProds();
      if (categoriesTree.success) {
        await saveCategoryTree(categoriesTree.data);
        await initializeAllProductStock();
        const newSavedAt = new Date().toISOString();
        dispatch(setSavedAt(newSavedAt));
        setCategories(categoriesTree.data);
        setFilteredCategories(categoriesTree.data);
      } else {
        console.warn('⚠️ Server returned success=false for category tree');
      }
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      dispatch(setSyncing(false));
      setShowModal(false);
    }
  };

  const handleSyncNow = () => {
    if (!is_syncing) {
      syncCategoryTree();
    }
  };

  const handleCategoryPress = async (category: any) => {
    try {
      // fetch subcategories from SQLite using category_id
      const subs = await queryData(
        'category_tree_subcategories',
        'category_id = ?',
        [category.id]
      );

      // if (subs.length == 0) {
      //   (navigation as any).navigate('Main', {
      //     screen: 'CatalogTab',
      //     params: {
      //       screen: 'ProductList',
      //       params: {
      //         subcategoryId: category.id,
      //         subcategoryName: category.name,
      //       },
      //     },
      //   });
      //   return;
      // }

      setSelectedCategory(category);
      setSearchMode(false);
      setSearchText('');

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
      setSearchResults([]);
      if (selectedCategory) {
        setFilteredSubcategories(subcategories);
      } else {
        setFilteredCategories(categories);
      }
      return;
    }

    try {
      // search categories
      const cats = await queryData(
        'category_tree_categories',
        'name LIKE ?',
        [`%${searchText}%`]
      );

      // search subcategories (NO MATTER WHAT)
      const subs = await queryData(
        'category_tree_subcategories',
        'name LIKE ?',
        [`%${searchText}%`]
      );

      const results: SearchResult[] = [
        ...cats.map((c: any) => ({
          type: 'category',
          id: c.id,
          name: c.name,
        })),
        ...subs.map((s: any) => ({
          type: 'subcategory',
          id: s.id,
          name: s.name,
          category_id: s.category_id,
        })),
      ];

      setSearchResults(results);
    } catch (err) {
      console.log('Search error:', err);
    }
  };

  // const handleSearch = async () => {
  //   if (!searchText.trim()) {
  //     // reset
  //     if (selectedCategory) {
  //       setFilteredSubcategories(subcategories);
  //     } else {
  //       setFilteredCategories(categories);
  //     }
  //     return;
  //   }

  //   try {
  //     if (selectedCategory) {
  //       // searching subcategories
  //       const res = await queryData(
  //         'category_tree_subcategories',
  //         'name LIKE ? AND category_id = ?',
  //         [`%${searchText}%`, selectedCategory.id]
  //       );
  //       setFilteredSubcategories(res);
  //     } else {
  //       // searching categories
  //       const res = await queryData(
  //         'category_tree_categories',
  //         'name LIKE ?',
  //         [`%${searchText}%`]
  //       );
  //       setFilteredCategories(res);
  //     }
  //   } catch (err) {
  //     console.log('Search error:', err);
  //   }
  // };

  const renderSearchResultItem = ({ item }: { item: SearchResult }) => {
    if (item.type === 'category') {
      return (
        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            setSearchMode(false);
            setSearchText('');
            setSearchResults([]);
            handleCategoryPress(item);
          }}
        >
          <Text style={styles.rowText}>{item.name}</Text>
          <Ionicons name="chevron-forward" size={18} color="#000" />
        </TouchableOpacity>
      );
    }

    // subcategory → go straight to products
    return (
      <TouchableOpacity
        style={styles.subRow}
        onPress={() => {
          (navigation as any).navigate('Main', {
            screen: 'CatalogTab',
            params: {
              screen: 'ProductList',
              params: {
                subcategoryId: item.id,
                subcategoryName: item.name,
              },
            },
          });
        }}
      >
        <Text style={styles.subRowText}>{item.name}</Text>
        <Ionicons name="pricetag-outline" size={18} color="#000" />
      </TouchableOpacity>
    );
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
          params: {
            subcategoryId: item.id,
            subcategoryName: item.name,
          }
        },
      });
    };

    return (
      <TouchableOpacity style={styles.subRow} onPress={goToProducts}>
        <Text style={styles.subRowText}>{item.name}</Text>
        <Ionicons name="chevron-forward" size={18} color="#000" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/*  Sync Info Bar — only when NOT syncing */}
      {!is_syncing && (
        <View style={styles.syncInfoBar}>
          <TouchableOpacity
            onPress={handleSyncNow}
            style={styles.syncButton}
            disabled={is_syncing}
          >
            <Ionicons name="sync" size={18} color="#007AFF" />
            <Text style={styles.syncButtonText}>Aggiorna ora</Text>
          </TouchableOpacity>
          <Text style={styles.syncTimeText}>
            Ultimo: {formatTime(saved_at)}
          </Text>
        </View>
      )}


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
      {searchMode && searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderSearchResultItem}
        />
      ) : selectedCategory ? (
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

      {/* Sync Progress Modal — shown only during sync */}
      <Modal
        transparent
        visible={showModal}
        animationType="fade"
        onRequestClose={() => { }} // disable close during sync
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="sync-outline" size={40} color={theme} />
            <Text style={styles.modalTitle}>Aggiornamento catalogo</Text>
            <ActivityIndicator size="large" color={theme} style={styles.spinner} />
            <Text style={styles.statusText}>{syncStatusText}</Text>
            <Text style={styles.hintText}>Non chiudere l’app</Text>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    paddingVertical: 12,
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

  syncInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: darkerBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  syncTimeText: {
    color: '#888',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    // Optional shadow (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Android elevation
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: textColor,
    marginTop: 12,
    marginBottom: 16,
  },
  spinner: {
    marginVertical: 16,
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    color: textColor,
    lineHeight: 20,
    marginHorizontal: 16,
  },
  hintText: {
    fontSize: 13,
    color: lighterTextColor,
    fontStyle: 'italic',
    marginTop: 8,
  },
});