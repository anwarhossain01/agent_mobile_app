import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setProducts } from '../store/slices/productsSlice';
import { getActiveCategories, getProducts } from '../api/prestashop';

export default function CatalogScreen() {
  //const dispatch = useDispatch();
  //const products = useSelector((s: RootState) => s.products.items);
  const [categories, setCategories] = useState([]);

  // const getImageUrl = (productId: number, imageId: number) => {
  //   const digits = String(imageId).split('').join('-');
  //   let a = `https://b2b.fumostore.com/img/p/${digits}/${imageId}.jpg`;
  //   console.log('image:', a);
  //   return "https://fumostore.com/1019-home_default/tropic-island-0.jpg";
  // };

  // const getImageUrl1 = (productId: number, imageId: number) => {
  //   let a = `https://fumostore.com/api/product-image/${productId}/${imageId}`;
  //   console.log('image:', a);
  //   return a;
  // };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getActiveCategories();
        setCategories(data.categories);
      } catch (e) {
        console.log('products load err', e);
      }
    };
    load();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 8, color: '#fff' }}>Categorie</Text>
      <FlatList
        data={categories}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#333' }}>
            <Text style={{ color: '#fff' }}>{item.name}</Text>
          </View>
        )}
      />
    </View>
  );
}
