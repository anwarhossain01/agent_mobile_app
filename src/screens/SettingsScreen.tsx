import React, { useEffect, useState } from 'react';
import { View, Text, Button, TouchableOpacity, Dimensions, ActivityIndicator, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { lightdark, textColor, theme } from '../../colors';
import { getDBConnection } from '../database/db';
import { clearDatabase, getTotalCategoryCount, getTotalCustomerCount, getTotalProductCount, initializeAllProductStock, saveCategoryTree, syncCustomersIncrementally } from '../sync/cached';
import { selectIsSyncing, selectLastCustomerSyncDate, selectSyncStatusText, selectTotalCustomerPagesTobeSynced, selectTotalCustomersFromServer, setCustomerSyncStatus, setLastCutomerSyncDate, setSyncing, setSyncStatusText } from '../store/slices/databaseStatusSlice';
import { selectSavedAt, selectTotalCategoryLength, selectTotalProductNumber, setIsTreeSaved, setSavedAt } from '../store/slices/categoryTreeSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getCategoriesSubsAndProds } from '../api/prestashop';
import { RootState } from '../store';

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [totalCategoryInDb, setTotalCategoryInDb] = useState(0);
  const [totalCustomersInDb, setTotalCustomersInDb] = useState(0);
  const [totalProductsInDb, setTotalProductsInDb] = useState(0);
  const totalCategoryInServer = useSelector(selectTotalCategoryLength);
  const categorySavedDate = useSelector(selectSavedAt);
  const lastCustomerSyncDate = useSelector(selectLastCustomerSyncDate);
  const totalCustomersFromServer = useSelector(selectTotalCustomersFromServer);
  const totalProductsFromServer = useSelector(selectTotalProductNumber);
  const is_syncing = useSelector(selectIsSyncing);
  const auth = useSelector((s: RootState) => s.auth);
  const employeeId = auth.employeeId;
  const syncStatusText = useSelector(selectSyncStatusText);
  const [syncTitle, setSyncTitle] = useState('');

  useEffect(() => {
    async function getAndSetCounts() {
      setTotalCategoryInDb(await getTotalCategoryCount());
      setTotalCustomersInDb(await getTotalCustomerCount());
      setTotalProductsInDb(await getTotalProductCount());
    }
    getAndSetCounts();
  })
  const formatDate = (date) => {
    if (!date) return 'non';

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return 'non';

    return parsed.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 🧱 reusable row component (can be reused many times)
  const SyncRow = ({ title, progress, date, onPress }) => {
    return (
      <View style={styles.row}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.date}>{formatDate(date)}</Text>
        </View>

        <View style={styles.right}>
          <Text style={styles.progress}>{progress}</Text>
          <TouchableOpacity onPress={onPress}>
            <Text style={styles.sync}>SINCRONIZZA</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const startCategoryAndProductSync = async () => {
    const netInfo = await NetInfo.fetch();

    if (netInfo.isConnected && !is_syncing) {
      try {
        const categoriesTree = await getCategoriesSubsAndProds();

        if (categoriesTree.success) {
          dispatch(setSyncing(true));
          
          await initializeAllProductStock();
          await saveCategoryTree(categoriesTree.data);

          //  Update cache timestamp — this is the key for next check
          const newSavedAt = new Date().toISOString();
          dispatch(setSavedAt(newSavedAt));

        } else {
          console.warn('⚠️ Server returned success=false for category tree');
        }
      } catch (error) {
        console.log('❌ Category tree load error:', error);

      } finally {
        dispatch(setSyncing(false));
      }
    }
  }

  const startCustomerSync = async () => {
    const netInfo = await NetInfo.fetch();

    if (!employeeId) return;
    if (is_syncing) return;
    if (!netInfo.isConnected) return;
    dispatch(setSyncStatusText('Starting'));
    dispatch(setSyncing(true));
    try {
      await syncCustomersIncrementally(employeeId);
      const nowIso = new Date().toISOString();
      dispatch(setLastCutomerSyncDate(nowIso));
    } catch (error) {
      console.error('Sync failed in UI layer:', error);
    } finally {
      dispatch(setSyncing(false));
    }
  }

  async function handleLogout() {
    setLoading(true);
    await clearDatabase();

    dispatch(setCustomerSyncStatus({
      current_customer_length: 0,
      last_customer_id: 0,
      last_customer_page_synced: 0
    }));
    dispatch(setLastCutomerSyncDate(''));
    dispatch(setSyncStatusText(''));
    dispatch(setIsTreeSaved(false));
    dispatch(setSavedAt(''));

    await AsyncStorage.clear();
    dispatch(logout());
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sync</Text>

      <SyncRow
        title="Clienti"
        progress={`${totalCustomersInDb}/${totalCustomersFromServer}`}
        date={lastCustomerSyncDate}
        onPress={async () => {
          setSyncTitle('Syncing Clienti');
          await startCustomerSync();
        }}
      />

      <SyncRow
        title="Categorie"
        progress={`${totalCategoryInDb}/${totalCategoryInServer}`}
        date={categorySavedDate}
        onPress={async () => {
          setSyncTitle('Syncing Categorie e Prodotti');
          await startCategoryAndProductSync();
        }}
      />

      <SyncRow
        title="Prodotti"
        progress={`${totalProductsInDb}/${totalProductsFromServer}`}
        date={categorySavedDate}
        onPress={async () => {
          setSyncTitle('Syncing Prodotti e Categorie');
          await startCategoryAndProductSync();
        }}
      />

      <TouchableOpacity
        style={styles.logout}
        disabled={loading}
        onPress={handleLogout}
      >
        {loading
          ? <ActivityIndicator color={lightdark} />
          : <Text style={styles.logoutText}>Logout</Text>
        }
      </TouchableOpacity>

      {is_syncing && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ActivityIndicator size="large" color={theme} />
            <Text style={styles.modalTitle}>{syncTitle}</Text>
            <Text style={styles.modalText}>
              {syncStatusText || 'Sync in progress...'}
            </Text>
          </View>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: textColor,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: lightdark,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: textColor,
    marginTop: 4,
  },
  right: {
    alignItems: 'flex-end',
  },
  progress: {
    fontSize: 14,
    marginBottom: 4,
  },
  sync: {
    fontSize: 13,
    fontWeight: '700',
    color: theme,
  },
  logout: {
    marginTop: 24,
    backgroundColor: '#ff462e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '800',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalBox: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  modalText: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },

});

