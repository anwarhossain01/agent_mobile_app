
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, FlatList, Image, TouchableOpacity, ToastAndroid, TextInput, Keyboard } from 'react-native';
import { dark, darkBg, darkerTheme, textColor, theme } from '../../colors';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { API_KEY, getProducts } from '../api/prestashop';
import { setProducts } from '../store/slices/productsSlice';
import { useNavigation } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getCategoryOrSubCategoryName, getProductsCached, verifyProductStock } from '../sync/cached';
import { addItem, removeItem, updateQuantity } from '../store/slices/cartSlice';
import NetInfo from '@react-native-community/netinfo';
// --- Move this OUTSIDE ProductListScreen ---
import { memo } from 'react';
import { queryData } from '../database/db';

const fetchProductImage = (productId: number, imageId: number): string =>
  `https://b2b.fumostore.com/api/images/products/${productId}/${imageId}?ws_key=${API_KEY}`;

const ProductInformation = (props: { label: string; value: string; prefix?: string }) => (
  <View style={{ flexDirection: 'row' }}>
    <Text style={{ color: textColor, fontSize: 15 }}>{props.label}</Text>
    <Text style={{ color: textColor, fontSize: 15, fontWeight: 'bold' }}>
      {props.value} {props.prefix}
    </Text>
  </View>
);

