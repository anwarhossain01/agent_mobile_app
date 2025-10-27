
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { dark, darkBg, textColor } from '../../colors';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { API_KEY, getProducts } from '../api/prestashop';
import { setProducts } from '../store/slices/productsSlice';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ProductListScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { subcategoryId, subcategoryName } = route.params || {};
  const dispatch = useDispatch();
  const products = useSelector((s: RootState) => s.products.items);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      setError(false);
      try {
        const data = await getProducts(subcategoryId || null);
        dispatch(setProducts(data));
      } catch (e) {
        console.log('products load err', e);
        setError(true);
      }
    };
    load();
  }, [dispatch, subcategoryId]);

  const fetchProductImage = (productId: number, imageId: number): string =>
    `https://b2b.fumostore.com/api/images/products/${productId}/${imageId}?ws_key=${API_KEY}`;

  const ProductInformation = (props: { label: string; value: string; prefix?: string }) => (
    <View style={{ flexDirection: 'row' }}>
      <Text style={{ color: textColor, fontSize: 15 }}>{props.label}: </Text>
      <Text style={{ color: textColor, fontSize: 15, fontWeight: 'bold' }}>
        {props.value} {props.prefix}
      </Text>
    </View>
  );

  const handleProductClick = () => {
    navigation.navigate('ProductDetails');
  };

  const ProductsList = (item: any) => {
    if (item) item = item.item;
    return (
      <TouchableOpacity style={styles.productsBox} onPress={handleProductClick}>
        <Image style={styles.productImage} source={{ uri: fetchProductImage(item.id, item.id_default_image) }} />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text
            style={{
              color: textColor,
              fontSize: 16,
              fontWeight: 'bold',
              marginBottom: 10,
              flexWrap: 'wrap',
              flexShrink: 1,
            }}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {item.name || 'No name'}
          </Text>
          <ProductInformation label="Price" value={item.price} prefix="€" />
          <ProductInformation
            label="Category IDs"
            value={item.associations?.categories?.map((c: any) => c.id).join(', ')}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        {subcategoryId && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        )}
        <Text style={{ fontSize: 18, color: textColor, fontWeight: '800' }}>
          {subcategoryName || 'Prodotti'}
        </Text>
      </View>

      {error && <Text style={{ color: 'red', marginBottom: 8 }}>Server error, please try again later</Text>}

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ProductsList item={item} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: dark,
    },

    productsBox: {
        padding: 10,
        marginBottom: 8,
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'row',
        //   borderBottomWidth: 1,
        //  borderBottomColor: '#333',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        backgroundColor: darkBg,
    },
    productImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
    }
});

export default ProductListScreen;