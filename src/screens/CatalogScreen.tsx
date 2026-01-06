import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setProducts } from '../store/slices/productsSlice';
import { getActiveCategories, getAllProducts, getCategoriesSubsAndProds, getProducts } from '../api/prestashop';
import { dark, darkBg, darkerBg, darkestBg, lightdark, lighterTextColor, textColor, theme } from '../../colors';
import { selectIsCategoryTreeSaved, selectSavedAt, setIsTreeSaved, setSavedAt } from '../store/slices/categoryTreeSlice';
import { initializeAllProductStock, syncProductsAndCategoriesToDB } from '../sync/cached';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { queryData } from '../database/db';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { selectIsSyncing, selectSyncStatusText, setSyncing } from '../store/slices/databaseStatusSlice';

export default function CatalogScreen({ route }: { route: any }) {

  const [showModal, setShowModal] = useState(false);
  const is_saved = useSelector(selectIsCategoryTreeSaved);
  const is_syncing = useSelector(selectIsSyncing);
  const syncStatusText = useSelector(selectSyncStatusText);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  let saved_at = useSelector(selectSavedAt);
  const [categories, setCategories] = useState<any[]>([]);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [childrenMap, setChildrenMap] = useState<Record<number, any[]>>({});
const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  useEffect(() => {
    loadTopCategories();
  }, []);

  const loadTopCategories = async () => {
    try {
      const data = await queryData(
        'category_tree_categories',
        'parent_id = ?',
        [2]
      );
      setCategories(data);
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  };

  const toggleCategory = async (categoryId: number) => {
    if (expandedIds.includes(categoryId)) {
      // collapse
      setExpandedIds(prev => prev.filter(id => id !== categoryId));
      return;
    }

    // expand
    setExpandedIds(prev => [...prev, categoryId]);

    // already loaded → don't fetch again
    if (childrenMap[categoryId]) return;

    try {
      const children = await queryData(
        'category_tree_categories',
        'parent_id = ?',
        [categoryId]
      );

      setChildrenMap(prev => ({
        ...prev,
        [categoryId]: children,
      }));
    } catch (e) {
      console.error('Failed to load subcategories', e);
    }
  };

  const formatTime = (isoString: string | null): string => {
    if (!isoString) return 'Mai';
    const d = new Date(isoString);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // e.g., "14:32"
    }
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' }); // e.g., "27/11"
  };

const onSelectCategory = (item: any) => {
  setSelectedCategoryId(item.id);

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
};

const syncCategoryTree = async () => {
    try {
      dispatch(setSyncing(true));
      setShowModal(true);
     // const categoriesTree = await getCategoriesSubsAndProds();
    //  if (categoriesTree.success) {
        await syncProductsAndCategoriesToDB();
        await initializeAllProductStock();
        const newSavedAt = new Date().toISOString();
        dispatch(setSavedAt(newSavedAt));
       // setCategories(categoriesTree.data);
       // setFilteredCategories(categoriesTree.data);
    //  } else {
     //   console.warn('⚠️ Server returned success=false for category tree');
     // }
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

  const renderCategory = (item: any, level = 0) => {
  const isExpanded = expandedIds.includes(item.id);
  const children = childrenMap[item.id] || [];
  const isSelected = selectedCategoryId === item.id;

  return (
    <View key={item.id}>
      <TouchableOpacity
        style={[
          styles.row,
          { paddingLeft: 8 + level * 16 },
        ]}
        onPress={() => toggleCategory(item.id)}
        activeOpacity={0.7}
      >
        {/* LEFT: arrow + name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Ionicons
            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
            size={18}
            color={textColor}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.rowText}>{item.name}</Text>
        </View>

        {/* RIGHT: round checkbox */}
        <TouchableOpacity
          onPress={() => onSelectCategory(item)}
          activeOpacity={0.8}
        >
          <View style={styles.radioOuter}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>

      {isExpanded &&
        children.map(child => renderCategory(child, level + 1))}
    </View>
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

      {categories.length === 0 ? (
        <Text style={styles.noDataText}>Nessuna categoria</Text>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => renderCategory(item)}
        />
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
  radioOuter: {
  width: 20,
  height: 20,
  borderRadius: 10,
  borderWidth: 2,
  borderColor: '#007AFF',
  justifyContent: 'center',
  alignItems: 'center',
},

radioInner: {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: '#007AFF',
},

});