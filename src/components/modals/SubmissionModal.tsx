import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    selectCartItems,
    selectClientId,
    selectDeliveryAddressId,
    selectInvoiceAddressId,
    selectCartId,
    selectCarrierId,
    selectTotalPrice,
    setCartId,
    selectShippingPriceExcTax,
    selectShippingPriceIncTax,
    clearCart,
    selectNote
} from '../../store/slices/cartSlice';
import { createCart, createCustomerThreadWithMessage, createCustomMessage, createOrder } from '../../api/prestashop';
import { useDispatch, useSelector } from 'react-redux';
import { dark, darkBg, textColor } from '../../../colors';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../store';
import { createCartCache, createOrderCache } from '../../sync/cached';
import NetInfo from '@react-native-community/netinfo';

const SubmissionModal = ({ showSubmissionModal, setShowSubmissionModal }: any) => {
    const TAX_RATE_MULTIPLIER = 1.22;
    const [status, setStatus] = useState<string>("Sto preparando l'ordine…");
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cart = useSelector(selectCartItems);
    const client_id = useSelector(selectClientId);
    const delivery_address_id = useSelector(selectDeliveryAddressId);
    const invoice_address_id = useSelector(selectInvoiceAddressId);
    const cart_id = useSelector(selectCartId);
    const carrier_id = useSelector(selectCarrierId);
    const totalProducts = useSelector(selectTotalPrice);
    const shippingPriceExc = useSelector(selectShippingPriceExcTax);
    const shippingPriceInc = useSelector(selectShippingPriceIncTax);
    const note = useSelector(selectNote);
    const dispatch = useDispatch();
    const auth = useSelector((s: RootState) => s.auth);
    const employeeId = auth.employeeId;

    const navigation = useNavigation();

    useEffect(() => {
        if (showSubmissionModal) {
            //  handleCreateOrder();
          //  handleCacheOrder();
          handleOrderCreationByNetwork();
            //console.log("ORDER TOTALS.....", calculateOrderTotals());
        }
    }, [showSubmissionModal]);

    // Calculate tax amounts based on your formula
    const calculateOrderTotals = () => {
        const TAX_RATE = 0.22; // 22% tax

        // Product totals
        const total_products = totalProducts; // Without tax
        const product_tax = total_products * TAX_RATE;
        const total_products_wt = (total_products + product_tax) + allAccisaAdder(); // With tax

        // Shipping (assuming shipping is tax-free or tax included)
        const total_shipping_tax_excl = shippingPriceExc;
        const total_shipping_tax_incl = shippingPriceInc;

        // Final totals
        const total_paid = total_products_wt + total_shipping_tax_incl;
        const total_paid_real = total_paid;

        return {
            total_products,
            total_products_wt,
            total_paid,
            total_paid_real,
            total_shipping_tax_excl,
            total_shipping_tax_incl,
            product_tax
        };
    };

    const allAccisaAdder = () => {
        let adder = 0;
        for (let i = 0; i < cart.length; i++) {
            const accisaWithTax = cart[i].accisa * TAX_RATE_MULTIPLIER;
            const flooredAccisa = Math.floor(accisaWithTax * 100) / 100; // floor to nearest cent
            adder += flooredAccisa * cart[i].quantity;
        }
        return adder;
    };

    async function handleCacheOrder() {

        if (!client_id || !delivery_address_id || !invoice_address_id || !carrier_id) {
            setError('Informazioni obbligatorie mancanti: cliente, indirizzi o vettore');
            console.log(client_id, delivery_address_id, invoice_address_id, carrier_id);
            return;
        }

        if (cart.length === 0) {
            setError('carrello è vuoto');
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            let currentCartId = cart_id;

            // 1 Create local cart if it doesn't exist
            if (!currentCartId) {
                setStatus('Creazione del carrello sul dispositivo…');

                const products = cart.map(item => ({
                    id_product: item.product_id,
                    quantity: item.quantity,
                    id_product_attribute: item.product_attribute_id || undefined
                }));

                const cartRes = await createCartCache(
                    1, // id_currency
                    3, // id_lang
                    parseInt(client_id),
                    parseInt(delivery_address_id),
                    parseInt(invoice_address_id),
                    products
                );

                if (cartRes.success && cartRes.data?.cart?.id) {
                    console.log("cartRes after insertion", cartRes);

                    currentCartId = cartRes.data.cart.id.toString();
                    dispatch(setCartId(currentCartId));
                    setStatus('Carrello salvato localmente!');
                } else {
                    throw new Error(cartRes.error || 'Errore durante il salvataggio del carrello.');
                }
            } else {
                setStatus('Uso del carrello già presente…');
            }

            // 2 Calculate order totals
            setStatus("Calcolo dell'importo totale dell'ordine…");
            const totals = calculateOrderTotals();

            // 3 Cache the order
            setStatus("Salvataggio dell'ordine in locale…");

            const orderRes = await createOrderCache({
                id_employee: employeeId,
                id_address_delivery: parseInt(delivery_address_id),
                id_address_invoice: parseInt(invoice_address_id),
                id_cart: parseInt(currentCartId),
                id_currency: 1,
                id_lang: 3,
                id_customer: parseInt(client_id),
                id_carrier: parseInt(carrier_id),
                note: note,
                module: 'ps_wirepayment',
                payment: 'Manual payment',
                total_paid: totals.total_paid,
                total_paid_real: totals.total_paid_real,
                total_products: totals.total_products,
                total_products_wt: totals.total_products_wt,
                total_shipping: totals.total_shipping_tax_incl,
                total_shipping_tax_incl: shippingPriceInc,
                total_shipping_tax_excl: shippingPriceExc,
                conversion_rate: 1.0
            });

            if (orderRes.success) {
                setStatus('Ordine salvato localmente!');

                // Show success, clear cart, navigate
                setTimeout(() => {
                    setShowSubmissionModal(false);
                    setIsCreating(false);
                    const clientBeforeReset = client_id;
                    dispatch(clearCart());
                    setStatus('Preparazione del prossimo acquisto…');

                    (navigation as any).replace('Main', {
                        screen: 'OrdersTab',
                        params: {
                            screen: 'Orders',
                            params: { employee_id: clientBeforeReset, cached_order_alert: true }
                        }
                    });
                }, 1500);
            } else {
                throw new Error(orderRes.error || "Errore durante il salvataggio dell'ordine.");
            }
        } catch (err: any) {
            console.log('Order caching error:', err);
            setError(err.message || 'Errore imprevisto. Riprova più tardi.');
            setIsCreating(false);
        }
    }


    const handleCreateOrder = async () => {

        // Validate all required data
        if (!client_id || !delivery_address_id || !invoice_address_id || !carrier_id) {
            setError('Informazioni obbligatorie mancanti: cliente, indirizzi o vettore');
            return;
        }

        if (cart.length === 0) {
            setError('carrello è vuoto');
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            let currentCartId = cart_id;

            // Step 1: Create cart only if it doesn't exist
            if (!currentCartId) {
                setStatus('Sto creando il carrello…');

                const products = cart.map(item => ({
                    id_product: item.product_id,
                    quantity: item.quantity
                }));

                const cartRes = await createCart(
                    1, // id_currency
                    3, // id_lang
                    parseInt(client_id),
                    parseInt(delivery_address_id),
                    parseInt(invoice_address_id),
                    products
                );

                if (cartRes.success && cartRes.data?.cart?.id) {
                    currentCartId = cartRes.data.cart.id.toString();
                    dispatch(setCartId(currentCartId));
                    setStatus('Il carrello è stato creato con successo!');
                } else {
                    throw new Error(cartRes.error || 'Errore durante la creazione del carrello.');
                }
            } else {
                setStatus('Sto usando il carrello già presente…');
            }

            // Step 2: Calculate order totals
            setStatus("Calcolo dell'importo totale dell'ordine…");
            const totals = calculateOrderTotals();

            // Step 3: Create order
            setStatus("Sto creando l'ordine…");

            const orderRes = await createOrder({
                id_employee: employeeId,
                id_address_delivery: parseInt(delivery_address_id),
                id_address_invoice: parseInt(invoice_address_id),
                id_cart: parseInt(currentCartId),
                id_currency: 1,
                id_lang: 3,
                id_customer: parseInt(client_id),
                id_carrier: parseInt(carrier_id),
                module: 'ps_wirepayment',
                payment: 'Manual payment',
                total_paid: totals.total_paid,
                total_paid_real: totals.total_paid_real,
                total_products: totals.total_products,
                total_products_wt: totals.total_products_wt,
                total_shipping: totals.total_shipping_tax_incl,
                total_shipping_tax_incl: shippingPriceInc,
                total_shipping_tax_excl: shippingPriceExc,
                conversion_rate: 1.0,
                note: note
            });

            if (orderRes.success) {
                setStatus(`Ordine inviato correttamente!`);
                if(note){
                    const orderMsgRes = await createCustomerThreadWithMessage({
                        id_order: orderRes.data.order.id,
                        id_customer: parseInt(client_id),
                        note
                    });

                     //console.log(orderMsgRes);
                    const orderMsgResServer = await createCustomMessage({
                        id_order: orderRes.data.order.id,
                        id_cart: parseInt(currentCartId),
                        id_customer: parseInt(client_id),
                        id_employee: employeeId,
                        message: note,
                        is_private: 0
                    });

                 //   console.log("************* ", orderMsgResServer);
                    
                }
                // Wait a moment to show success then close
                setTimeout(() => {
                    setShowSubmissionModal(false);
                    setIsCreating(false);
                    let client_id_before_cleaning = client_id;
                    dispatch(clearCart());
                    // Reset for next order
                    setStatus("Sto preparando l'ordine…");

                    (navigation as any).replace('Main', {
                        screen: 'OrdersTab',
                        params: {
                            screen: 'Orders',
                            params: {
                                employee_id: client_id_before_cleaning,
                                cached_order_alert: false
                            }
                        }
                    });
                }, 2000);
            } else {
                throw new Error(orderRes.error || "Errore durante la creazione dell'ordine.");
            }
        } catch (err: any) {
            console.log('Order creation error:', err);
            setError(err.message || 'Errore imprevisto. Riprova più tardi.');
            setIsCreating(false);
        }
    };

    const handleOrderCreationByNetwork = async () => {
        let state = await NetInfo.fetch();
        if (state.isConnected) {
            await handleCreateOrder();
        }
        else {
            await handleCacheOrder();
        }
    }

    const handleClose = () => {
        if (!isCreating) {
            setShowSubmissionModal(false);
            setError(null);
            setStatus("Sto preparando l'ordine…");
        }
    };

    return (
        <Modal
            visible={showSubmissionModal}
            animationType="fade"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.submissionModalOverlay}>
                <View style={styles.submissionModalContent}>
                    <Text style={styles.submissionModalTitle}>Creating Order</Text>

                    <View style={styles.submissionStatusContainer}>
                        {isCreating && (
                            <ActivityIndicator
                                size="large"
                                color="#0af"
                                style={styles.submissionActivityIndicator}
                            />
                        )}

                        <Text style={styles.submissionStatusText}>{status}</Text>

                        {error && (
                            <View style={styles.submissionErrorContainer}>
                                <Text style={styles.submissionErrorText}>{error}</Text>
                            </View>
                        )}
                    </View>

                    {!isCreating && (
                        <View style={styles.submissionModalButtons}>
                            <TouchableOpacity
                                style={[styles.submissionModalButton, styles.submissionCloseButton]}
                                onPress={handleClose}
                            >
                                <Text style={styles.submissionCloseButtonText}>
                                    {error ? 'Close' : 'Done'}
                                </Text>
                            </TouchableOpacity>

                            {error && (
                                <TouchableOpacity
                                    style={[styles.submissionModalButton, styles.submissionRetryButton]}
                                    onPress={handleOrderCreationByNetwork}
                                >
                                    <Text style={styles.submissionRetryButtonText}>Try Again</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

// Your existing styles remain the same...
const styles = StyleSheet.create({
    submissionModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    submissionModalContent: {
        backgroundColor: dark,
        borderRadius: 12,
        padding: 24,
        width: '85%',
        maxWidth: 400,
        alignItems: 'center',
    },
    submissionModalTitle: {
        color: textColor,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    submissionStatusContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    submissionActivityIndicator: {
        marginBottom: 16,
    },
    submissionStatusText: {
        color: textColor,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
    },
    submissionErrorContainer: {
        backgroundColor: darkBg,
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#f44',
    },
    submissionErrorText: {
        color: '#f44',
        fontSize: 14,
        textAlign: 'center',
    },
    submissionModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
    },
    submissionModalButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    submissionCloseButton: {
        backgroundColor: '#666',
    },
    submissionCloseButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    submissionRetryButton: {
        backgroundColor: '#0af',
    },
    submissionRetryButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default SubmissionModal;