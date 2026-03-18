import React from 'react';
import { View, Image, StyleSheet , ImageBackground} from 'react-native';

export default function () {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/background.jpeg')}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    //backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
