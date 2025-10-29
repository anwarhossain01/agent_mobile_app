
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, FlatList, Image, TouchableOpacity, ToastAndroid } from 'react-native';
import { dark, darkBg, darkerTheme, textColor, theme } from '../../colors';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { API_KEY, getProducts } from '../api/prestashop';
import { setProducts } from '../store/slices/productsSlice';
import { useNavigation } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { verifyProductStock } from '../sync/cached';
import { addItem } from '../store/slices/cartSlice';

const ProductListScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { subcategoryId, subcategoryName } = route.params || {};
  const dispatch = useDispatch();
  const products = useSelector((s: RootState) => s.products.items);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState<{ [key: number]: boolean }>({});
  const [loadingItems, setLoadingItems] = useState<{ [key: number]: boolean }>({});

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

  const handleAddToCart = async (item: any) => {
  // show loading spinner for this product
  setLoadingItems(prev => ({ ...prev, [item.id]: true }));

  try {
    const result = await verifyProductStock(item);

    if (!result.success) {
      ToastAndroid.show(result.reason, ToastAndroid.SHORT);
      return;
    }

    dispatch(addItem(result.data));
    setAdded(prev => ({ ...prev, [item.id]: true }));

    // 🕒 reset the checkmark after 2 seconds
    setTimeout(() => {
      setAdded(prev => ({ ...prev, [item.id]: false }));
    }, 2000);

  } catch (err) {
    console.log('cart add error', err);
    ToastAndroid.show('Errore aggiunta prodotto', ToastAndroid.SHORT);
  } finally {
    // hide loading spinner
    setLoadingItems(prev => ({ ...prev, [item.id]: false }));
  }
};


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

  const handleProductClick = (item: any) => {
    console.log('item', item);

    navigation.navigate('ProductDetails', { product: item });
  };

  const ProductsList = (item: any) => {
    if (item) item = item.item;
    return (
      <View style={styles.productsBox}>
        {/* Product Image */}
        <Image
          style={styles.productImage}
          source={{ uri: fetchProductImage(item.id, item.id_default_image) }}
        />

        {/* Product Info */}
        <View style={{ flex: 1, marginLeft: 16 }}>

          <TouchableOpacity onPress={() => handleProductClick(item)}>
            <Text
              style={{
                color: textColor,
                fontSize: 16,
                fontWeight: 'bold',
                marginBottom: 10,
                textDecorationLine: 'underline',
              }}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.name || 'No name'}
            </Text>
          </TouchableOpacity>

          <ProductInformation label="Price" value={item.price} prefix="€" />
          <ProductInformation
            label="Category IDs"
            value={item.associations?.categories?.map((c: any) => c.id).join(', ')}
          />
        </View>

        {/* Floating Add-to-Cart button (bottom-right corner of card) */}
        <TouchableOpacity
          onPress={() => handleAddToCart(item)}
          style={[
            styles.addToCartButton,
            { backgroundColor: added[item.id] ? 'green' : darkerTheme },
          ]}
          disabled={loadingItems[item.id]} // disable while loading
        >
          {loadingItems[item.id] ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FontAwesome
              name={added[item.id] ? 'check' : 'cart-plus'}
              size={22}
              color="#fff"
            />
          )}
        </TouchableOpacity>
      </View>
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
    position: 'relative',
    padding: 10,
    marginBottom: 16,
    borderRadius: 10,
    flexDirection: 'row',
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
  },
  addToCartButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    borderRadius: 25,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  }

});

export default ProductListScreen;