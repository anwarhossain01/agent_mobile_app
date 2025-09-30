import React, { useEffect } from 'react';
import { View, Text, FlatList, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setProducts } from '../store/slices/productsSlice';
import { getProducts } from '../api/prestashop';

export default function CatalogScreen() {
  const dispatch = useDispatch();
  const products = useSelector((s: RootState) => s.products.items);

  const getImageUrl = (productId: number, imageId: number) => {
    const digits = String(imageId).split('').join('-');
    let a = `https://b2b.fumostore.com/img/p/${digits}/${imageId}.jpg`;
    console.log('image:', a);
    return "https://fumostore.com/1019-home_default/tropic-island-0.jpg";
  };

  const getImageUrl1 = (productId: number, imageId: number) => {
    let a = `https://fumostore.com/api/product-image/${productId}/${imageId}`;
    console.log('image:', a);
    return a;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProducts();
        dispatch(setProducts(data));
      } catch (e) {
        console.log('products load err', e);
      }
    };
    load();
  }, [dispatch]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 8, color: '#fff' }}>Catalog</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#333' }}>
            <Image
              source={{ uri: getImageUrl1(item.id, item.id_default_image) }}
              style={{ width: 100, height: 100 }}
              resizeMode="contain"
            />
            <Text style={{ color: '#fff' }}>{item.name || 'No name'}</Text>
            <Text style={{ color: '#fff' }}>Price: {item.price} €</Text>
            <Text style={{ color: '#fff' }}>
              Category IDs: {item.associations?.categories?.map((c: any) => c.id).join(', ')}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
