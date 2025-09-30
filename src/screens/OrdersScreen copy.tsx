import React from 'react';
import { View, Text, FlatList, Button } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { addOrder } from '../store/slices/ordersSlice';

export default function OrdersScreen() {
  const orders = useSelector((s: RootState) => s.orders.items);
  const dispatch = useDispatch();

  const createDemoOrder = () => {
    const localId = 'local-' + Date.now();
    dispatch(addOrder({ localId, clientId: 1, items: [], synced: false }));
    alert('Demo order created (offline). Background sync will attempt to push when online.');
  };

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:18, marginBottom:8 }}>My Orders</Text>
      <FlatList
        data={orders}
        keyExtractor={(item)=>String(item.localId || item.id)}
        renderItem={({item})=>(
          <View style={{ padding:12, borderBottomWidth:1 }}>
            <Text>Order: {item.localId || item.id}</Text>
            <Text>Synced: {String(item.synced)}</Text>
          </View>
        )}
      />
      <Button title="Create Demo Order" onPress={createDemoOrder} />
    </View>
  );
}
