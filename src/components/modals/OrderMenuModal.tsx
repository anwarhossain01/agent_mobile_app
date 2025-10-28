import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import Modal from 'react-native-modal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { dark, darkBg, textColor } from '../../../colors';

interface OrderMenuModalProps {
    visible: boolean;
    onClose: () => void;
    navigation: any;
}

export default function OrderMenuModal({
    visible,
    onClose,
    navigation,
}: OrderMenuModalProps) {
    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View
                style={{
                    backgroundColor: dark,
                    padding: 20,
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                }}
            >
                {/* Handle bar for style */}
                <View
                    style={{
                        width: 40,
                        height: 5,
                        backgroundColor: '#555',
                        borderRadius: 3,
                        alignSelf: 'center',
                        marginBottom: 15,
                    }}
                />

                {/* Order option */}
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                    }}
                    onPress={() => {
                        onClose();
                        navigation.replace('Main', {
                            screen: 'OrdersTab',
                            params: {
                                screen: 'Orders',
                                params: {
                                    employee_id: null,
                                }
                            }
                        });
                    }}
                >
                    <Ionicons
                        name="list-outline"
                        size={22}
                        color="#007AFF"
                        style={{ marginRight: 12 }}
                    />
                    <Text style={{ fontSize: 18, color: textColor }}>Ordini</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: darkBg, marginVertical: 4 }} />

                {/* <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                    }}
                    onPress={() => {
                        onClose();
                        navigation.replace('Main', {
                            screen: 'OrdersTab',
                            params: {
                                screen: 'NewOrders',
                                params: {
                                    client_id: null,
                                }
                            }
                        });
                    }}
                >
                    <Ionicons
                        name="add-circle-outline"
                        size={22}
                        color="#007AFF"
                        style={{ marginRight: 12 }}
                    />
                    <Text style={{ fontSize: 18, color: textColor }}>Nuovo Ordine</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: darkBg, marginVertical: 4 }} /> */}

                {/* Indirizzi option */}
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                    }}
                    onPress={() => {
                        onClose();
                        (navigation as any).replace('Main', {
                            screen: 'OrdersTab',
                            params: {
                                screen: 'CartScreen',
                            }
                        });
                    }}
                >
                    <Ionicons
                        name="cart-outline"
                        size={22}
                        color="#007AFF"
                        style={{ marginRight: 12 }}
                    />
                    <Text style={{ fontSize: 18, color: textColor }}>Carrello della spesa</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}
