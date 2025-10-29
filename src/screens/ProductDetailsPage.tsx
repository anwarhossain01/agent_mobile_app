import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Dimensions, TouchableOpacity, ToastAndroid, ActivityIndicator } from 'react-native';
import { dark, darkBg, darkerBg, darkerTheme, lightdark, lighterTextColor, textColor, theme } from '../../colors';
import RenderHTML from 'react-native-render-html';
import { useNavigation, useRoute } from '@react-navigation/native';
import { API_KEY } from '../api/prestashop';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { verifyProductStock } from '../sync/cached';
import { addItem } from '../store/slices/cartSlice';

export default function ProductDetailPage() {
  const route = useRoute();
  const navigation = useNavigation();
  const { product }: any = route.params;
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = async () => {
    setLoading(true);
    try {
      const result = await verifyProductStock(product);

      if (!result.success) {
        ToastAndroid.show(result.reason, ToastAndroid.SHORT);
        return;
      }

      dispatch(addItem(result.data));
      setAdded(true);

      // reset after 2 seconds
      setTimeout(() => {
        setAdded(false);
      }, 2000);

    } catch (err) {
      console.log('cart add error', err);
      ToastAndroid.show('Errore aggiunta prodotto', ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  };



  const fetchProductImage = (productId: number, imageId: number): string =>
    `https://b2b.fumostore.com/api/images/products/${productId}/${imageId}?ws_key=${API_KEY}`;

  const imageUrl = fetchProductImage(product.id, product.id_default_image);
  const { width } = Dimensions.get('window');

  return (
    <View style={{ flex: 1, backgroundColor: dark }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.name}
        </Text>
      </View>

      <ScrollView style={styles.container}>
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        {/* Product Title */}
        <Text style={styles.title}>{product.name}</Text>

        {/* Manufacturer */}
        {product.manufacturer_name ? (
          <Text style={styles.manufacturer}>by {product.manufacturer_name}</Text>
        ) : null}

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.price}>€ {parseFloat(product.price).toFixed(2)}</Text>
          {product.minimal_quantity > 1 && (
            <Text style={styles.minQty}>
              Min Qty: {product.minimal_quantity}
            </Text>
          )}
        </View>

        {/* Short description */}
        {product.description_short ? (
          <View style={styles.section}>
            <RenderHTML
              contentWidth={width - 32}
              source={{ html: product.description_short }}
              baseStyle={styles.htmlText}
            />
          </View>
        ) : null}

        {/* Full Description */}
        {product.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <RenderHTML
              contentWidth={width - 32}
              source={{ html: product.description }}
              baseStyle={styles.htmlText}
            />
          </View>
        ) : null}

        {/* Technical Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Info</Text>
          <Text style={styles.infoText}>Reference: {product.reference}</Text>
          <Text style={styles.infoText}>Condition: {product.condition}</Text>
          <Text style={styles.infoText}>
            Available: {product.available_for_order === '1' ? 'Yes' : 'No'}
          </Text>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Floating Add to Cart button */}
      <View style={styles.cartButtonContainer}>
        <TouchableOpacity
          onPress={handleAddToCart}
          style={[
            styles.cartButton,
            { backgroundColor: added ? 'green' : darkerTheme },
          ]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name={added ? 'checkmark' : 'cart'}
              size={22}
              color="#fff"
            />
          )}
          <Text style={styles.cartButtonText}>
            {added ? 'Added' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: darkBg,
    elevation: 2,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: textColor,
  },
  container: {
    flex: 1,
    backgroundColor: dark,
    padding: 16,
  },
  imageContainer: {
    backgroundColor: darkBg,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: textColor,
  },
  manufacturer: {
    fontSize: 14,
    color: lighterTextColor,
    marginTop: 4,
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkerBg,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme,
  },
  minQty: {
    fontSize: 12,
    color: lighterTextColor,
    marginLeft: 10,
  },
  section: {
    marginBottom: 14,
    backgroundColor: lightdark,
    borderRadius: 8,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: textColor,
    marginBottom: 6,
  },
  htmlText: {
    color: lighterTextColor,
    fontSize: 14,
    lineHeight: 20,
  },
  infoText: {
    fontSize: 14,
    color: lighterTextColor,
    marginBottom: 4,
  },
  cartButtonContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    elevation: 3,
  },
  cartButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },

});