const ProductsList = memo(({ item, getQuantityInCart, onProductClick, onAddToCart, added, loadingItems, textColor, darkerTheme }: {
  item: any;
  getQuantityInCart: (productId: number) => number;
  onProductClick: (item: any) => void;
  onAddToCart: (item: any) => void;
  added: Record<number, boolean>;
  loadingItems: Record<number, boolean>;
  textColor: string;
  darkerTheme: string;
}) => {
  const [categoryName, setCategoryName] = useState<string>('...');
  const [ItemQuantity, setItemQuantity] = useState(0);
  const quantity = getQuantityInCart(item.id);
  const dispatch = useDispatch();

  useEffect(() => {
    let isMounted = true;

    const loadCategoryName = async () => {
      if (item?.id_category_default == null) {
        isMounted && setCategoryName('');
        return;
      } else if (item?.id_category_default == 2) {
        isMounted && setCategoryName('Home');
        return;
      }

      try {
        const result = await getCategoryOrSubCategoryName(item.id_category_default);
        if (isMounted) {
          setCategoryName(result.length > 0 ? result[0].name || 'Unnamed' : '');
        }
      } catch (error) {
        console.error('Category load error:', error);
        if (isMounted) setCategoryName('Error');
      }
    };

    const loadStock = async () => {
      try {
        const product_id = item.id_product;

        const rows = await queryData(
          'product_stock',
          'id_product = ?',
          [product_id]
        );

        if (rows.length === 0) {
          setItemQuantity(0);
          return;
        }

        // since UNIQUE(id_product), there will be only one row
        const quantity = Number(rows[0].quantity) || 0;
        setItemQuantity(quantity);

      } catch (error) {
        console.error('❌ Stock load error:', error);
        setItemQuantity(0);
      }
    };
    loadStock();
    loadCategoryName();

    return () => { isMounted = false; };
  }, [item.id_category_default]); // Only re-run if category ID changes

  return (
    <View style={styles.productsBox}>
      <Image
        style={styles.productImage}
        source={{ uri: fetchProductImage(item.id, item.id_default_image) }}
      />
      <View style={{ flex: 1, marginLeft: 16 }}>
        <TouchableOpacity onPress={() => onProductClick(item)}>
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

        <ProductInformation label="Prezzo: " value={parseFloat(item.price).toFixed(2)} prefix="€" />
        <ProductInformation
          label="Disponibilità: "
          value={String(ItemQuantity)}
        />

        <ProductInformation label="" value={categoryName} />
      </View>


      {quantity === 0 ? (
        // ADD button (first time)
        <TouchableOpacity
          onPress={() => onAddToCart(item)}
          style={[
            styles.addToCartButton,
            { backgroundColor: added[item.id] ? 'green' : darkerTheme },
          ]}
          disabled={loadingItems[item.id]}
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
      ) : (
        // +/- quantity controller
        <View style={styles.qtyContainer}>
          <TouchableOpacity
            onPress={() => {
              if (quantity === 1) {
                dispatch(removeItem(item.id));
              } else {
                dispatch(updateQuantity({
                  product_id: item.id,
                  quantity: quantity - 1,
                }));
              }
            }}
            style={styles.qtyButton}
          >
            <Text style={styles.qtyText}>−</Text>
          </TouchableOpacity>

          <Text style={styles.qtyValue}>{quantity}</Text>

          <TouchableOpacity
            onPress={() => {
              dispatch(updateQuantity({
                product_id: item.id,
                quantity: quantity + 1,
              }));
            }}
            style={styles.qtyButton}
          >
            <Text style={styles.qtyText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const ProductListScreen = ({ route, navigation }: { route: any; navigation: any }) => {
  const { subcategoryId, subcategoryName } = route.params || {};
  const dispatch = useDispatch();
  const products = useSelector((s: RootState) => s.products.items);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState<{ [key: number]: boolean }>({});
  const [loadingItems, setLoadingItems] = useState<{ [key: number]: boolean }>({});
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(products);
  const cartItems = useSelector((s: RootState) => s.cart.items);

  // console.log('subs ', subcategoryId, subcategoryName);

  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  useEffect(() => {
    const load = async () => {
      setError(false);
      try {
        let netInfo = await NetInfo.fetch();
        let data = [];
        let isOnline = netInfo.isConnected && netInfo.isInternetReachable !== false;
        // if (!isOnline) {
        data = await getProductsCached(subcategoryId || null);
        // } else {
        //   data = await getProducts(subcategoryId || null);
        //  }
        //   console.log('product data', data);

        dispatch(setProducts(data));
      } catch (e) {
        console.log('products load err', e);
        setError(true);
      }
    };
    load();
  }, [dispatch, subcategoryId]);

  const getQuantityInCart = (productId: number) => {
    const item = cartItems.find(i => i.product_id === productId);
    return item ? item.quantity : 0;
  };

  const handleSearchSubmit = async () => {
    const text = searchText.trim().toLowerCase();

    if (!text) {
      setFilteredProducts(products);
      return;
    }
    //console.log("Current products, ", products);

    // const result = products.filter((p) =>
    //   p.name?.toLowerCase().includes(text)
    // );
    let results = await getProductsCached(null, text);
    //console.log("search results. ", results);

    setFilteredProducts(results);
    Keyboard.dismiss();
  };

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

  const handleProductClick = (item: any) => {
    navigation.navigate('ProductDetails', { product: item });
  };

  return (
    <View style={styles.container}>

      {/* Custom Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>

        {/* Back button if subcategoryId exists */}
        {subcategoryId && !searchMode && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        )}

        {/* ---------- SEARCH ACTIVE MODE ---------- */}
        {searchMode ? (
          <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
            <TextInput
              autoFocus
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#ccc',
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 6,
                color: textColor,
              }}
              value={searchText}
              onChangeText={setSearchText}
              placeholder=" Cerca prodotto..."
              placeholderTextColor="#999"
              returnKeyType="search"
              onSubmitEditing={handleSearchSubmit}
            />

            {/* SEARCH ICON */}
            <TouchableOpacity onPress={handleSearchSubmit}
              style={{ marginLeft: 10 }}
            >
              <Ionicons name="search" size={24} color="#000" />
            </TouchableOpacity>

            {/* CLOSE SEARCH */}
            <TouchableOpacity
              onPress={() => {
                setSearchMode(false);
                setSearchText('');
                setFilteredProducts(products); // reset
              }}
              style={{ marginLeft: 10 }}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        ) : (
          /* ---------- NORMAL MODE ---------- */
          <>
            <Text style={{ fontSize: 18, color: textColor, fontWeight: '800', flex: 1 }}>
              {subcategoryName || 'Prodotti'}
            </Text>

            {/* SEARCH ICON */}
            <TouchableOpacity onPress={() => setSearchMode(true)}>
              <Ionicons name="search" size={24} color="#000" />
            </TouchableOpacity>
          </>
        )}
      </View>


      {error && <Text style={{ color: 'red', marginBottom: 8 }}>Server error, please try again later</Text>}
      {filteredProducts && filteredProducts.length === 0 && (
        <Text style={{ color: textColor, marginBottom: 8 }}>Nessun prodotto trovato</Text>
      )}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProductsList
            item={item}
            getQuantityInCart={getQuantityInCart}
            onProductClick={handleProductClick}
            onAddToCart={handleAddToCart}
            added={added}
            loadingItems={loadingItems}
            textColor={textColor}
            darkerTheme={darkerTheme}
          />
        )}
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
  },
  qtyContainer: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkerTheme,
    borderRadius: 20,
    paddingHorizontal: 6,
    height: 36,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme,
  },

  qtyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  qtyValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 6,
  },


});

export default ProductListScreen;