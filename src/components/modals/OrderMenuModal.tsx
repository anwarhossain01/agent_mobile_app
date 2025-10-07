import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import Modal from 'react-native-modal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { dark } from '../../../colors';

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

                {/* Clients option */}
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
                    <Text style={{ fontSize: 18, color: '#fff' }}>Ordini</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: '#333', marginVertical: 4 }} />

                {/* Indirizzi option */}
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                    }}
                    onPress={() => {
                        onClose();
                        Alert.alert('in development');
                    }}
                >
                    <Ionicons
                        name="cart-outline"
                        size={22}
                        color="#007AFF"
                        style={{ marginRight: 12 }}
                    />
                    <Text style={{ fontSize: 18, color: '#fff' }}>Carrello della spesa</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}
