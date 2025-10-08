
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, FlatList, Image } from 'react-native';
import { dark, darkBg } from '../../colors';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { API_KEY, getProducts } from '../api/prestashop';
import { setProducts } from '../store/slices/productsSlice';

const ProductListScreen = () => {
    const dispatch = useDispatch();
    const products = useSelector((s: RootState) => s.products.items);
    const [error, setError] = useState(false);

    useEffect(() => {
        const load = async () => {
            setError(false);
            try {
                const data = await getProducts();
                dispatch(setProducts(data));
            } catch (e) {
                console.log('products load err', e);
                setError(true);
            }
        };
        load();
    }, [dispatch]);

    const fetchProductImage = (productId: number, imageId: number): string => {
        let imageurl = `https://b2b.fumostore.com/api/images/products/${productId}/${imageId}?ws_key=${API_KEY}`;
      //  console.log('imageurl', imageurl);
        return imageurl;
    };

    const ProductInformation = (props: { label: string; value: string; prefix?: string }) => {
        return (
            <View style={{ display: 'flex', flexDirection: 'row' }}>
                <Text style={{ color: '#fff', fontSize: 15 }}>{props.label}: </Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>{props.value} {props.prefix}</Text>
            </View>
        );
    }

  const ProductsList = (item: any) => {
    if (item)
        item = item.item;

    return (
        <View style={styles.productsBox}>
            <View>
                <Image style={styles.productImage} source={{ uri: fetchProductImage(item.id, item.id_default_image) }} />
            </View>
            <View style={{ marginLeft: 16, flex: 1 }}>
                <Text 
                    style={{ 
                        color: '#fff', 
                        fontSize: 17, 
                        fontWeight: 'bold', 
                        marginBottom: 10,
                        flexWrap: 'wrap',
                        flexShrink: 1
                    }}
                    numberOfLines={3} // Optional: limit to 3 lines
                    ellipsizeMode="tail" // Optional: show ... if truncated
                >
                    {item.name || 'No name'}
                </Text>
                <ProductInformation label="Price" value={item.price} prefix="€" />
                <ProductInformation label="Category IDs" value={item.associations?.categories?.map((c: any) => c.id).join(', ')} prefix="" />
            </View>
        </View>
    );
}

    return (
        <View style={styles.container}>
            <Text style={{ fontSize: 18, marginBottom: 12, color: '#fff', padding: 2 }}>Prodotti</Text>
                <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>
                 {error ? <Text style={{ color: 'red', marginBottom: 8 }}>Server error, Please try again later</Text> : null}
              </View>
            <FlatList
                data={products}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                    <ProductsList item={item} />
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
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#fff'
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