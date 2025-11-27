import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setClients } from '../store/slices/clientsSlice';
import { getCachedClientsForAgent, getCachedClientsForAgentFrontPage, getClientsForAgent } from '../api/prestashop';
import { useNavigation } from '@react-navigation/native';
import { darkBg, textColor, theme, darkerBg } from '../../colors'; // Imported darkerBg
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import NetInfo from '@react-native-community/netinfo';
import { getDBConnection, queryData, queryDataWithPagination } from '../database/db';
import { selectIsClassified, setCity, setClassified, setNumeroOrdinal, setPostcode } from '../store/slices/customerClassificationSlice';
import { setClientId } from '../store/slices/cartSlice';
import { upsertCustomer } from '../sync/cached';
import { selectLastCustomerSyncDate, setLastCutomerSyncDate } from '../store/slices/databaseStatusSlice';


export default function ClientsScreen() {
  const dispatch = useDispatch();
  const clients = useSelector((s: RootState) => s.clients.items);
  const auth = useSelector((s: RootState) => s.auth);
  const is_classified = useSelector(selectIsClassified);
  const [noData, setNoData] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  let localindex = 0;

  const employeeId = auth.employeeId;
  const navigation = useNavigation();
  const PAGE_SIZE = 15;

  // Inside ClientsScreen, after hooks
  const lastSyncDate = useSelector(selectLastCustomerSyncDate);
  const [syncStatus, setSyncStatus] = useState<string>(''); // 'up-to-date' | 'new-available' | ''
  const [localCount, setLocalCount] = useState(0);
  const [remoteCount, setRemoteCount] = useState(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

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
        for (const c of data) {
          await upsertCustomer(c);
        }
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

      //  Set sync status using cached API response (no extra call!)
      if (apiResponse && employeeId) {
        const local = await queryData('customers');
        const localCnt = local.length;
        const remoteCnt = apiResponse.total_customers || 0;
        setLocalCount(localCnt);
        setRemoteCount(remoteCnt);
        setSyncStatus(remoteCnt > localCnt ? 'new-available' : 'up-to-date');
      } else if (!isConnected) {
        // Offline — assume unknown sync status (disable sync)
        setSyncStatus('');
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
  // useEffect(() => {
  //   const loadInitialPage = async () => {
  //     try {
  //       const netInfo = await NetInfo.fetch();
  //       let data: any[] = [];

  //       if (netInfo.isConnected && employeeId) {
  //         // 🌐 Online: fetch from API (page 1)
  //         console.log('🌐 Loading page 1 from server...');
  //         data = await getClientsForAgent(employeeId, PAGE_SIZE, 1);
  //         console.log(data);

  //         data = data.customers || [];

  //         // Upsert all into local DB (so offline works next time)
  //         for (const c of data) {
  //           await upsertCustomer(c);
  //         }
  //       } else {
  //         // Offline: load from local DB
  //         console.log(' Offline — loading page 1 from cache...');
  //         data = await queryDataWithPagination('customers', '1=1', [], PAGE_SIZE, 0);
  //       }

  //       await classifyCustomers(dispatch);

  //       if (data.length === 0) {
  //         setNoData(true);
  //       } else {
  //         setNoData(false);
  //         dispatch(setClients(data));
  //         setHasMore(data.length >= PAGE_SIZE);
  //         setCurrentPage(1);
  //       }
  //     } catch (e) {
  //       console.error('clients load err', e);
  //     }
  //   };

  //   loadInitialPage();
  // }, [dispatch, employeeId]);
  // useEffect(() => {
  //   const load = async () => {
  //     try {
  //       let state = await NetInfo.fetch();
  //       let data = null;
  //       data = await getClientsForAgent(employeeId || 0, PAGE_SIZE, 1);
  //      // data = await getCachedClientsForAgentFrontPage(employeeId || 0);
  //       await classifyCustomers(dispatch);
  //       console.log("Clients res", data);

  //       if (data.length === 0) {
  //         setNoData(true);
  //       }

  //       dispatch(setClients(data));
  //     } catch (e) {
  //       console.log('clients load err', e);
  //     }
  //   };
  //   load();
  // }, [dispatch, employeeId]);


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
    // (navigation as any).replace('Main', {
    //   screen: 'OrdersTab',
    //   params: {
    //     screen: 'Orders',
    //     params: {
    //       employee_id: client_id,
    //     }
    //   }
    // });
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
      {/* {isConnected !== false && (
        <View style={styles.syncHeader}>
          <TouchableOpacity
            style={[styles.syncButton, (!isConnected || syncStatus !== 'new-available') && styles.syncButtonDisabled]}
            onPress={async () => {
              if (!employeeId || !isConnected) return;

              try {
                const res = await getClientsForAgent(employeeId, 50, 1);
                const newCustomers = res.customers || [];

                if (newCustomers.length === 0) {
                  setSyncStatus('up-to-date');
                  return;
                }

                for (const c of newCustomers) {
                  await upsertCustomer(c);
                }

                const now = new Date().toISOString();
                dispatch(setLastCutomerSyncDate(now));
                await loadInitialData();

                Alert.alert('✅ Sincronizzato', `${newCustomers.length} nuovi clienti aggiunti.`);
              } catch (err) {
                console.error('Sync failed:', err);
                Alert.alert('❌ Errore', 'Impossibile sincronizzare i clienti.');
              }
            }}
            disabled={!isConnected || syncStatus !== 'new-available'}
          >
            <Ionicons
              name={syncStatus === 'new-available' ? 'sync' : 'checkmark-circle'}
              size={18}
              color={syncStatus === 'new-available' && isConnected ? '#fff' : '#888'}
            />
            <Text style={[
              styles.syncButtonText,
              (!isConnected || syncStatus !== 'new-available') && { color: '#888' }
            ]}>
              {syncStatus === 'new-available' ? 'Sincronizza Nuovi' :
                isConnected ? 'Aggiornato' : 'Offline'}
            </Text>
          </TouchableOpacity>

          {lastSyncDate ? (
            <Text style={styles.syncTime}>
              Ultimo: {new Date(lastSyncDate).toLocaleDateString()}{' '}
              {new Date(lastSyncDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          ) : (
            <Text style={styles.syncTime}></Text>
          )}

          {syncStatus === 'new-available' && (
            <Text style={styles.newBadge}>🆕 {remoteCount - localCount} nuovi</Text>
          )}
        </View>
      )} */}

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
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
  syncButtonDisabled: {
    backgroundColor: '#555',
  },
});