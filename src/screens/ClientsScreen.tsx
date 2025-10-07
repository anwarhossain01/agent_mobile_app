import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setClients } from '../store/slices/clientsSlice';
import { getClientsForAgent } from '../api/prestashop';
import { useNavigation } from '@react-navigation/native';

export default function ClientsScreen() {
  const dispatch = useDispatch();
  const clients = useSelector((s: RootState) => s.clients.items);
  const auth = useSelector((s: RootState) => s.auth);
  const [noData, setNoData] = useState(false);
  const employeeId = auth.employeeId;
  const navigation = useNavigation();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getClientsForAgent(employeeId || 0);
        if (data.length === 0) {
          setNoData(true);
        }

        dispatch(setClients(data));
      } catch (e) {
        console.log('clients load err', e);
      }
    };
    load();
  }, [dispatch, employeeId]);

  const ClientOrderNavigate = (client_id: string) => {

    (navigation as any).replace('Main', {
      screen: 'OrdersTab',
      params: {
        screen: 'Orders',
        params: {
          employee_id: client_id,
        }
      }
    });
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 8, color: '#fff' }}>Assigned Clients</Text>
      {noData ? (
        <View style={{ display: 'flex', flex: 1, padding: 2, alignItems: 'center' }}>
          <Text style={{ fontSize: 21, marginBottom: 8, color: '#ffffff27', fontWeight: 'bold' }}>Empty</Text>
        </View>
      ) : null}
      <FlatList
        data={clients}
        keyExtractor={(item) => String(item.id || item.id_customer)}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#333',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ color: '#fff' }}>{item.firstname} {item.lastname}</Text>
              <Text style={{ color: '#fff' }}>{item.email}</Text>
            </View>

            <View style={{ display: 'flex', flexDirection: 'row' }}>
              <TouchableOpacity
                style={styles.buttonStyle}
                onPress={() => {ClientOrderNavigate(item.id_customer)}}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 11 }}>ORDINE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonStyle}
                onPress={() => alert('in development')}
              >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 11 }}>DETTAGLI</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <Button
        title="Manual Sync (demo)"
        color="#007AFF"
        onPress={() => alert('Trigger sync from background service in a real app')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  buttonStyle: {
    margin: 3,
    backgroundColor: '#0077ffff',
    paddingHorizontal: 6,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
