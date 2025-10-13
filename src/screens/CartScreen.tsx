import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { dark } from '../../colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { selectCartItems, selectClientId, selectTotalPrice, selectDeliveryAddressId, selectInvoiceAddressId, setDeliveryAddressId, setInvoiceAddressId, } from '../store/slices/cartSlice';
import { clientAddressGet, getCustomer } from '../api/prestashop';

const CartScreen = () => {
  const cart = useSelector(selectCartItems);
  const grandTotal = useSelector(selectTotalPrice);
  const client_id = useSelector(selectClientId);
  const delivery_address_id = useSelector(selectDeliveryAddressId);
  const invoice_address_id = useSelector(selectInvoiceAddressId);
  
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showDeliveryDropdown, setShowDeliveryDropdown] = useState(false);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  
  const dispatch = useDispatch();

  useEffect(() => {
    async function getClientAddresses() {
      if(!client_id) return;
      const res = await clientAddressGet(client_id);
      console.log('clientAddressGet', res.data);
      if (res.success && res.data?.addresses) {
        setAddresses(res.data.addresses);
      }
    }
    getClientAddresses();
  }, [client_id]);

  useEffect(() => {
    const fetchClientById = async () => {
      if (!client_id) return;
      setLoading(true);
      const res = await getCustomer(client_id);
      setLoading(false);

      if (res.success && res.data?.customers?.length > 0) {
        const client = res.data.customers[0];
        setSelectedCustomer(client);
      }
    };

    fetchClientById();
  }, [client_id]);

  const handleSelectDeliveryAddress = (address: any) => {
    dispatch(setDeliveryAddressId(address.id.toString()));
    setShowDeliveryDropdown(false);
  };

  const handleSelectInvoiceAddress = (address: any) => {
    dispatch(setInvoiceAddressId(address.id.toString()));
    setShowInvoiceDropdown(false);
  };

  const getSelectedAddressText = (addressId: string | null) => {
    if (!addressId) return 'Seleziona indirizzo';
    const address = addresses.find(addr => addr.id.toString() === addressId);
    if (!address) return 'Seleziona indirizzo';
    return `${address.company || ''} ${address.address1}, ${address.city}`.trim();
  };

  const renderCartItem = ({ item }: { item: any }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.itemTotal}>€{item.total.toFixed(2)}</Text>
      </View>
      <View style={styles.itemDetails}>
        <Text style={styles.detailText}>Quantità: {item.quantity}</Text>
        <Text style={styles.detailText}>Prezzo: €{item.price.toFixed(2)}</Text>
      </View>
    </View>
  );

  const renderAddressItem = (address: any) => (
    <TouchableOpacity 
      style={styles.addressItem}
      onPress={() => {
        if (showDeliveryDropdown) handleSelectDeliveryAddress(address);
        if (showInvoiceDropdown) handleSelectInvoiceAddress(address);
      }}
    >
      <Text style={styles.addressCompany}>{address.company}</Text>
      <Text style={styles.addressText}>{address.firstname} {address.lastname}</Text>
      <Text style={styles.addressText}>{address.address1}</Text>
      <Text style={styles.addressText}>{address.city}, {address.postcode}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Carrello della spesa</Text>

      {/* Client Information */}
      {loading ? (
        <ActivityIndicator color="#0af" style={{ marginVertical: 16 }} />
      ) : selectedCustomer ? (
        <View style={styles.customerBox}>
          <Text style={styles.customerName}>
            {selectedCustomer.firstname} {selectedCustomer.lastname}
          </Text>
          <Text style={styles.customerField}>{selectedCustomer.company}</Text>
          <Text style={styles.customerField}>{selectedCustomer.email}</Text>
          <Text style={styles.customerField}>
            Codice CMNR: {selectedCustomer.codice_cmnr || 'N/A'}
          </Text>
          <Text style={styles.customerField}>
            Numero Ordinale: {selectedCustomer.numero_ordinale || 'N/A'}
          </Text>
        </View>
      ) : (
        <Text style={styles.noCustomer}>Nessun cliente selezionato</Text>
      )}

      {/* Address Selection */}
      {addresses.length > 0 && (
        <View style={styles.addressSection}>
          {/* Delivery Address */}
          <View style={styles.addressDropdown}>
            <Text style={styles.addressLabel}>Indirizzo di Consegna:</Text>
            <TouchableOpacity 
              style={styles.addressSelector}
              onPress={() => setShowDeliveryDropdown(!showDeliveryDropdown)}
            >
              <Text style={styles.addressSelectorText}>
                {getSelectedAddressText(delivery_address_id)}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            
            {showDeliveryDropdown && (
              <View style={styles.dropdown}>
                <FlatList
                  data={addresses}
                  renderItem={({ item }) => renderAddressItem(item)}
                  keyExtractor={(item) => item.id.toString()}
                  style={styles.dropdownList}
                />
              </View>
            )}
          </View>

          {/* Invoice Address */}
          <View style={styles.addressDropdown}>
            <Text style={styles.addressLabel}>Indirizzo di Fatturazione:</Text>
            <TouchableOpacity 
              style={styles.addressSelector}
              onPress={() => setShowInvoiceDropdown(!showInvoiceDropdown)}
            >
              <Text style={styles.addressSelectorText}>
                {getSelectedAddressText(invoice_address_id)}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            
            {showInvoiceDropdown && (
              <View style={styles.dropdown}>
                <FlatList
                  data={addresses}
                  renderItem={({ item }) => renderAddressItem(item)}
                  keyExtractor={(item) => item.id.toString()}
                  style={styles.dropdownList}
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Cart Items */}
      <ScrollView style={styles.cartList}>
        {cart.length === 0 ? (
          <Text style={styles.emptyCart}>Il carrello è vuoto</Text>
        ) : (
          <>
            <View style={styles.cartHeader}>
              <Text style={styles.cartHeaderText}>Prodotti</Text>
            </View>
            <FlatList
              data={cart}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.product_id.toString()}
              scrollEnabled={false}
            />
            
            {/* Grand Total */}
            <View style={styles.grandTotal}>
              <Text style={styles.grandTotalText}>Totale Ordine:</Text>
              <Text style={styles.grandTotalAmount}>€{grandTotal.toFixed(2)}</Text>
            </View>
          </>
        )}
      </ScrollView>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff',
    textAlign: 'center',
  },
  customerBox: {
    backgroundColor: '#222',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  customerName: {
    color: '#0af',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  customerField: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  noCustomer: {
    color: '#f44',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  addressSection: {
    marginBottom: 20,
  },
  addressDropdown: {
    marginBottom: 16,
  },
  addressLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  addressSelector: {
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressSelectorText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  dropdownArrow: {
    color: '#0af',
    fontSize: 12,
  },
  dropdown: {
    backgroundColor: '#333',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  dropdownList: {
    padding: 8,
  },
  addressItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  addressCompany: {
    color: '#0af',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  addressText: {
    color: '#ccc',
    fontSize: 12,
  },
  cartList: {
    flex: 1,
  },
  cartHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#555',
    paddingBottom: 8,
    marginBottom: 12,
  },
  cartHeaderText: {
    color: '#0af',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cartItem: {
    backgroundColor: '#222',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  itemTotal: {
    color: '#0af',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailText: {
    color: '#ccc',
    fontSize: 14,
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  grandTotalText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  grandTotalAmount: {
    color: '#0af',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyCart: {
    color: '#ccc',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 50,
  },
});

export default CartScreen;