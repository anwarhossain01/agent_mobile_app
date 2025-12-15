import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet, ScrollView,
  TouchableOpacity, Modal, TextInput, Alert,
  Button
} from 'react-native';
import { dark, darkBg, darkerBg, textColor } from '../../colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectCartItems, selectClientId, selectTotalPrice,
  selectDeliveryAddressId, selectInvoiceAddressId,
  setDeliveryAddressId, setInvoiceAddressId,
  selectCarrierId,
  setCarrierId,
  selectCartId,
  setshippingPrice,
  selectShippingPriceIncTax,
  selectShippingPriceExcTax,

} from '../store/slices/cartSlice';
import { clientAddressGet, getCustomer, createNewAddress, getCountryList, getCouriers, getDeliveries, getCachedDeliveries, getCachedCouriers, getCachedClientAddresses, getCachedClientsForAgent } from '../api/prestashop';
import SubmissionModal from '../components/modals/SubmissionModal';
import { RootState } from '../store';
import NetInfo from '@react-native-community/netinfo';

const CartScreen = () => {
  const cart = useSelector(selectCartItems);
  const grandTotal = useSelector(selectTotalPrice);
  const client_id = useSelector(selectClientId);
  const delivery_address_id = useSelector(selectDeliveryAddressId);
  const invoice_address_id = useSelector(selectInvoiceAddressId);
  const auth = useSelector((s: RootState) => s.auth);
  const employeeId = auth.employeeId;

  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showDeliveryDropdown, setShowDeliveryDropdown] = useState(false);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [showNewAddressModal, setShowNewAddressModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [creatingAddress, setCreatingAddress] = useState(false);

  const [selectedAlias, setSelectedAlias] = useState('');
  const aliasOptions = ['Delivery', 'Invoice'];

  const [freeDelivery, setFreeDelivery] = useState(false);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const hasFetched = useRef(false);
  const [courier, setCourier] = useState<any>(null);

  const [newAddress, setNewAddress] = useState({
    alias: '',
    company: '',
    address1: '',
    postcode: '',
    city: '',
    id_country: '',
    phone_mobile: ''
  });

  const dispatch = useDispatch();

  useEffect(() => {
    if (countrySearch.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchCountries(countrySearch);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setCountries([]);
    }
  }, [countrySearch]);

  const searchCountries = async (searchText: string) => {
    const res = await getCountryList(searchText);
    if (res.success && res.data?.countries) {
      setCountries(res.data.countries);
    }
  };

  useEffect(() => {
    async function getClientAddresses() {
      if (!client_id) return;
      let state = await NetInfo.fetch();
      let res = null;
      if (state.isConnected) {
        res = await clientAddressGet(client_id);
      }
      else { res = await getCachedClientAddresses(client_id); }
      //  console.log("Client addresses", res.data);

      if (res.success && res.data?.addresses) {
        //  console.log(res.data.addresses);

        setAddresses(res.data.addresses);
      }
    }
    getClientAddresses();
  }, [client_id]);

  useEffect(() => {
    const fetchClientById = async () => {
      if (!client_id) return;
      setLoading(true);
      const res = await getCachedClientsForAgent(employeeId, client_id);
      setLoading(false);

      if (res.success && res.data?.customers?.length > 0) {
        const client = res.data.customers[0];
        setSelectedCustomer(client);
        setNewAddress(prev => ({
          ...prev,
          company: client.company || '',
          alias: ``
        }));
      }
    };

    fetchClientById();
  }, [client_id, addresses.length]);

  const allAccisaAdder = () =>{
    let adder = 0;
    for (let i = 0; i < cart.length; i++) {
      adder += cart[i].accisa * cart[i].quantity;
    }
    return adder
  }

  const handleSelectDeliveryAddress = (address: any) => {
    dispatch(setDeliveryAddressId(address.id.toString()));
    setShowDeliveryDropdown(false);
  };

  const handleSelectInvoiceAddress = (address: any) => {
    dispatch(setInvoiceAddressId(address.id.toString()));
    setShowInvoiceDropdown(false);
  };

  const handleNewAddress = async () => {
    let state = await NetInfo.fetch();
    let isConnected = state.isConnected;
    if (!isConnected) {
      Alert.alert('Errore', 'verifica la connessione di rete');
      return;
    }
    setShowNewAddressModal(true);
  };

  const handleSubmit = () => {
    if (!client_id || !delivery_address_id || !invoice_address_id) {
      Alert.alert('Errore', 'Please select a client, delivery address, and invoice address');
      return;
    }

    if (cart.length === 0) {
      Alert.alert('Errore', 'Il carrello è vuoto');
      return;
    }
    setShowSubmissionModal(true);
  }

  // Calculate total with shipping
  const calculateTotalWithShipping = () => {
    if (freeDelivery) return calculateTax(grandTotal);
    const TAX_RATE = 0.22;
    const paidDelivery = deliveries.find((d: any) => parseFloat(d.price) > 0);
    let shippingPrice = paidDelivery ? parseFloat(paidDelivery.price) : 0;
    shippingPrice += (shippingPrice * TAX_RATE);
    return calculateTax(grandTotal) + shippingPrice;
  };

  const calculateTax = (price: number) => {
    const TAX_RATE = 0.22;
    return (price + (price * TAX_RATE));
  }

  const handleCreateAddress = async () => {
    if (!client_id) {
      Alert.alert('Errore', 'Nessun cliente selezionato');
      return;
    }

    if (!newAddress.alias || !newAddress.address1 || !newAddress.city || !newAddress.postcode || !newAddress.id_country) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }

    setCreatingAddress(true);
    const res = await createNewAddress(
      client_id,
      newAddress.alias,
      selectedCustomer?.firstname || '',
      selectedCustomer?.lastname || '',
      newAddress.company,
      newAddress.address1,
      newAddress.postcode,
      newAddress.city,
      parseInt(newAddress.id_country),
      newAddress.phone_mobile,
      Date.now()
    );

    setCreatingAddress(false);
    // console.log('createNewAddress res', res.data);


    if (res.success) {
      //Alert.alert('Successo', 'Indirizzo creato con successo');
      setShowNewAddressModal(false);
      const addressesRes = await getCachedClientAddresses(client_id);
      if (addressesRes.success && addressesRes.data?.addresses) {
        setAddresses(addressesRes.data.addresses);
      }

      Alert.alert('Successo !', 'Indirizzo creato con successo');
      // setNewAddress({
      //   alias: `Indirizzo ${addresses.length + 2}`,
      //   company: selectedCustomer?.company || '',
      //   address1: '',
      //   postcode: '',
      //   city: '',
      //   id_country: '',
      //   phone_mobile: ''
      // });
      setCountrySearch('');
    } else {
      Alert.alert('Errore', res.error || 'Errore nella creazione dell\'indirizzo');
    }
  };

  const getSelectedAddressText = (addressId: string | null) => {
    if (!addressId) return 'Seleziona indirizzo';
    const address = addresses.find(addr => addr.id.toString() === addressId);
    if (!address) return 'Seleziona indirizzo';
    return `${address.company || ''} ${address.address1}, ${address.city}`.trim();
  };

  const getCountryName = (countryId: string) => {
    const country = countries.find(c => c.id.toString() === countryId);
    return country ? country.name : 'Seleziona paese';
  };

  const renderCartItem = ({ item }: { item: any }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.itemTotal}>€{(calculateTax(item.total) + parseFloat(item.accisa * item.quantity)).toFixed(2)}</Text>
      </View>
      <View style={styles.itemDetails}>
        <Text style={styles.detailText}>Quantità: {item.quantity}</Text>
        <Text style={styles.detailText}>Prezzo (Tasse incluse): €{calculateTax(item.price).toFixed(2)}</Text>
      </View>
      {item.accisa != 0 &&
        <View style={[styles.itemDetails, { flexDirection: 'row-reverse' }]}>
          <Text style={styles.detailText}>Accisa: €{parseFloat(item.accisa).toFixed(2)}</Text>
        </View>
      }
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

  const ShippingInformation = ({
    freeDelivery,
    setFreeDelivery,
    deliveries,
    setDeliveries,
    setCourier,
    dispatch
  }: any) => {
    // const dispatch = useDispatch();
    //  const [deliveries, setDeliveries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    //  const [freeDelivery, setFreeDelivery] = useState(false);
    const [showCourierDropdown, setShowCourierDropdown] = useState(false);


    useEffect(() => {
      if (hasFetched.current) return;

      const fetchCourierData = async () => {
        hasFetched.current = true;
        setLoading(true);

        try {
          // Get carrier details (default to 27)
          let state = await NetInfo.fetch();
          let res = null;
          let courierRes = null;
          if (state.isConnected) {
            courierRes = await getCouriers(27);
          } else {
            courierRes = await getCachedCouriers(27);
          }
          if (courierRes.success && courierRes.data?.carriers?.length > 0) {
            const carrierData = courierRes.data.carriers[0];
            //      console.log('courierData', carrierData);

            setCourier(carrierData);
            dispatch(setCarrierId(carrierData.id));

            let deliveryRes = null;
            if (state.isConnected) {
              deliveryRes = await getDeliveries(carrierData.id);
            } else {
              deliveryRes = await getCachedDeliveries(carrierData.id);
            }
            //   console.log('deliveryRes', deliveryRes);

            if (deliveryRes.success && deliveryRes.data?.deliveries) {
              setDeliveries(deliveryRes.data.deliveries);
            }
          }
        } catch (error) {
          console.log('Error fetching courier data:', error);
        } finally {
          setLoading(false);
        }
      };

      const checkDeliveryApplicable = async () => {
        if (grandTotal > 200) {
          setFreeDelivery(true);
        }
      }

      fetchCourierData();
      checkDeliveryApplicable();
    }, []);

    const getDeliveryPrice = () => {
      if (freeDelivery) {
        dispatch(setshippingPrice({ shipping_price_inc_tax: 0, shipping_price_exc_tax: 0 }));
        return 0;
      };
      const paidDelivery = deliveries.find((d: any) => parseFloat(d.price) > 0);
      if (paidDelivery) {
        // Get the base price as a number
        const basePrice = parseFloat(paidDelivery.price);

        // Calculate the price with a 22% increase (i.e., multiply by 1.22)
        const priceWithIncrease = basePrice * 1.22;
        dispatch(setshippingPrice({ shipping_price_inc_tax: priceWithIncrease, shipping_price_exc_tax: basePrice }));
        // Return the new price
        return priceWithIncrease;
      } else {
        return 0;
      }
    };

    return (
      <View style={styles.shippingSection}>
        <Text style={styles.shippingTitle}>Spedizione</Text>

        {/* Courier Dropdown - Only one option */}
        <View style={styles.shippingDropdown}>
          <Text style={styles.shippingLabel}>Opzioni di spedizione:</Text>
          <TouchableOpacity
            style={styles.shippingSelector}
            onPress={() => setShowCourierDropdown(!showCourierDropdown)}
            disabled={loading}
          >
            <Text style={styles.shippingSelectorText}>
              {loading ? 'Caricamento...' : `${courier?.name} - ${courier?.delay}`}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          {showCourierDropdown && !loading && courier && (
            <View style={styles.dropdown}>
              <TouchableOpacity
                style={styles.shippingOption}
                onPress={() => setShowCourierDropdown(false)}
              >
                <Text style={styles.shippingOptionText}>{courier.name}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Free Delivery Checkbox */}
        <View style={styles.freeDeliveryContainer}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setFreeDelivery(!freeDelivery)}
          >
            <View style={[
              styles.checkbox,
              freeDelivery && styles.checkboxSelected
            ]}>
              {freeDelivery && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.freeDeliveryText}>Spedizione gratuita</Text>
          </TouchableOpacity>
        </View>

        {/* Shipping Price Display */}
        <View style={styles.shippingPrice}>
          <Text style={styles.shippingPriceLabel}>Prezzo di spedizione (IVA incl.):</Text>
          <Text style={styles.shippingPriceValue}>€{getDeliveryPrice().toFixed(2)}</Text>
        </View>

        {loading && (
          <ActivityIndicator color="#0af" style={styles.loadingIndicator} />
        )}
      </View>
    );
  };



  return (
    <SafeAreaView style={styles.container}>
      <ScrollView >
        <Text style={styles.heading}>Carrello della spesa</Text>

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

        <View style={styles.addressSection}>
          <View style={styles.addressHeader}>
            <Text style={styles.addressSectionTitle}>Indirizzi</Text>
            <TouchableOpacity style={styles.newAddressButton} onPress={handleNewAddress}>
              <Text style={styles.newAddressButtonText}>+ Nuovo Indirizzo</Text>
            </TouchableOpacity>
          </View>

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

        <Modal
          visible={showNewAddressModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowNewAddressModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Nuovo Indirizzo</Text>

              <ScrollView style={styles.modalForm} nestedScrollEnabled={true}>
                <View style={styles.readonlyField}>
                  <Text style={styles.readonlyLabel}>Cliente</Text>
                  <Text style={styles.readonlyValue}>
                    {selectedCustomer?.firstname} {selectedCustomer?.lastname}
                  </Text>
                </View>

                <View style={styles.aliasContainer}>
                  <Text style={styles.aliasLabel}>Tipo Indirizzo:</Text>
                  <View style={styles.aliasOptions}>
                    {aliasOptions.map((alias) => (
                      <TouchableOpacity
                        key={alias}
                        style={[
                          styles.aliasOption,
                          selectedAlias === alias && styles.aliasOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedAlias(alias);
                          setNewAddress(prev => ({ ...prev, alias }));
                        }}
                      >
                        <View style={[
                          styles.checkbox,
                          selectedAlias === alias && styles.checkboxSelected
                        ]}>
                          {selectedAlias === alias && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={[
                          styles.aliasText,
                          selectedAlias === alias && styles.aliasTextSelected
                        ]}>
                          {alias}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Azienda"
                  placeholderTextColor="#888"
                  value={newAddress.company}
                  onChangeText={(text) => setNewAddress(prev => ({ ...prev, company: text }))}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Indirizzo *"
                  placeholderTextColor="#888"
                  value={newAddress.address1}
                  onChangeText={(text) => setNewAddress(prev => ({ ...prev, address1: text }))}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Postcode *"
                  placeholderTextColor="#888"
                  value={newAddress.postcode}
                  onChangeText={(text) => setNewAddress(prev => ({ ...prev, postcode: text }))}
                  keyboardType="numeric"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Città *"
                  placeholderTextColor="#888"
                  value={newAddress.city}
                  onChangeText={(text) => setNewAddress(prev => ({ ...prev, city: text }))}
                />

                <View style={styles.countryInputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Cerca paese *"
                    placeholderTextColor="#888"
                    value={countrySearch}
                    onChangeText={(text) => {
                      setCountrySearch(text);
                      setShowCountryDropdown(true);
                    }}
                    onFocus={() => setShowCountryDropdown(true)}
                  />
                </View>

                {showCountryDropdown && countries.length > 0 && (
                  <View style={styles.countryDropdown}>
                    <FlatList
                      data={countries}
                      keyExtractor={(item) => item.id.toString()}
                      style={styles.countryDropdownList}
                      horizontal={true}
                      showsHorizontalScrollIndicator={true}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={() => {
                            setNewAddress(prev => ({ ...prev, id_country: item.id.toString() }));
                            setCountrySearch(item.name);
                            setShowCountryDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}

                <TextInput
                  style={styles.input}
                  placeholder="Telefono"
                  placeholderTextColor="#888"
                  value={newAddress.phone_mobile}
                  onChangeText={(text) => setNewAddress(prev => ({ ...prev, phone_mobile: text }))}
                  keyboardType="phone-pad"
                />
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowNewAddressModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.createButton]}
                  onPress={handleCreateAddress}
                  disabled={creatingAddress}
                >
                  {creatingAddress ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.createButtonText}>Crea Indirizzo</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
            <View style={styles.grandTotal}>
              <Text style={styles.grandTotalText}>Totale Ordine (inc tasse):</Text>
              <Text style={styles.grandTotalAmount}>€{(calculateTotalWithShipping() + allAccisaAdder()) .toFixed(2)}</Text>
            </View>
          </>
        )}

        <ShippingInformation
          freeDelivery={freeDelivery}
          setFreeDelivery={setFreeDelivery}
          deliveries={deliveries}
          setDeliveries={setDeliveries}
          dispatch={dispatch}
          setCourier={setCourier}
        />
        <SubmissionModal
          showSubmissionModal={showSubmissionModal}
          setShowSubmissionModal={setShowSubmissionModal}
        />
        <Button title="Submit" color={'#0af'} onPress={handleSubmit} />

        <View style={{ marginTop: 20 }} />

      </ScrollView>
    </SafeAreaView>
  );
};

const oldStyles = {
  container: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: dark,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: textColor,
    textAlign: 'center',
  },
  customerBox: {
    backgroundColor: darkBg,
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  customerName: {
    color: 'rgba(0, 110, 165, 1)',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  customerField: {
    color: textColor,
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
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addressSectionTitle: {
    color: textColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  newAddressButton: {
    backgroundColor: '#0af',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  newAddressButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addressDropdown: {
    marginBottom: 16,
  },
  addressLabel: {
    color: textColor,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  addressSelector: {
    backgroundColor: darkBg,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressSelectorText: {
    color: textColor,
    fontSize: 14,
    flex: 1,
  },
  dropdownArrow: {
    color: 'rgba(0, 110, 165, 1)',
    fontSize: 12,
  },
  dropdown: {
    backgroundColor: darkBg,
    borderRadius: 8,
    marginTop: 4,
    // maxHeight: 200,
  },
  dropdownList: {
    padding: 8,
  },
  addressItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#bebebeff',
  },
  addressCompany: {
    color: 'rgba(0, 110, 165, 1)',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  addressText: {
    color: textColor,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: dark,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    color: textColor,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalForm: {
    maxHeight: 400,
  },
  readonlyField: {
    marginBottom: 16,
  },
  readonlyLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  readonlyValue: {
    color: textColor,
    fontSize: 16,
  },
  input: {
    backgroundColor: darkBg,
    color: textColor,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#c0c0c0ff',
  },
  countryInputContainer: {
    marginBottom: 12,
  },
  inputText: {
    color: textColor,
  },
  placeholderText: {
    color: '#888',
  },
  countryDropdown: {
    backgroundColor: '#333',
    borderRadius: 8,
    marginTop: -12,
    marginBottom: 12,
    maxHeight: 60,
  },
  countryDropdownList: {
    padding: 8,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    backgroundColor: '#444',
    borderRadius: 6,
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#0af',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
    color: 'rgba(0, 110, 165, 1)',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cartItem: {
    backgroundColor: darkBg,
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
    color: textColor,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  itemTotal: {
    color: 'rgba(0, 110, 165, 1)',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailText: {
    color: textColor,
    fontSize: 14,
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: darkBg,
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  grandTotalText: {
    color: textColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  grandTotalAmount: {
    color: 'rgba(0, 110, 165, 1)',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyCart: {
    color: textColor,
    textAlign: 'center',
    fontSize: 16,
    marginTop: 50,
  },
  aliasContainer: {
    marginBottom: 16,
  },
  aliasLabel: {
    color: textColor,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  aliasOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aliasOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  aliasOptionSelected: {
    backgroundColor: '#0af',
    borderColor: '#0af',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#888',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  checkmark: {
    color: '#0af',
    fontSize: 12,
    fontWeight: 'bold',
  },
  aliasText: {
    color: 'black',
    fontSize: 14,
  },
  aliasTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
}
const styles = StyleSheet.create({
  ...oldStyles as any,
  shippingDropdown: {
    marginBottom: 8,
  },
  shippingLabel: {
    color: textColor,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  shippingSelector: {
    backgroundColor: darkerBg,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shippingSelectorText: {
    color: textColor,
    fontSize: 14,
    flex: 1,
  },
  shippingOption: {
    padding: 12,
    borderBottomWidth: 1,
    backgroundColor: darkerBg,
    borderBottomColor: '#c7c7c7ff',

  },
  shippingOptionText: {
    color: textColor,
    fontSize: 14,
  },
  shippingSection: {
    backgroundColor: darkBg,
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    marginTop: 20,
  },
  shippingTitle: {
    color: 'rgba(0, 110, 165, 1)',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loadingIndicator: {
    marginVertical: 8,
  },
  freeDeliveryContainer: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  freeDeliveryText: {
    color: textColor,
    fontSize: 14,
    marginLeft: 12,
  },
  shippingPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: darkerBg,
    padding: 12,
    borderRadius: 8,
  },
  shippingPriceLabel: {
    color: textColor,
    fontSize: 14,
  },
  shippingPriceValue: {
    color: 'rgba(0, 110, 165, 1)',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
export default CartScreen;