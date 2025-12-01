import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, StyleSheet, Alert, Modal, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setClients } from '../store/slices/clientsSlice';
import { getCachedClientsForAgent, getCachedClientsForAgentFrontPage, getClientsForAgent } from '../api/prestashop';
import { useNavigation } from '@react-navigation/native';
import { darkBg, textColor, theme, darkerBg, lighterTextColor, lighterTheme, lightdark } from '../../colors'; // Imported darkerBg
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import NetInfo from '@react-native-community/netinfo';
import { getDBConnection, queryData, queryDataWithPagination } from '../database/db';
import {  selectIsClassified, selectStopLoad, setCity, setClassified, setNumeroOrdinal, setPostcode } from '../store/slices/customerClassificationSlice';
import { setClientId } from '../store/slices/cartSlice';
import { syncCustomersIncrementally, upsertCustomer } from '../sync/cached';
import { selectIsSyncing, selectLastCustomerSyncDate, selectSyncStatusText, setLastCutomerSyncDate, setSyncStatusText } from '../store/slices/databaseStatusSlice';
import { isSyncStale } from '../sync/dateSync';

const formatInlineDate = (dateStr: string | null): string => {
  if (!dateStr) return 'Mai';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Invalid date';

  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
};

export default function ClientsScreen() {
  const dispatch = useDispatch();

  const isSyncing = useSelector(selectIsSyncing);
  const syncStatusText = useSelector(selectSyncStatusText);
  const clients = useSelector((s: RootState) => s.clients.items);
  const auth = useSelector((s: RootState) => s.auth);
  const is_classified = useSelector(selectIsClassified);
  const [noData, setNoData] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  let localindex = 0;
  const employeeId = auth.employeeId;
  const navigation = useNavigation();
  const PAGE_SIZE = 15;
  const lastSyncDate = useSelector(selectLastCustomerSyncDate);
  const stopLoad = useSelector(selectStopLoad);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const handleSync = async () => {
    if (!employeeId) return;
    if (isSyncing) return;
    dispatch(setSyncStatusText('Starting'));
    setModalVisible(true);
    try {
      await syncCustomersIncrementally(employeeId);
      const nowIso = new Date().toISOString();
      dispatch(setLastCutomerSyncDate(nowIso));
    } catch (error) {
      console.error('Sync failed in UI layer:', error);
    } finally {
      setModalVisible(false);
    }
  };

  const syncDisabled = !isSyncStale(lastSyncDate, 3) && !isSyncing; // disable if synced < 3h ago

  const loadInitialData = useCallback(async () => {
    if (isConnected === null) return; // Wait for connectivity check
    setIsLoading(true);

    try {
      let apiResponse = null;
      let data: any[] = [];

      if (isConnected && employeeId) {
        apiResponse = await getClientsForAgent(employeeId, PAGE_SIZE, 1);
        data = apiResponse.customers || [];

        // Upsert customers & addresses
        // keep this code just in case
        // you want to update customers in sqlite
        // simply uncomment
        //
        // for (const c of data) {
        //   await upsertCustomer(c);
        // }
      } else {
        //  Offline: load from DB
        data = await queryDataWithPagination('customers', '1=1', [], PAGE_SIZE, 0);
      }

      // Classification
      await classifyCustomers(dispatch);

      // Update UI state
      if (data.length === 0) {
        setNoData(true);
      } else {
        setNoData(false);
        dispatch(setClients(data));
        setHasMore(data.length >= PAGE_SIZE);
        setCurrentPage(1);
      }

    } catch (e) {
      console.error('clients load err', e);
      setNoData(true);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, employeeId, dispatch]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);



  const ClientOrderNavigate = (client_id: string) => {
    dispatch(setClientId(client_id));
    (navigation as any).replace('Main', {
      screen: 'CatalogTab',
      params: {
        screen: 'Catalog',
        params: {
          title: 'Nuovo ordine'
        }
      }
    });

  }

  const classifyCustomers = async (dispatch: any) => {
    try {
      if (is_classified) return;
      const db = await getDBConnection();

      const query = `SELECT city, codice_cmnr, numero_ordinale, postcode FROM customers`;
      const results = await db.executeSql(query);

      const rows = results[0].rows;
      const cityMap: Record<string, number> = {};
      const codiceMap: Record<string, number> = {};
      const ordinaleMap: Record<string, number> = {};

      for (let i = 0; i < rows.length; i++) {
        const item = rows.item(i);
        //     console.log("item", item);

        // city
        if (item.city) {
          cityMap[item.city] = (cityMap[item.city] || 0) + 1;
        }

        // postcode (cap)
        if (item.postcode) {
          codiceMap[item.postcode] = (codiceMap[item.postcode] || 0) + 1;
        }

        // numero_ordinale
        if (item.numero_ordinale) {
          ordinaleMap[item.numero_ordinale] =
            (ordinaleMap[item.numero_ordinale] || 0) + 1;
        }
      }

      // convert to tuples
      const cityArray: [string, number][] = Object.entries(cityMap);
      const codiceArray: [string, number][] = Object.entries(codiceMap);
      const ordinaleArray: [string, number][] = Object.entries(ordinaleMap);

      // dispatch results to Redux
      dispatch(setCity(cityArray));
      dispatch(setPostcode(codiceArray)); // this is actually postcode
      dispatch(setNumeroOrdinal(ordinaleArray));
      dispatch(setClassified(true));

      //  console.log('✅ Customer classification completed successfully');
    } catch (err) {
      console.log('❌ classifyCustomers() error:', err);
    }
  };



  return (
    <SafeAreaView style={{ flex: 1, padding: 14 }}>
      {isConnected === false && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={20} color="#888" />
          <Text style={styles.offlineText}>Nessuna connessione internet</Text>
          <TouchableOpacity onPress={loadInitialData} style={styles.retryButton}>
            <Text style={styles.retryText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sync Header */}

      {!isSyncing && (
        <View style={styles.syncInfoBar}>
          <TouchableOpacity
            onPress={handleSync}
            style={styles.syncButton}
            disabled={syncDisabled}
          >
            <Ionicons
              name={isSyncing ? "sync" : "sync"}
              size={18}
              color={syncDisabled ? '#888' : '#007AFF'}
            />
            <Text
              style={[
                styles.syncButtonText,
                syncDisabled && { color: '#888' },
              ]}
            >
              {syncDisabled ? 'Aggiornato di recente' : 'Aggiorna ora'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.syncTimeText}>
            Ultimo: {formatInlineDate(lastSyncDate)}
          </Text>
        </View>
      )}

      {/* Modal */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="sync-outline" size={48} color={theme} />
            <Text style={styles.modalTitle}>Aggiornamento clienti</Text>
            <ActivityIndicator size="large" color={theme} style={styles.spinner} />
            <Text style={styles.statusText}>{syncStatusText}</Text>
            <Text style={styles.hintText}>Non interrompere la sincronizzazione</Text>
          </View>
        </View>
      </Modal>

      {noData ? (
        <View style={{ display: 'flex', flex: 1, padding: 2, alignItems: 'center' }}>
          <Text style={{ fontSize: 21, marginBottom: 8, color: '#00000027', fontWeight: 'bold' }}>Empty</Text>
        </View>
      ) : null}
      <FlatList
        data={clients}
        // ListHeaderComponent={SearchHeader}
        keyExtractor={(item) => String(localindex++)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Client Information stacked */}
            <View style={styles.infoSection}>
              <Text style={styles.infoText}>
                <Text style={styles.label}>Codice CMNR: </Text>
                {item.codice_cmnr}
              </Text>
              <Text style={styles.infoText}>
                <Text style={styles.label}>Numero Ordinale: </Text>
                {item.numero_ordinale}
              </Text>
              <Text style={styles.infoText}>
                <Text style={styles.label}>Azienda: </Text>
                {item.company}
              </Text>
              <Text style={styles.infoText}>
                <Text style={styles.label}>Città: </Text>
                {item.city}
              </Text>
              <Text style={styles.infoText}>
                <Text style={styles.label}>Cliente: </Text>
                {item.firstname} {item.lastname}
              </Text>
              <Text style={styles.infoText}>
                <Text style={styles.label}>Email: </Text>
                {item.email}
              </Text>
            </View>

            {/* Buttons on top */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.orderButton]}
                onPress={() => ClientOrderNavigate(item.id_customer)}
              >
                <Text style={styles.buttonText}>ORDINE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.detailsButton]}
                onPress={() => navigation.navigate('Dettagli', { customer: item.id_customer })}
              >
                <Text style={styles.buttonText}>DETTAGLI</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        onEndReached={() => {
          const loadMore = async () => {
            if (!hasMore || currentPage <= 0) return;
            if(stopLoad) return;

            const nextPage = currentPage + 1;
            const offset = (nextPage - 1) * PAGE_SIZE;

            try {
              const netInfo = await NetInfo.fetch();
              let more: any[] = [];

              if (netInfo.isConnected && employeeId) {
                const res = await getClientsForAgent(employeeId, PAGE_SIZE, nextPage);
                more = res.customers || [];
                for (const c of more) {
                  await upsertCustomer(c);
                }
              } else {
                more = await queryDataWithPagination('customers', '1=1', [], PAGE_SIZE, offset);
              }

              if (more.length > 0) {
                dispatch(setClients([...clients, ...more]));
                setCurrentPage(nextPage);
                setHasMore(more.length >= PAGE_SIZE);
              } else {
                setHasMore(false);
              }
            } catch (err) {
              console.error('Load more failed:', err);
            }
          };

          loadMore();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={hasMore ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
      />
      {/*  <Button
        title="Manual Sync (demo)"
        color="#007AFF"
        onPress={() => alert('Trigger sync from background service in a real app')}
      /> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: darkBg,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#bebebeff',
    borderRadius: 8,
    marginBottom: 10,
  },
  label: {
    color: 'rgba(0, 111, 167, 1)',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    minWidth: 70,
  },
  orderButton: {
    backgroundColor: '#059669',
  },
  detailsButton: {
    backgroundColor: theme,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 11,
  },
  infoSection: {
    flexDirection: 'column',
  },
  infoText: {
    color: textColor,
    fontSize: 14,
    marginBottom: 4,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchFieldContainer: {
    marginBottom: 10,
  },
  searchLabel: {
    color: textColor,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: darkerBg,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: textColor,
    fontSize: 15,
    paddingVertical: 6,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  syncTime: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  newBadge: {
    backgroundColor: '#2196F3',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  offlineText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  syncInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: darkerBg, // "#b9b9b9ff"
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
    color: '#007AFF', // your `theme`
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  syncTimeText: {
    color: '#888', // matches SyncTab
    fontSize: 13,
  },

  // --- Modal (optional: keep minimal; or reuse if you have global modal) ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
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
    marginHorizontal: 20,
  },
  hintText: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
  },
});