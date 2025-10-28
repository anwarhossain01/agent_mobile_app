import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { selectCartItemCount, selectCartItemCountMinimal } from '../store/slices/cartSlice';
import { theme } from '../../colors';


const FloatingCartButton = () => {
    const navigation = useNavigation();
    const itemCount = useSelector(selectCartItemCountMinimal);

    if (itemCount === 0) return null; // hide when cart empty

    const handleCartPress = () => {
        (navigation as any).navigate('Main', {
            screen: 'OrdersTab',
            params: {
                screen: 'NewOrders',
            }
        });
    }
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handleCartPress}
        >
            <Ionicons name="cart-outline" size={28} color="#fff" />
            {itemCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{itemCount}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 25,
        right: 25,
        backgroundColor: theme,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    badge: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'red',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default FloatingCartButton;
