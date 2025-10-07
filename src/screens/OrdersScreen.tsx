import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, ActivityIndicator, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { addOrder } from '../store/slices/ordersSlice';
import { getOrdersFromServer, getSafeOrders } from '../api/prestashop';

export default function OrdersScreen() {
  const localOrders = useSelector((s: RootState) => s.orders.items || []);
  const auth = useSelector((s: RootState) => s.auth);
  const [serverOrders, setServerOrders] = useState<any[]>([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingServer(true);
      setServerError(null);
      try {
        const orders = await getOrdersFromServer(auth.employeeId);//await getSafeOrders(50);
        console.log("orders: ", orders);

        if (!mounted) return;
        setServerOrders(orders);
        if (!orders.length) {
          setServerError('No server orders returned (or server blocked some fields).');
        }
      } catch (e: any) {
        if (!mounted) return;
        setServerOrders([]);
        setServerError('Failed to load server orders.');
      } finally {
        if (mounted) setLoadingServer(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const createDemoOrder = () => {
    const localId = 'local-' + Date.now();
    dispatch(addOrder({ localId, clientId: 1, items: [], synced: false }));
    alert('Demo order created (offline). Background sync will attempt to push when online.');
  };

  const normalizedServerOrders = serverOrders.map(o => ({
    id: o.id_order,
    id_customer: o.id_customer,
    customer_name: o.firstname + ' ' + o.lastname,
    company: o.company,
    total_paid: o.total_paid,
    date_add: o.date_add,
    synced: true,
    reference: o.reference
  }));

  const parseDate = (d?: string) => (d ? new Date(String(d)) : new Date(0));
  const localNormalized = localOrders.map(lo => ({
    ...lo,
    date_add: lo.date_add || (lo.localId ? new Date(Number(lo.localId.replace('local-', ''))).toISOString() : null),
  }));

  const allOrders = [...normalizedServerOrders, ...localNormalized].sort((a, b) =>
    parseDate(b.date_add).getTime() - parseDate(a.date_add).getTime()
  );

  const OrderCard = (item: any) => {
    item = item.item;

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.orderId}>Order #{item.localId || item.id}</Text>
          <View style={[styles.status, { backgroundColor: item.synced ? '#22C55E' : '#6B7280' }]}>
            <Text style={styles.statusText}>{item.synced ? 'Synced' : 'Pending'}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Customer:</Text>
          <Text style={styles.value}>{item.customer_name}</Text>
        </View>

        {item.company && (
          <View style={styles.row}>
            <Text style={styles.label}>Company:</Text>
            <Text style={styles.value}>{item.company}</Text>
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
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 8, color: '#fff' }}>My Orders</Text>

      {loadingServer ? <ActivityIndicator color="#fff" /> : null}
      {serverError ? (
        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
          <Text style={{ color: 'red', marginBottom: 8, fontSize: 15 }}>{serverError}</Text>
        </View>
      ) : null}

      <FlatList
        data={allOrders}
        keyExtractor={(item) => String(item.localId || item.id)}
        renderItem={({ item }) => (
          <OrderCard item={item} />
        )}
      />
      <Button title="Create Demo Order" color="#007AFF" onPress={createDemoOrder} />
    </View>
  );
}

const styles = StyleSheet.create({
 card: {
    backgroundColor: '#1d1d1dff',
    padding: 16,
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
    fontSize: 18,
    fontWeight: '600',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
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
    fontSize: 15,
    marginRight: 6,
  },
  value: {
    color: '#fff',
    fontSize: 15,
  },
  amount: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});