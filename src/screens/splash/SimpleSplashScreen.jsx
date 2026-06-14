import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Image,
} from 'react-native';
import logo from '../../assets/images/newLogo.png';

const SimpleSplashScreen = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish && onFinish();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <View style={styles.logoContainer}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',  // centers vertically
    alignItems: 'center',      // centers horizontally
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,   
    height: 200, 
  },
});

export default SimpleSplashScreen;
