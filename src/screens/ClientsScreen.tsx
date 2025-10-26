import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Button, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setClients } from '../store/slices/clientsSlice';
import { getCachedClientsForAgent, getCachedClientsForAgentFrontPage, getClientsForAgent } from '../api/prestashop';
import { useNavigation } from '@react-navigation/native';
import { darkBg, textColor, theme, darkerBg } from '../../colors'; // Imported darkerBg
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import NetInfo from '@react-native-community/netinfo';
import { getDBConnection } from '../database/db';
import { selectIsClassified, setCity, setClassified, setCodiceCmnr, setNumeroOrdinal } from '../store/slices/customerClassificationSlice';


export default function ClientsScreen() {
  const dispatch = useDispatch();
  const clients = useSelector((s: RootState) => s.clients.items);
  const auth = useSelector((s: RootState) => s.auth);
  const is_classified = useSelector(selectIsClassified);
  const [noData, setNoData] = useState(false);
  const employeeId = auth.employeeId;
  const navigation = useNavigation();
  let localindex = 0;
  useEffect(() => {
    const load = async () => {
      try {
        let state = await NetInfo.fetch();
        let data = null;

        data = await getCachedClientsForAgentFrontPage(employeeId || 0);
        await classifyCustomers(dispatch);
      // console.log("Clients res", data);

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

  const classifyCustomers = async (dispatch : any) => {
  try {
    if(is_classified) return;
    const db = await getDBConnection();

    const query = `SELECT city, codice_cmnr, numero_ordinale FROM customers`;
    const results = await db.executeSql(query);

    const rows = results[0].rows;
    const cityMap: Record<string, number> = {};
    const codiceMap: Record<string, number> = {};
    const ordinaleMap: Record<string, number> = {};

    for (let i = 0; i < rows.length; i++) {
      const item = rows.item(i);

      // city
      if (item.city) {
        cityMap[item.city] = (cityMap[item.city] || 0) + 1;
      }

      // codice_cmnr (cap)
      if (item.codice_cmnr) {
        codiceMap[item.codice_cmnr] = (codiceMap[item.codice_cmnr] || 0) + 1;
      }

      // numero_ordinale
      if (item.numero_ordinale) {
        ordinaleMap[item.numero_ordinale] =
          (ordinaleMap[item.numero_ordinale] || 0) + 1;
      }
    }

    // convert to tuples
    const cityArray: [string, number][] = Object.entries(cityMap);
    const codiceArray: [string, number][] = Object.entries(codiceMap);
    const ordinaleArray: [string, number][] = Object.entries(ordinaleMap);

    // dispatch results to Redux
    dispatch(setCity(cityArray));
    dispatch(setCodiceCmnr(codiceArray));
    dispatch(setNumeroOrdinal(ordinaleArray));
    dispatch(setClassified(true));

    console.log('✅ Customer classification completed successfully');
  } catch (err) {
    console.log('❌ classifyCustomers() error:', err);
  }
};
  const SearchHeader = () => {
    const [citySearch, setCitySearch] = useState('');
    const [ordinalNumberSearch, setOrdinalNumberSearch] = useState('');
    const dispatch = useDispatch();

    const handleSearch = async () => {
      try {
        const city = citySearch.trim() || null;
        const numero_ordinale = ordinalNumberSearch.trim() || null;

        const data = await getCachedClientsForAgentFrontPage(
          employeeId || 0,
          '', 
          city,
          numero_ordinale
        );

        console.log('Search result', data);
        dispatch(setClients(data)); // update redux
      } catch (e) {
        console.log('Search error', e);
      }
    };

    return (
      <View style={styles.searchContainer}>
        <View style={styles.searchFieldContainer}>
          <Text style={styles.searchLabel}>Città</Text>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={18} color={textColor} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={citySearch}
              onChangeText={setCitySearch}
              placeholder="Search by city"
              placeholderTextColor="#888"
            />
          </View>
        </View>

        <View style={styles.searchFieldContainer}>
          <Text style={styles.searchLabel}>Numero Ordinale</Text>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search-outline" size={18} color={textColor} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={ordinalNumberSearch}
              onChangeText={setOrdinalNumberSearch}
              placeholder="Search by ordinal number"
              placeholderTextColor="#888"
            />
          </View>
        </View>

        {/* Search Button */}
        <TouchableOpacity
          style={{
            marginTop: 8,
            backgroundColor: '#007AFF',
            paddingVertical: 10,
            borderRadius: 5,
            alignItems: 'center',
          }}
          onPress={handleSearch}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Search</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 14 }}>
      {/* <Text style={{ fontSize: 20, marginBottom: 8, color: textColor }}>Clienti</Text> */}

      {noData ? (
        <View style={{ display: 'flex', flex: 1, padding: 2, alignItems: 'center' }}>
          <Text style={{ fontSize: 21, marginBottom: 8, color: '#00000027', fontWeight: 'bold' }}>Empty</Text>
        </View>
      ) : null}
      <FlatList
        data={clients}
      // ListHeaderComponent={SearchHeader}
        keyExtractor={(item) => String(localindex++)}
        renderItem={({ item }) => (
          <View style={styles.card}>
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
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#bebebeff',
    borderRadius: 8,
    marginBottom: 10,
  },
  label: {
    color: 'rgba(0, 111, 167, 1)',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    minWidth: 70,
  },
  orderButton: {
    backgroundColor: '#059669',
  },
  detailsButton: {
    backgroundColor: theme,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 11,
  },
  infoSection: {
    flexDirection: 'column',
  },
  infoText: {
    color: textColor,
    fontSize: 14,
    marginBottom: 4,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchFieldContainer: {
    marginBottom: 10,
  },
  searchLabel: {
    color: textColor,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: darkerBg,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: textColor,
    fontSize: 15,
    paddingVertical: 6,
  },
});