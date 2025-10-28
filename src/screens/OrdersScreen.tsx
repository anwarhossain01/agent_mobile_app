import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, ActivityIndicator, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { addOrder } from '../store/slices/ordersSlice';
import { getOrdersForCustomer, getOrdersFromServer, getSafeOrders } from '../api/prestashop';
import { useNavigation } from '@react-navigation/native';
import { darkBg, lighterTheme, textColor } from '../../colors';
import { queryData } from '../database/db';
import { SyncOrders } from '../components/SyncOrders';
import { getLatestServerOrders, storeServerOrders } from '../sync/cached';
import NetInfo from '@react-native-community/netinfo';
import { setClientId } from '../store/slices/cartSlice';

export default function OrdersScreen({ route }) {
  //  const localOrders = useSelector((s: RootState) => s.orders.items || []);
  const auth = useSelector((s: RootState) => s.auth);
  const [serverOrders, setServerOrders] = useState<any[]>([]);
  const [localOrders, setLocalOrders] = useState<any[]>([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const employeeId = route.params?.employee_id || auth.employeeId;
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [showbtn, setShowBtn] = useState(false);
  let localindex = 0;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const is_alert = route.params?.cached_order_alert || false;
      if (is_alert) {
        Alert.alert("Order is cached", "Please update this manually !");
      }

      setLoadingServer(true);
      setServerError(null);

      try {
        let state = await NetInfo.fetch();
        if (route.params?.employee_id) setShowBtn(true);

        let orders = null;
        if (state.isConnected) {
          if (route.params?.employee_id) {
            orders = await getOrdersForCustomer(employeeId);
          } else {
            orders = await getOrdersFromServer(employeeId);
            await storeServerOrders(orders);
          }
        } else {
          orders = await getLatestServerOrders(employeeId);
        }

        //   console.log("Orders res ", orders);

        if (!mounted) return;
        setServerOrders(orders);

        const localDbOrders = await queryData('orders', 'is_dirty = 1');
        // console.log(' Local cached orders:', localDbOrders);

        const normalizedLocalOrders = localDbOrders.map(o => ({
          id: o.id, // local primary key
          id_customer: o.id_customer,
          total_paid: o.total_paid,
          payment: o.payment || 'Manual payment',
          customer_name: `Local Order`, // placeholder
          date_add: o.created_at || o.updated_at,
          synced: !o.is_dirty,
          reference: o.remote_order_id ? `#${o.remote_order_id}` : null,
          company: null
        }));

        setLocalOrders(normalizedLocalOrders);

        const normalizedServerOrders = orders.map(o => ({
          id: o.id_order,
          id_customer: o.id_customer,
          customer_name: o.firstname + ' ' + o.lastname,
          company: o.company,
          total_paid: o.total_paid,
          date_add: o.date_add,
          synced: true,
          reference: o.reference,
          payment: o.payment
        }));

        const allOrders = [...normalizedServerOrders, ...normalizedLocalOrders].sort(
          (a, b) => new Date(b.date_add).getTime() - new Date(a.date_add).getTime()
        );

        setServerOrders(allOrders);

        if (!orders.length && !localDbOrders.length) {
          setServerError('Nessun ordine ');
        }

      } catch (e: any) {
        if (!mounted) return;
        console.error(' Order load error:', e);
        setServerOrders([]);
        setServerError('Failed to load orders.');
      } finally {
        if (mounted) setLoadingServer(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const createDemoOrder = () => {
    const localId = 'local-' + Date.now();
    dispatch(addOrder({ localId, clientId: 1, items: [], synced: false }));
    Alert.alert('Demo order created (offline). Background sync will attempt to push when online.');
  };

  // const normalizedServerOrders = serverOrders.map(o => ({
  //   id: o.id_order,
  //   id_customer: o.id_customer,
  //   customer_name: o.firstname + ' ' + o.lastname,
  //   company: o.company,
  //   total_paid: o.total_paid,
  //   date_add: o.date_add,
  //   synced: true,
  //   reference: o.reference,
  //   payment: o.payment
  // }));

  const parseDate = (d?: string) => (d ? new Date(String(d)) : new Date(0));
  const localNormalized = localOrders.map(lo => ({
    ...lo,
    date_add: lo.date_add || (lo.localId ? new Date(Number(lo.localId.replace('local-', ''))).toISOString() : null),
  }));

  // const allOrders = [...normalizedServerOrders, ...localNormalized].sort((a, b) =>
  //   parseDate(b.date_add).getTime() - parseDate(a.date_add).getTime()
  // );

  const newOrderRouteHandler = () => {
    dispatch(setClientId(employeeId));
    (navigation as any).replace('Main', {
      screen: 'CatalogTab',
      params: {
        screen: 'Catalog',
        params: {
          title: 'Nuovo ordine'
        }
      }
    });
    // (navigation as any).navigate('Main', {
    //   screen: 'OrdersTab',
    //   params: {
    //     screen: 'NewOrders',
    //     params: {
    //       client_id: employeeId,
    //     }
    //   }
    // });
  }

  const FloatingSyncButton = () => {
    if (localOrders.length > 0) {
      return <SyncOrders />;
    } else {
      return (
        <></>
      );
    }
  }

  const OrderCard = (item: any) => {
    item = item.item;

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.orderId}>Order #{item.localId || item.id}</Text>
          <View style={[styles.status, { backgroundColor: item.synced == true ? '#22C55E' : '#6B7280' }]}>
            <Text style={styles.statusText}>{item.synced == true ? 'Synced' : 'Pending'}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Customer:</Text>
          <Text style={styles.value}>{item.customer_name}</Text>
        </View>

        {item.reference && (
          <View style={styles.row}>
            <Text style={styles.label}>Reference:</Text>
            <Text numberOfLines={3} ellipsizeMode="tail" style={styles.companyvalue}>{item.reference}</Text>
          </View>
        )}

        {item.payment && (
          <View style={styles.row}>
            <Text style={styles.label}>Payment:</Text>
            <Text numberOfLines={3} ellipsizeMode="tail" style={styles.companyvalue}>{item.payment}</Text>
          </View>
        )}
        {item.company && (
          <View style={styles.row}>
            <Text style={styles.label}>Company:</Text>
            <Text numberOfLines={3} ellipsizeMode="tail" style={styles.companyvalue}>{item.company || '—'}</Text>
          </View>
        )}

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Text style={styles.label}>Total:</Text>
            <Text style={styles.amount}>{item.total_paid ? `€${parseFloat(item.total_paid).toFixed(2)}` : '—'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>
              {item.date_add ? new Date(item.date_add).toLocaleDateString() : '—'}
            </Text>
          </View>
        </View>
      </View>
    );
  };


  return (
    <View style={{ flex: 1, padding: 13 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 6 }}>
        <Text style={{ fontSize: 18, marginBottom: 12, color: textColor, fontWeight: 800 }}>Ordini</Text>
        {showbtn ? <Button title="NUOVO ORDINE +" color="#00bd29ff" onPress={newOrderRouteHandler} /> : null}
      </View>

      {loadingServer ? <ActivityIndicator color={textColor} /> : null}
      {serverError ? (
        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
          <Text style={{ color: 'red', marginBottom: 8, fontSize: 15 }}>{serverError}</Text>
        </View>
      ) : null}

      <FlatList
        data={serverOrders}
        keyExtractor={(item) => (localindex++).toString()}
        renderItem={({ item }) => (
          <OrderCard item={item} />
        )}
      />
      {/*       <Button title="Create Demo Order" color="#007AFF" onPress={createDemoOrder} />
 */}
      <FloatingSyncButton />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: darkBg,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#bbbbbbff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    color: textColor,
    fontSize: 15,
    fontWeight: '600',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap'
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: "#505050ff",
    fontSize: 13,
    marginRight: 6,
  },
  value: {
    color: textColor,
    fontWeight: 'bold',
    fontSize: 13,
  },
  companyvalue: {
    color: textColor,
    fontSize: 13,
    width: 150
  },
  amount: {
    color: textColor,
    fontSize: 13,
    fontWeight: '600',
  },

});