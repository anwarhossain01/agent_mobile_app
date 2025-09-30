import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { addOrder } from '../store/slices/ordersSlice';
import { getSafeOrders } from '../api/prestashop';

export default function OrdersScreen() {
  const localOrders = useSelector((s: RootState) => s.orders.items || []);
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
        const orders = await getSafeOrders(50);
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
    id: o.id,
    id_customer: o.id_customer,
    total_paid: o.total_paid,
    date_add: o.date_add,
    synced: true,
  }));

  const parseDate = (d?: string) => (d ? new Date(String(d)) : new Date(0));
  const localNormalized = localOrders.map(lo => ({
    ...lo,
    date_add: lo.date_add || (lo.localId ? new Date(Number(lo.localId.replace('local-', ''))).toISOString() : null),
  }));

  const allOrders = [...normalizedServerOrders, ...localNormalized].sort((a, b) =>
    parseDate(b.date_add).getTime() - parseDate(a.date_add).getTime()
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 8, color: '#fff' }}>My Orders</Text>

      {loadingServer ? <ActivityIndicator color="#fff" /> : null}
      {serverError ? <Text style={{ color: 'red', marginBottom: 8 }}>{serverError}</Text> : null}

      <FlatList
        data={allOrders}
        keyExtractor={(item) => String(item.localId || item.id)}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#333' }}>
            <Text style={{ color: '#fff' }}>Order: {item.localId || item.id}</Text>
            <Text style={{ color: '#fff' }}>Customer ID: {item.clientId || item.id_customer}</Text>
            <Text style={{ color: '#fff' }}>Total: {item.total_paid ?? '—'}</Text>
            <Text style={{ color: '#fff' }}>Synced: {String(!!item.synced)}</Text>
            <Text style={{ color: '#fff' }}>Date: {item.date_add ? new Date(item.date_add).toLocaleString() : '—'}</Text>
          </View>
        )}
      />
      <Button title="Create Demo Order" color="#007AFF" onPress={createDemoOrder} />
    </View>
  );
}
