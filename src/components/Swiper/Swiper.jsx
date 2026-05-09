import React, { useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import Swiper from 'react-native-swiper';

const ImageSwiper = ({ images = [], autoplay = true, timeout = 5, style }) => {
  const [loadingStates, setLoadingStates] = useState(
    images.reduce((acc, _, index) => ({ ...acc, [index]: true }), {}),
  );

  if (!images.length) return null;

  // const handleImageLoad = index => {
  //   setLoadingStates(prev => ({ ...prev, [index]: false }));
  // };

  // const handleImageError = index => {
  //   setLoadingStates(prev => ({ ...prev, [index]: false }));
  // };

  return (
    <View style={[styles.swiperContainer, style]}>
      <Swiper
        key={`${images.length}-${Math.random()}`}
        showsPagination
        autoplay={autoplay}
        autoplayTimeout={timeout}
        loop
        dotColor="#ccc"
        activeDotColor="#007aff"
        paginationStyle={styles.paginationStyle}
        containerStyle={styles.swiperInner}
        removeClippedSubviews={false} // ✅ prevents flicker on Android
      >
        {images.map((uri, index) => (
          <View key={`slide-${index}`} style={styles.slide}>
            {/* {loadingStates[index] && (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#007aff" />
              </View>
            )} */}
            <Image
              source={{ uri }}
              style={styles.projectImage}
              resizeMode="cover"
              // onLoad={() => handleImageLoad(index)}
              // onError={() => handleImageError(index)}
            />
          </View>
        ))}
      </Swiper>
    </View>
  );
};

const styles = StyleSheet.create({
  swiperContainer: {
    width: '100%',
    height: 370,
    borderRadius: 8,
    overflow: 'hidden',
  },
  swiperInner: {
    borderRadius: 8,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectImage: {
    width: '100%',
    height: '100%',
  },
  paginationStyle: {
    bottom: 10,
  },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    zIndex: 1,
  },
});

export default ImageSwiper;
