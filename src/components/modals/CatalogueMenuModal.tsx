import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import Modal from 'react-native-modal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { dark } from '../../../colors';

interface CatalogueMenuModalProps {
    visible: boolean;
    onClose: () => void;
    navigation: any;
}

export default function CatalogueMenuModal({
    visible,
    onClose,
    navigation,
}: CatalogueMenuModalProps) {
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

                {/* Categorie option */}
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                    }}
                    onPress={() => {
                        onClose();
                        navigation.replace('Main', {
                            screen: 'CatalogTab',
                            params: {
                                screen: 'Catalog'
                            }
                        });
                    }}
                >
                    <Ionicons
                        name="grid-outline"
                        size={22}
                        color="#007AFF"
                        style={{ marginRight: 12 }}
                    />
                    <Text style={{ fontSize: 18, color: '#fff' }}>Categorie</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: '#333', marginVertical: 4 }} />

                {/* Prodotti option */}
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 14,
                    }}
                    onPress={() => {
                        onClose();
                        //Alert.alert('in development');
                        navigation.replace('Main', {
                            screen: 'CatalogTab',
                            params: {
                                screen: 'ProductList'
                            }
                        });
                    }}
                >
                    <Ionicons
                        name="cube-outline"
                        size={22}
                        color="#007AFF"
                        style={{ marginRight: 12 }}
                    />
                    <Text style={{ fontSize: 18, color: '#fff' }}>Prodotti</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={{ height: 1, backgroundColor: '#333', marginVertical: 4 }} />

                {/* Buoni sconto option */}
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
                        name="pricetag-outline"
                        size={22}
                        color="#007AFF"
                        style={{ marginRight: 12 }}
                    />
                    <Text style={{ fontSize: 18, color: '#fff' }}>Buoni sconto</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}
