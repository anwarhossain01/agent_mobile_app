import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { dark, textColor } from '../../colors';

export default function ProductDetailPage() {

    return (
        <View>
            <Text style={{ fontSize: 18, color: textColor, fontWeight: '800' }} >Product Detail Page</Text>
            <Text> In development </Text>
        </View>
    )
}

const style  = StyleSheet.create({
    container: {
       flex: 1,
        padding: 16,
        backgroundColor: dark,
    },
});