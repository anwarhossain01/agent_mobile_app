import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { dark } from '../../../colors';

interface ClientsMenuModalProps {
    visible: boolean;
    onClose: () => void;
    navigation: any;
}

export default function ClientsMenuModal({
    visible,
    onClose,
    navigation,
}: ClientsMenuModalProps) {
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
                        navigation.navigate('Main', {
                            screen: 'ClientsTab',
                            params: {
                                screen: 'Clients'
                            }
                        });
                    }}
                >
                    <Ionicons
                        name="people-outline"
                        size={22}
                        color="#007AFF"
                        style={{ marginRight: 12 }}
                    />
                    <Text style={{ fontSize: 18, color: '#fff' }}>Clients</Text>
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
                        navigation.navigate('Main', {
                            screen: 'ClientsTab',
                            params: {
                                screen: 'ClientsAddresses'
                            }
                        });
                    }}
                >
                    <Ionicons
                        name="location-outline"
                        size={22}
                        color="#007AFF"
                        style={{ marginRight: 12 }}
                    />
                    <Text style={{ fontSize: 18, color: '#fff' }}>Indirizzi</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}
