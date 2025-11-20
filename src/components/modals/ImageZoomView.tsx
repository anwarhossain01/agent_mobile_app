import {
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
  View,
} from 'react-native'
import React from 'react'
import ImageZoom from 'react-native-image-pan-zoom'
import Ionicons from 'react-native-vector-icons/Ionicons'

const ScreenSize = {
  SW: Dimensions.get('window').width,
  SH: Dimensions.get('window').height,
}

type Props = {
  modalVisible: boolean
  setModalVisible: (visible: boolean) => void
  uri: string
}

const ImageZoomView = ({ modalVisible, setModalVisible, uri }: Props) => {
  return (
    <Modal
      animationType={'slide'}
      transparent={false}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modelContainer}>
        <TouchableOpacity
          style={styles.crossImageSize}
          onPress={() => setModalVisible(false)}
        >
          <Ionicons
            name='close-circle'
            color='white'
            size={ScreenSize.SW * 0.08}
          />
        </TouchableOpacity>
        <ImageZoom
          cropWidth={ScreenSize.SW}
          cropHeight={ScreenSize.SH}
          imageWidth={ScreenSize.SW}
          imageHeight={ScreenSize.SH}
        >
          <Image style={styles.imageSize} source={{ uri }} />
        </ImageZoom>
      </View>
    </Modal>
  )
}

export default ImageZoomView

const styles = StyleSheet.create({
  modelContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  crossImageSize: {
    position: 'absolute',
    top: ScreenSize.SH * 0.02,
    right: ScreenSize.SW * 0.02,
    zIndex: 1,
    backgroundColor: '#00000080',
    height: ScreenSize.SW * 0.1,
    width: ScreenSize.SW * 0.1,
    borderRadius: ScreenSize.SW * 0.05,
    padding: ScreenSize.SW * 0.01,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageSize: {
    width: ScreenSize.SW,
    height: ScreenSize.SH,
    resizeMode: 'contain',
  },
})
