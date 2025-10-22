import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getDBConnection, queryData } from '../database/db';
import { createCart, createOrder } from '../api/prestashop';
import NetInfo from '@react-native-community/netinfo';
import { lighterTheme } from '../../colors';
import { useNavigation } from '@react-navigation/native';

export const SyncOrders = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState('Preparing to sync...');
  const navigation = useNavigation();

  const handleSyncOrders = async () => {
    let state = await NetInfo.fetch();
    let isConnected = state.isConnected;
    if (!isConnected) {
      Alert.alert('Internet Is Required', 'verifica la connessione di rete');
      return;
    }

    const db = await getDBConnection();
    try {
      setIsSyncing(true);
      setStatus('Fetching local carts and orders...');

      // 1️⃣ Get all carts and orders that need syncing
      const carts = await queryData('carts', 'is_dirty = 1');
      const orders = await queryData('orders', 'is_dirty = 1');

      if (carts.length === 0 && orders.length === 0) {
        Alert.alert('Sync', 'No pending carts or orders to sync.');
        setIsSyncing(false);
        return;
      }

      // 2️⃣ Loop through each dirty order
      for (const order of orders) {
        setStatus(`Syncing order ID ${order.id}...`);

        const cart = carts.find(c => c.id === order.id_cart);
        if (!cart) {
          console.log(`⚠️ Cart not found for order ${order.id}, skipping.`);
          continue;
        }

        const cartItems = await queryData('cart_items', 'cart_id = ?', [cart.id]);
        if (!cartItems.length) {
          console.log(`⚠️ No items found for cart ${cart.id}, skipping.`);
          continue;
        }

        // 🛒 Step 1️⃣ Create remote cart
        setStatus(`Creating cart #${cart.id} on server...`);
        const products = cartItems.map(item => ({
          id_product: item.id_product,
          quantity: item.quantity,
          id_product_attribute: item.id_product_attribute || 0,
          id_address_delivery: item.id_address_delivery || cart.id_address_delivery,
        }));

        const cartRes = await createCart(
          cart.id_currency,
          cart.id_lang,
          cart.id_customer,
          cart.id_address_delivery,
          cart.id_address_invoice,
          products
        );

        if (!cartRes.success || !cartRes.data?.cart?.id) {
          console.log('❌ Failed to sync cart', cartRes.error);
          continue;
        }

        const remoteCartId = cartRes.data.cart.id;
        setStatus(`Cart synced with remote ID ${remoteCartId}`);

        // 🧾 Step 2️⃣ Create order
        setStatus(`Creating order for cart #${cart.id}...`);
        const orderRes = await createOrder({
          id_employee: order.id_employee,
          id_address_delivery: order.id_address_delivery,
          id_address_invoice: order.id_address_invoice,
          id_cart: remoteCartId,
          id_currency: order.id_currency,
          id_lang: order.id_lang,
          id_customer: order.id_customer,
          id_carrier: order.id_carrier,
          module: order.module,
          payment: order.payment,
          total_paid: order.total_paid,
          total_paid_real: order.total_paid_real,
          total_products: order.total_products,
          total_products_wt: order.total_products_wt,
          total_shipping: order.total_shipping,
          total_shipping_tax_incl: order.total_shipping_tax_incl,
          total_shipping_tax_excl: order.total_shipping_tax_excl,
          conversion_rate: order.conversion_rate,
        });

        if (!orderRes.success) {
          console.log(`❌ Failed to sync order ${order.id}`, orderRes.error);
          continue;
        }

        const remoteOrderId = orderRes.data?.order?.id || null;
        setStatus(`Order synced with remote ID ${remoteOrderId}`);

        // ✅ Step 3️⃣ Mark both as synced
        await db.executeSql(
          `UPDATE orders SET is_dirty = 0, remote_order_id = ?, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [remoteOrderId, order.id]
        );
        await db.executeSql(
          `UPDATE carts SET is_dirty = 0, remote_cart_id = ?, last_synced_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [remoteCartId, cart.id]
        );
      }

      setStatus('✅ All orders synced successfully!');
      setTimeout(() => setIsSyncing(false), 1500);
      setTimeout(() => {
        (navigation as any).replace('Main', {
          screen: 'OrdersTab',
          params: {
            screen: 'Orders',
            params: {
              employee_id: null,
            }
          }
        });
      }, 1900)
    } catch (error) {
      console.error('❌ handleSyncOrders error:', error);
      setStatus('Sync failed: ' + error.message);
      setTimeout(() => setIsSyncing(false), 2000);
    }
  };

  // 🧩 Floating sync button UI
  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={handleSyncOrders}>
        <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Modal for progress */}
      <Modal transparent visible={isSyncing} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={{ marginTop: 12, textAlign: 'center' }}>{status}</Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

// 🧱 Styles
const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    backgroundColor: lighterTheme,
    borderRadius: 50,
    padding: 16,
    elevation: 5,
    bottom: 30,
    right: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: '80%',
  },
});
