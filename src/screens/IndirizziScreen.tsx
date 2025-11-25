import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, SafeAreaView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store'; // adjust path as needed
import { getCachedClientsForAgentFrontPage, getAddressesForCustomer } from '../api/prestashop';
import { dark, darkBg, darkerBg, textColor, theme } from '../../colors';
import { all } from 'axios';


const IndirizziScreen = () => {
  const auth = useSelector((s: RootState) => s.auth);
  const employeeId = auth.employeeId;

  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  const loadAddresses = async () => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setAddresses([]); // start fresh

      // Get clients → extract IDs
      const clients = await getCachedClientsForAgentFrontPage(employeeId || 0);
      if (!clients || clients.length === 0) {
        setAddresses([]);
        return;
      }

      const customerIds = clients.map(c => c.id_customer);

      //  Fetch addresses sequentially, 1 per second
      const allAddresses: any[] = [];

      for (let i = 0; i < customerIds.length; i++) {
        const id = customerIds[i];

        //  update UI progressively
        setAddresses([...allAddresses]); 
        if(allAddresses.length > 0){
          setLoading(false);
        }

        const res = await getAddressesForCustomer(id);
        if (res.success && res.data?.length) {
          allAddresses.push(...res.data);
        }

        //  Wait 1 second before next request (unless last one)
        if (i < customerIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setAddresses(allAddresses);
    } catch (err: any) {
      console.error('❌ Failed to load addresses:', err);
      setError('Impossibile caricare gli indirizzi. Controlla la connessione.');
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  loadAddresses();
}, [employeeId]);

  // Render individual address card
  const renderAddress = ({ item }: { item: any }) => {
    const fullName = (item.firstname && item.lastname)
      ? `${item.firstname} ${item.lastname}`
      : item.company || 'N/A';

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.clientName} numberOfLines={1}>
            {fullName.trim() || 'Cliente'}
          </Text>
          <Text style={styles.ordinal}>
            {item.numero_ordinale ? `#${item.numero_ordinale}` : null}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Alias:</Text>
          <Text style={[styles.value, { fontWeight: 'bold' }]}>{item.alias || '—'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Codice CMNR:</Text>
          <Text style={styles.value}>{item.codice_cmnr || '—'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Indirizzo:</Text>
          <Text style={styles.value} numberOfLines={2}>
            {item.address1 || '—'}
            {item.address2 ? `, ${item.address2}` : ''}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Città:</Text>
          <Text style={styles.value}>{item.city || '—'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>CAP:</Text>
          <Text style={styles.value}>{item.postcode || '—'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>DNI:</Text>
          <Text style={styles.value}>{item.dni || '—'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Phone:</Text>
          <Text style={styles.value}>{item.phone || '—'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Aggiornato:</Text>
          <Text style={styles.value}>
            {item.date_upd ? new Date(item.date_upd).toLocaleDateString('it-IT') : '—'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme} />
          <Text style={styles.loadingText}>Caricamento indirizzi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* <Text style={styles.heading}>Indirizzi Clienti ({addresses.length})</Text> */}

      {addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nessun indirizzo trovato.</Text>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAddress}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: dark,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: textColor,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: textColor,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: textColor,
    opacity: 0.7,
  },
  card: {
    backgroundColor: darkBg,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: darkerBg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: textColor,
    flex: 1,
  },
  ordinal: {
    fontSize: 14,
    fontWeight: '500',
    color: theme,
    // backgroundColor: '#e6f0ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: darkerBg,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0070A7', // matches your `label` blue from ClientsScreen
    minWidth: 90,
  },
  value: {
    fontSize: 14,
    color: textColor,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
});

export default IndirizziScreen;