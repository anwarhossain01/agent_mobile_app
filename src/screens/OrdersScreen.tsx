import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, ActivityIndicator, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { addOrder } from '../store/slices/ordersSlice';
import { getOrdersForCustomer, getOrdersFromServer, getSafeOrders } from '../api/prestashop';
import { useNavigation } from '@react-navigation/native';
import { darkBg, lighterTheme } from '../../colors';
import { queryData } from '../database/db';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function OrdersScreen({ route }) {
  const localOrders = useSelector((s: RootState) => s.orders.items || []);
  const auth = useSelector((s: RootState) => s.auth);
  const [serverOrders, setServerOrders] = useState<any[]>([]);
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
        console.log("Employee ID:", employeeId);
        if (route.params?.employee_id) setShowBtn(true);

        // 🟢 1️⃣ Fetch server orders
        let orders = null;
        if (route.params?.employee_id) {
          orders = await getOrdersForCustomer(employeeId);
        } else {
          orders = await getOrdersFromServer(employeeId);
        }

        if (!mounted) return;
        setServerOrders(orders);

        // 🟢 2️⃣ Fetch local cached orders from SQLite
        const localDbOrders = await queryData('orders'); // returns [{...}, {...}]
       // console.log('🧾 Local cached orders:', localDbOrders);

        // 🧩 Normalize local orders to fit UI
        const normalizedLocalOrders = localDbOrders.map(o => ({
          id: o.id, // local primary key
          id_customer: o.id_customer,
          total_paid: o.total_paid,
          payment: o.payment || 'Manual payment',
          customer_name: `Local Order`, // placeholder
          date_add: o.created_at || o.updated_at,
          synced: false,
          reference: o.remote_order_id ? `#${o.remote_order_id}` : null,
          company: null
        }));

        // 🟢 3️⃣ Normalize server orders
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

        // 🟢 4️⃣ Merge both sets
        const allOrders = [...normalizedServerOrders, ...normalizedLocalOrders].sort(
          (a, b) => new Date(b.date_add).getTime() - new Date(a.date_add).getTime()
        );

        // 🟢 5️⃣ Update state
        setServerOrders(allOrders);

        if (!orders.length && !localDbOrders.length) {
          setServerError('Nessun ordine ');
        }

      } catch (e: any) {
        if (!mounted) return;
        console.error('❌ Order load error:', e);
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
    (navigation as any).navigate('Main', {
      screen: 'OrdersTab',
      params: {
        screen: 'NewOrders',
        params: {
          client_id: employeeId,
        }
      }
    });
  }

  const SyncOrder = async () => {

  }

   const FloatingSyncButton = () => (
  <TouchableOpacity style={styles.fab} onPress={SyncOrder}>
    <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
  </TouchableOpacity>
);

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
            <Text style={styles.amount}>{item.total_paid ? `€${item.total_paid}` : '—'}</Text>
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 18, marginBottom: 12, color: '#fff' }}>Ordini</Text>
        {showbtn ? <Button title="NUOVO ORDINE +" color="#00bd29ff" onPress={newOrderRouteHandler} /> : null}
      </View>

      {loadingServer ? <ActivityIndicator color="#fff" /> : null}
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
    borderLeftColor: '#3a3a3aff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    color: '#fff',
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
    color: '#A0AEC0',
    fontSize: 13,
    marginRight: 6,
  },
  value: {
    color: '#fff',
    fontSize: 13,
  },
  companyvalue: {
    color: '#fff',
    fontSize: 13,
    width: 150
  },
  amount: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: lighterTheme,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});