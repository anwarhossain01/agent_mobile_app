import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getCustomer, getProductSearchResult } from '../api/prestashop';

const NewOrderScreen = ({ route }) => {
    const [query, setQuery] = useState('');
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    const [productQuery, setProductQuery] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [productLoading, setProductLoading] = useState(false);
    const [cart, setCart] = useState<any[]>([]);
    const client_id = route.params?.client_id || null;

    useEffect(() => {
        const fetchClientById = async () => {
            if (!client_id) return;
            setLoading(true);
            const res = await getCustomer(client_id); 
            setLoading(false);

            if (res.success && res.data?.customers?.length > 0) {
                const client = res.data.customers[0];
                setSelectedCustomer(client);
                setQuery(`${client.firstname} ${client.lastname}`);
            }
        };

        fetchClientById();
    }, [client_id]);

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
        const res = await getCustomer(searchText);
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
        const res = await getProductSearchResult(searchText);
        setProductLoading(false);

        if (res.success && res.data?.products) setProductResults(res.data.products);
        else setProductResults([]);
    };

    const debouncedFetchProduct = useCallback(debounce(fetchProducts, 600), []);

    const handleProductSearch = (text: string) => {
        setProductQuery(text);
        debouncedFetchProduct(text);
    };

    const handleSelectProduct = (item: any) => {
        setProductQuery('');
        setProductResults([]);
        setCart((prev) => {
            const exists = prev.find((p) => p.id === item.id);
            if (exists) {
                return prev.map((p) =>
                    p.id === item.id
                        ? { ...p, quantity: p.quantity + 1, total: (p.quantity + 1) * p.price }
                        : p
                );
            } else {
                const price = parseFloat(item.price || 0);
                return [...prev, { ...item, quantity: 1, price, total: price }];
            }
        });
    };

    const handleQuantityChange = (id: any, newQty: string) => {
        const qty = parseInt(newQty) || 1;
        setCart((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, quantity: qty, total: qty * p.price } : p
            )
        );
    };

    const handleRemoveProduct = (id: any) => {
        setCart((prev) => prev.filter((p) => p.id !== id));
    };

    const grandTotal = cart.reduce((sum, p) => sum + p.total, 0);

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
                        keyExtractor={(item) => item.id.toString()}
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

            {selectedCustomer && (
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
            )}

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
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => handleSelectProduct(item)} style={styles.dropdownItem}>
                                <Text style={styles.dropdownText}>
                                    {item.name} — €{item.price}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

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
                    {cart.map((p) => (
                        <View key={p.id} style={styles.cartItem}>
                            <Text style={styles.cartName}>{p.name}</Text>
                            <TextInput
                                style={styles.qtyInput}
                                keyboardType="numeric"
                                value={String(p.quantity)}
                                onChangeText={(val) => handleQuantityChange(p.id, val)}
                            />
                            <Text style={styles.cartText}>€{p.price.toFixed(2)}</Text>
                            <Text style={styles.cartText}>€{p.total.toFixed(2)}</Text>
                            <TouchableOpacity onPress={() => handleRemoveProduct(p.id)}>
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

        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111', padding: 16 },
    title: { fontSize: 18, marginBottom: 8, color: '#fff' },
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
    cartName: { flex: 2, color: '#fff', fontSize: 14 },
    qtyInput: {
        backgroundColor: '#333',
        color: '#fff',
        width: 50,
        textAlign: 'center',
        borderRadius: 6,
        marginHorizontal: 8,
        padding: 4,
    },
    cartText: { flex: 1, color: '#ccc', textAlign: 'center' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    totalText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    totalValue: { color: '#0af', fontSize: 16, fontWeight: 'bold' },
    cartHeader: {
        color: '#0af',
        fontWeight: 'bold',
        fontSize: 13,
        textTransform: 'uppercase',
    },
});

export default NewOrderScreen;
