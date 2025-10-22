import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Alert, Button, Platform, TouchableNativeFeedback, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { checkProductStock, getCachedClientsForAgent, getCachedCustomers, getCachedProducts, getCachedProductStock, getCartDetails, getCartListForClient, getClientsForAgent, getCustomer, getOrdersFiltered, getProductSearchResult } from '../api/prestashop';
import { useDispatch, useSelector } from 'react-redux';
import { setClientId, addItem, updateQuantity, removeItem, selectCartItems, selectTotalPrice, selectClientId, setCartId } from '../store/slices/cartSlice';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../store';
import NetInfo from '@react-native-community/netinfo';

const NewOrderScreen = ({ route }) => {
    const [query, setQuery] = useState('');
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    const [productQuery, setProductQuery] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [productLoading, setProductLoading] = useState(false);
    const [quantityInputs, setQuantityInputs] = useState<{ [key: string]: string }>({});
    const [isNextBtnEnabled, setNextBtnEnabled] = useState(false);

    // for carts
    const [carts, setCarts] = useState<any[]>([]);
    const [showCartDropdown, setShowCartDropdown] = useState(false);
    const [selectedCart, setSelectedCart] = useState<any | null>(null);
    const [loadingCarts, setLoadingCarts] = useState(false);

    // Redux state
    const dispatch = useDispatch();
    const cart = useSelector(selectCartItems);
    const grandTotal = useSelector(selectTotalPrice);
    const reduxClientId = useSelector(selectClientId);
    const auth = useSelector((s: RootState) => s.auth);
    const employeeId = auth.employeeId;
    const client_id = route.params?.client_id || null;
    const navigation = useNavigation();

    useEffect(() => {
        function setLocalQuantityState() {
            cart.forEach(element => {
                quantityInputs[element.product_id] = String(element.quantity);
            });
        }
        setLocalQuantityState();
    }, []);

    useEffect(() => {
        function enableBtnNextCheck() {
            if (reduxClientId && cart.length > 0) {
                // Check if all quantity inputs are valid numbers > 0
                const allQuantitiesValid = cart.every(item => {
                    const inputValue = quantityInputs[item.product_id];
                    // Must have a local input and it must be valid
                    if (inputValue !== undefined) {
                        const parsed = parseInt(inputValue);
                        return !isNaN(parsed) && parsed > 0;
                    }
                    return false;
                });

                setNextBtnEnabled(allQuantitiesValid);
            } else {
                setNextBtnEnabled(false);
            }
        }

        enableBtnNextCheck();
    }, [cart, reduxClientId, quantityInputs]);

    useEffect(() => {
        const fetchClientById = async () => {
            if (!client_id && !reduxClientId) return;
            setLoading(true);
            const res = await getCachedClientsForAgent(employeeId, client_id || reduxClientId);
            // console.log("get customer res ", res.data);
            setLoading(false);

            if (res.success && res.data?.customers?.length > 0) {
                const client = res.data.customers[0];
                setSelectedCustomer(client);
                setQuery(`${client.firstname} ${client.lastname}`);
                dispatch(setClientId(client.id_customer.toString()));
            }
        };

        fetchClientById();
    }, [client_id, dispatch, reduxClientId]);

    // useEffect(() => {
    //     if (!client_id && !reduxClientId) return;
    //     fetchClientCarts();
    // }, [client_id, reduxClientId]);

    // const fetchClientCarts = async () => {
    //     if (!client_id && !reduxClientId) return;

    //     setLoadingCarts(true);
    //     try {
    //         // Get all carts for client
    //         const cartsRes = await getCartListForClient(client_id || reduxClientId);
    //         if (!cartsRes.success || !cartsRes.data?.carts) {
    //             setCarts([]);
    //             return;
    //         }

    //         // Filter out carts that have orders AND are empty
    //         const availableCarts = [];
    //         for (const cart of cartsRes.data.carts) {
    //             const ordersRes = await getOrdersFiltered(null, cart.id);

    //             // Check if cart has no order AND is empty (no cart_rows)
    //             if (ordersRes.success && (!ordersRes.data.orders || ordersRes.data.orders.length === 0)) {
    //                 const cartDetailsRes = await getCartDetails(cart.id);
    //                 if (cartDetailsRes.success) {
    //                     const cartData = cartDetailsRes.data.cart;
    //                     // Check if cart is empty (no associations or no cart_rows)
    //                     if (!cartData.associations || !cartData.associations.cart_rows || cartData.associations.cart_rows.length === 0) {
    //                         availableCarts.push(cartData);
    //                     }
    //                 }
    //             }
    //         }

    //         setCarts(availableCarts);
    //     } catch (error) {
    //         console.log('Error fetching carts:', error);
    //         setCarts([]);
    //     } finally {
    //         setLoadingCarts(false);
    //     }
    // };

    // const handleSelectCart = (cart: any) => {
    //     setSelectedCart(cart);
    //     setShowCartDropdown(false);

    //     dispatch(setCartId({ id_cart: cart.id }));
    // };

    // ===== Debounce =====
    const debounce = (func: (...args: any[]) => void, delay = 600) => {
        let timer: ReturnType<typeof setTimeout>;
        return (...args: any[]) => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => func(...args), delay);
        };
    };

    // ===== Customer Fetch =====
    const fetchCustomers = async (searchText: string) => {
        if (!searchText || searchText.trim().length < 2) {
            setFilteredData([]);
            return;
        }
        setLoading(true);
        const res = await getCachedClientsForAgent(employeeId, searchText);

        setLoading(false);
        if (res.success && res.data?.customers) setFilteredData(res.data.customers);
        else setFilteredData([]);
    };

    const debouncedFetchCustomer = useCallback(debounce(fetchCustomers, 600), []);

    const handleSearch = (text: string) => {
        setQuery(text);
        setSelectedCustomer(null);
        debouncedFetchCustomer(text);
    };

    const handleSelectCustomer = (item: any) => {
        setSelectedCustomer(item);
        dispatch(setClientId((item.id_customer).toString()));
        setQuery(`${item.firstname} ${item.lastname}`);
        setFilteredData([]);
    };

    // ===== Product Search =====
    const fetchProducts = async (searchText: string) => {
        if (!searchText || searchText.trim().length < 2) {
            setProductResults([]);
            return;
        }

        setProductLoading(true);
        let res =null
         let state = await NetInfo.fetch();
         if(state.isConnected){
            res = await getProductSearchResult(searchText);
         }else{
            res = await getCachedProducts(searchText);
         }
        // console.log("prods", res.data);

        setProductLoading(false);

        //   const prod_stock =  await checkProductStock(res.data.products[0].id);
        //   console.log('Product stock result', prod_stock.data);

        if (res.success && res.data?.products) setProductResults(res.data.products);
        else setProductResults([]);
    };

    const debouncedFetchProduct = useCallback(debounce(fetchProducts, 600), []);

    const handleProductSearch = (text: string) => {
        setProductQuery(text);
        debouncedFetchProduct(text);
    };

    const handleSelectProduct = async (item: any) => {
        setProductQuery('');
        setProductResults([]);

        // Check product stock
        let stockRes = null;
        let state = await NetInfo.fetch();
        if (state.isConnected) {
            stockRes = await checkProductStock(item.id);
        } else {
            stockRes = await getCachedProductStock(item.id);
        }

        const stockData = stockRes.data?.stock_availables?.[0];

        if (stockData?.out_of_stock == 1) {
            Alert.alert('Prodotto non disponibile in magazzino');
            return;
        }

        if (stockData?.depends_on_stock === "1") {
            const availableStock = parseInt(stockData.quantity) || 0;

            if (availableStock <= 0) {
                Alert.alert('Prodotto non disponibile in magazzino');
                return;
            }

            const price = parseFloat(item.price || 0);
            const quantity = parseInt(item.minimal_quantity) || 0;

            dispatch(addItem({
                product_id: item.id,
                name: item.name,
                quantity: quantity,
                max_quantity: availableStock,
                price: price,
            }));
            setQuantityInputs(prev => {
                const newInputs = { ...prev };
                newInputs[item.id] = String(quantity);
                return newInputs;
            });
        }
        else {
            // console.log("Went into else block");
            // console.log("Stock data", stockData.quantity);
            // console.log(stockData.quantity != 0);

            // Product doesn't depend on stock, add with minimal quantity
            let quantity = parseInt(item.minimal_quantity) || 1;
            dispatch(addItem({
                product_id: item.id,
                name: item.name,
                quantity: quantity,
                max_quantity: stockData.quantity != 0 ? stockData.quantity : null,
                price: parseFloat(item.price || 0),
            }));
            setQuantityInputs(prev => {
                const newInputs = { ...prev };
                newInputs[item.id] = String(quantity);
                return newInputs;
            });
        }
    };

    const handleQuantityChange = (product_id: string | number, newQty: string, max_quantity: number | null) => {
        // Update local state immediately for responsive input
        setQuantityInputs(prev => ({
            ...prev,
            [product_id]: newQty,
        }));

        // Only dispatch to Redux when we have a valid final quantity
        if (newQty === '') return;

        const parsedQty = parseInt(newQty);
        if (isNaN(parsedQty)) return;

        let quantity = parsedQty;
        if (quantity < 1) quantity = 1;

        if (max_quantity !== null && quantity > max_quantity) {
            quantity = max_quantity;
        }
        setQuantityInputs(prev => {
            const newInputs = { ...prev };
            newInputs[product_id] = String(quantity);
            return newInputs;
        });
        dispatch(updateQuantity({ product_id, quantity }));
    };

    const handleRemoveProduct = (product_id: string | number) => {
        dispatch(removeItem(product_id));
        setQuantityInputs(prev => {
            const newInputs = { ...prev };
            delete newInputs[product_id];
            return newInputs;
        });
    };

    const handleNextBtn = () => {
        //  console.log('Next btn pressed');
        (navigation as any).navigate('Main', {
            screen: 'OrdersTab',
            params: {
                screen: 'CartScreen',
            }
        });
    };

    return (
        <KeyboardAvoidingView style={styles.container}>
            <Text style={styles.title}>Nuovo Ordine</Text>

            {/* CUSTOMER SEARCH */}
            <TextInput
                style={styles.input}
                placeholder="Cerca cliente..."
                placeholderTextColor="#c7c7c7ff"
                value={query}
                onChangeText={handleSearch}
            />

            {loading && <ActivityIndicator color="#0af" style={{ marginVertical: 8 }} />}

            {!loading && filteredData.length > 0 && (
                <View style={styles.dropdown}>
                    <FlatList
                        data={filteredData}
                        keyExtractor={(item) => (item.id_customer).toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => handleSelectCustomer(item)} style={styles.dropdownItem}>
                                <Text style={styles.dropdownText}>
                                    {item.firstname} {item.lastname} — {item.company}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {/* Cart Selection Section */}
            {/* <View style={styles.cartSection}>
                <View style={styles.cartHeaderSelection}>
                    <Text style={styles.cartSectionTitle}>Seleziona Carrello</Text>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={fetchClientCarts}
                        disabled={loadingCarts}
                    >
                        {loadingCarts ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.refreshButtonText}>🔄</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.cartDropdown}>
                    <TouchableOpacity
                        style={styles.cartSelector}
                        onPress={() => setShowCartDropdown(!showCartDropdown)}
                        disabled={loadingCarts}
                    >
                        <Text style={styles.cartSelectorText}>
                            {selectedCart
                                ? `Carrello #${selectedCart.id} (${selectedCart.associations?.cart_rows?.length || 0} prodotti)`
                                : loadingCarts
                                    ? 'Caricamento carrelli...'
                                    : carts.length === 0
                                        ? 'Nessun carrello disponibile'
                                        : 'Seleziona un carrello'
                            }
                        </Text>
                        <Text style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>
                    <Text style={styles.cartHintText}>
                        (Opzionale) - Se non selezioni un carrello, ne verrà creato uno automaticamente per te
                    </Text>

                    {showCartDropdown && carts.length > 0 && (
                        <View style={styles.dropdown}>
                            {carts.map((item) => (
                                <TouchableOpacity
                                    key={item.id.toString()}
                                    style={styles.cartItemSelection}
                                    onPress={() => handleSelectCart(item)}
                                >
                                    <Text style={styles.cartId}>Carrello #{item.id}</Text>
                                    <Text style={styles.cartDetails}>
                                        {item.associations?.cart_rows?.length || 0} prodotti •
                                        Aggiornato: {new Date(item.date_upd).toLocaleDateString()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </View> */}

            {/* Customer Info Section */}
            {/* {selectedCustomer && (
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
                    <Text style={styles.customerField}>
                        Created: {selectedCustomer.date_add}
                    </Text>
                </View>
            )} */}

            {/* PRODUCT SEARCH */}
            <Text style={[styles.title, { marginTop: 16 }]}>Aggiungi Prodotto</Text>

            <TextInput
                style={styles.input}
                placeholder="Cerca prodotto..."
                placeholderTextColor="#aaa"
                value={productQuery}
                onChangeText={handleProductSearch}
            />

            {productLoading && <ActivityIndicator color="#0af" style={{ marginVertical: 8 }} />}

            {!productLoading && productResults.length > 0 && (
                <View style={styles.dropdown}>
                    <FlatList
                        data={productResults}
                        keyExtractor={(item) => (item.id).toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => handleSelectProduct(item)} style={styles.dropdownItem}>
                                <Text style={styles.dropdownText}>
                                    {item.name} — €{parseFloat(item.price).toFixed(2)}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}
            <ScrollView style={{ flex: 1 }}>
                {/* CART LIST */}
                {cart.length > 0 && (
                    <View style={styles.cartBox}>
                        {/* Header Row */}
                        <View style={[styles.cartItem, { borderBottomColor: '#555', borderBottomWidth: 2 }]}>
                            <Text style={[styles.cartHeader, { flex: 2 }]}>Prodotto</Text>
                            <Text style={[styles.cartHeader, { width: 50, textAlign: 'center' }]}>Qty</Text>
                            <Text style={[styles.cartHeader, { flex: 1, textAlign: 'center' }]}>Prezzo</Text>
                            <Text style={[styles.cartHeader, { flex: 1, textAlign: 'center' }]}>Totale</Text>
                            <Text style={[styles.cartHeader, { width: 24 }]}></Text>
                        </View>

                        {/* Cart Items */}
                        {cart.map((item) => (
                            <View key={item.product_id} style={styles.cartItem}>
                                <Text style={styles.cartName}>{item.name}</Text>
                                <TextInput
                                    style={styles.qtyInput}
                                    keyboardType="numeric"
                                    value={quantityInputs[item.product_id] !== undefined ? quantityInputs[item.product_id] : String(item.quantity)}
                                    onChangeText={(val) => handleQuantityChange(item.product_id, val, item.max_quantity)}

                                />
                                <Text style={styles.cartText}>€{item.price.toFixed(2)}</Text>
                                <Text style={styles.cartText}>€{item.total.toFixed(2)}</Text>
                                <TouchableOpacity onPress={() => handleRemoveProduct(item.product_id)}>
                                    <Ionicons name="close-circle" size={22} color="#f44" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {/* Total Row */}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalText}>Totale:</Text>
                            <Text style={styles.totalValue}>€{grandTotal.toFixed(2)}</Text>
                        </View>
                    </View>
                )}

                {Platform.OS === 'android' ? (
                    <TouchableNativeFeedback
                        onPress={handleNextBtn}
                        disabled={!isNextBtnEnabled}
                        background={TouchableNativeFeedback.Ripple('#003c7cff', false)}
                    >
                        <View style={{
                            backgroundColor: isNextBtnEnabled ? '#007AFF' : '#ccc',
                            paddingVertical: 12,
                            paddingHorizontal: 24,
                            borderRadius: 8,
                            alignItems: 'center',
                            marginTop: 55
                        }}>
                            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                                Next ▶
                            </Text>
                        </View>
                    </TouchableNativeFeedback>
                ) : (
                    <TouchableOpacity
                        onPress={handleNextBtn}
                        disabled={!isNextBtnEnabled}
                        style={{
                            backgroundColor: '#007AFF',
                            paddingVertical: 12,
                            paddingHorizontal: 24,
                            borderRadius: 8,
                            alignItems: 'center',
                            marginTop: 55
                        }}
                    >
                        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                            Next ▶
                        </Text>
                    </TouchableOpacity>
                )}

            </ScrollView>
        </KeyboardAvoidingView>
    );
};
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111', padding: 16 },
    title: { fontSize: 16, marginBottom: 8, color: '#fff' },
    input: { backgroundColor: '#222', color: '#fff', padding: 10, borderRadius: 8, marginBottom: 8 },
    dropdown: { backgroundColor: '#333', borderRadius: 8, maxHeight: 200, marginBottom: 8 },
    dropdownItem: { padding: 10, borderBottomColor: '#444', borderBottomWidth: 1 },
    dropdownText: { color: '#fff' },
    customerBox: { backgroundColor: '#222', padding: 12, borderRadius: 10, marginTop: 12 },
    customerName: { color: '#0af', fontSize: 16, fontWeight: 'bold' },
    customerField: { color: '#ccc', fontSize: 14, marginTop: 4 },
    cartBox: { marginTop: 20, backgroundColor: '#222', borderRadius: 8, padding: 10 },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomColor: '#333',
        borderBottomWidth: 1,
        paddingVertical: 8,
    },
    cartName: { flex: 2, color: '#fff', fontSize: 13 },
    qtyInput: {
        backgroundColor: '#333',
        color: '#fff',
        width: 50,
        textAlign: 'center',
        borderRadius: 6,
        marginHorizontal: 8,
        padding: 4,
    },
    cartText: { flex: 1, color: '#ccc', textAlign: 'center', fontSize: 13 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    totalText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    totalValue: { color: '#0af', fontSize: 16, fontWeight: 'bold' },
    cartHeader: {
        color: '#0af',
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    cartSection: {
        marginTop: 20,
        marginBottom: 20,
    },
    cartHeaderSelection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cartSectionTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    refreshButton: {
        backgroundColor: '#333',
        padding: 8,
        borderRadius: 6,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    refreshButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    cartDropdown: {
        marginBottom: 16,
    },
    cartSelector: {
        backgroundColor: '#222',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cartSelectorText: {
        color: '#fff',
        fontSize: 14,
        flex: 1,
    },
    cartItemSelection: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    cartId: {
        color: '#0af',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cartDetails: {
        color: '#ccc',
        fontSize: 12,
    },
    cartHintText: {
        color: '#888',
        fontSize: 12,
        marginTop: 4,
        fontStyle: 'italic',
    },
    dropdownArrow: {
        color: '#0af',
        fontSize: 12,

    },
});

export default NewOrderScreen;
