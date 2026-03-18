import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, ActivityIndicator, StyleSheet, Alert, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
  const employeeId = auth.employeeId; //|| route.params?.employee_id;
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState(null);
  const [searchQuery, setSearchQuery] = useState<any>(null);
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
        //  if (route.params?.employee_id) setShowBtn(true);

        let orders = null;
        if (state.isConnected) {
          //if (route.params?.employee_id) {
          //  orders = await getOrdersForCustomer(employeeId);
          // } else {
          orders = await getOrdersFromServer(employeeId, searchQuery);
          await storeServerOrders(orders);
          //  }
        } else {
          orders = await getLatestServerOrders(employeeId);
        }

        console.log("Orders res", orders);

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
          last_message: o.last_message,
          synced: !o.is_dirty,
          reference: o.remote_order_id ? `#${o.remote_order_id}` : null,
          note: o.note,
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
          last_message: o.last_message,
          synced: true,
          reference: o.reference,
          note: o.note,
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
  }, [searchQuery]);

  const submitSearch = () =>{
   // console.log(": Searching For , ", searchText);
   setSearchQuery(searchText);
  }

  const parseDate = (d?: string) => (d ? new Date(String(d)) : new Date(0));
  const localNormalized = localOrders.map(lo => ({
    ...lo,
    date_add: lo.date_add || (lo.localId ? new Date(Number(lo.localId.replace('local-', ''))).toISOString() : null),
  }));


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
    const [modalVisible, setModalVisible] = useState(false)

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

        {item.last_message && <>
          <TouchableOpacity style={styles.msgIconContainer} onPress={() => setModalVisible(true)}>
            <Ionicons name="chatbox-ellipses-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <LastMsgModal visible={modalVisible} onRequestClose={() => setModalVisible(false)} message={item.last_message} />
        </>}

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
        {item.note && (
          <View style={styles.row}>
            <Text style={styles.label}>Note:</Text>
            <Text numberOfLines={3} ellipsizeMode="tail" style={styles.companyvalue}>{item.note || '—'}</Text>
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
      <View style={{ padding: 6 }}>
        {!showSearch ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, color: textColor, fontWeight: '800' }}>Ordini</Text>

            <TouchableOpacity onPress={() => setShowSearch(true)}>
              <Ionicons name="search" size={24} color="black" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: darkBg,
            borderRadius: 8,
            paddingHorizontal: 8
          }}>

            <TextInput
              style={{
                flex: 1,
                height: 40,
                color: textColor
              }}
              placeholder="Search by customer"
              placeholderTextColor="#888"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />

            <TouchableOpacity onPress={submitSearch} >
              <Ionicons name="search" size={24} color="black" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowSearch(false);
                setSearchText('');
                setSearchQuery(null);
              }}
              style={{ marginHorizontal: 6 }}
            >
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>

          </View>
        )}
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

const LastMsgModal = ({ visible = false, onRequestClose = () => { }, message = '' }) => {
  return (
    <Modal visible={visible} onRequestClose={onRequestClose} transparent animationType="slide">
      <View style={styles.modalBody}>
        <View style={styles.modalContent}>
          <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e7ecf0' }]}>
            <View style={[{ width: 30 }]}></View>
            <Text style={[{ color: 'black', fontWeight: 'bold', fontSize: 16, textAlign: 'center', flex: 1, }]}>
              Ultimo messaggio
            </Text>
            <TouchableOpacity style={[styles.modalCloseBtn]} onPress={onRequestClose}>
              <Ionicons name="close-outline" size={22} color="red" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 15 }}>
            <Text style={[{ color: '#888888' }]}>
              {message}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
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
  msgIconContainer: {
    position: 'absolute',
    right: 14,
    bottom: '35%',
    height: 35,
    width: 35,
    borderRadius: 5,
    backgroundColor: '#4E61D3',
    justifyContent: 'center',
    alignItems: 'center'
  },

  // last msg modal
  modalBody: {
    flex: 1,
    backgroundColor: "#00000080",
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    minHeight: 200,
    maxHeight: 400,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden'
  },
  modalCloseBtn: {
    height: 30,
    width: 30,
    borderRadius: 15,
    margin: 5,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center'
  },
});