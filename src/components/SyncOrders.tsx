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
import { createCart, createCustomerThreadWithMessage, createCustomMessage, createOrder } from '../api/prestashop';
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

      // Get all carts and orders that need syncing
      const carts = await queryData('carts', 'is_dirty = 1');
      const orders = await queryData('orders', 'is_dirty = 1');

      if (carts.length === 0 && orders.length === 0) {
        Alert.alert('Sync', 'No pending carts or orders to sync.');
        setIsSyncing(false);
        return;
      }
      // Loop through each dirty order
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

        // Create remote cart
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

        //  Create order
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

        if (order.note) {
          const orderMsgRes = await createCustomerThreadWithMessage({
            id_order: orderRes.data.order.id,
            id_customer: parseInt(order.id_customer),
            note: order.note
          });

          //  console.log(orderMsgRes);
          const orderMsgResServer = await createCustomMessage({
            id_order: orderRes.data.order.id,
            id_cart: parseInt(remoteCartId),
            id_customer: order.id_customer,
            id_employee: order.id_employee,
            message: order.note,
            is_private: 0
          });
        }

        if (!orderRes.success) {
          console.log(`❌ Failed to sync order ${order.id}`, orderRes.error);
          continue;
        }

        const remoteOrderId = orderRes.data?.order?.id || null;
        setStatus(`Order synced with remote ID ${remoteOrderId}`);

        // Mark both as synced
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
    padding: 14,
    elevation: 5,
    top: 8,
    right: 18
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
