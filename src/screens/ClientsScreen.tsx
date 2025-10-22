import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setClients } from '../store/slices/clientsSlice';
import { getClientsForAgent } from '../api/prestashop';
import { useNavigation } from '@react-navigation/native';
import { darkBg } from '../../colors';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ClientsScreen() {
  const dispatch = useDispatch();
  const clients = useSelector((s: RootState) => s.clients.items);
  const auth = useSelector((s: RootState) => s.auth);
  const [noData, setNoData] = useState(false);
  const employeeId = auth.employeeId;
  const navigation = useNavigation();
  let localindex = 0;
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getClientsForAgent(employeeId || 0);
        console.log(data);
        
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
    <SafeAreaView style={{ flex: 1, padding: 14 }}>
      <Text style={{ fontSize: 18, marginBottom: 8, color: '#fff' }}>Clienti</Text>
      {noData ? (
        <View style={{ display: 'flex', flex: 1, padding: 2, alignItems: 'center' }}>
          <Text style={{ fontSize: 21, marginBottom: 8, color: '#ffffff27', fontWeight: 'bold' }}>Empty</Text>
        </View>
      ) : null}
      <FlatList
        data={clients}
        keyExtractor={(item) => String(localindex++)}
        renderItem={({ item }) => (
          <View style={styles.card}>
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
                onPress={() => Alert.alert('in development')}
              >
                <Text style={styles.buttonText}>DETTAGLI</Text>
              </TouchableOpacity>
            </View>

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
          </View>
        )}
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
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    borderRadius: 8,
    marginBottom: 10,
  },

  // infoSection: {
  //   flex: 1,
  //   marginRight: 12,
  // },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
    flexWrap: 'wrap', // allow wrapping if needed
  },
  label: {
    color: '#0af',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,

  },
  value: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 2,          // more space than label
    flexWrap: 'wrap', // wrap long text
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap', // buttons wrap if small screen
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    minWidth: 70,
  },

  orderButton: {
    backgroundColor: '#059669', // Green
  },

  detailsButton: {
    backgroundColor: '#2563EB', // Blue
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
  },

  infoSection: {
    flexDirection: 'column',
  },

  infoText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },

  // label: {
  //   fontWeight: '600',
  //   color: '#0af',
  // },
});
