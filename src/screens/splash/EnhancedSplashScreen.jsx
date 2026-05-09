import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');
import logo from '../../assets/images/logo.png';
import backgroundImage from '../../assets/images/splash_bgImg.jpg';
import colors from '../../../src/theme/colors';

const EnhancedSplashScreen = ({ onLogin, onFinish }) => {
  return (
    <View style={styles.container}>      
      {/* Background Image */}
      <ImageBackground
        source={backgroundImage}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        
        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Main Content */}
          <View style={styles.mainContent}>
            <Image source={logo} style={{ width: 130, height: 40 }} resizeMode="contain" />
            <Text style={styles.headline}>Find the best{'\n'}place for you</Text>
            <Text style={styles.tagline}>Trust. Transparency. Convenience.</Text>
          </View>

          {/* Login Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={onLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
    
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: height * 0.05,
    paddingBottom: height * 0.05,
  },
  mainContent: {
    // flex: 1,
    // justifyContent: 'center',
    backgroundColor: '#FFFFFF80',
    marginHorizontal: 20,
    padding:10,

    borderRadius: 8,
    // width:'90%',
    // marginVertical: 40,
  },
  headline: {
    fontSize: 36,
    // fontWeight: '600',
    fontFamily:'Outfit-SemiBold',
    color: 'white',
    // lineHeight: 40,
  },
  tagline: {
    fontSize: 18,
    color: 'white',
    // fontWeight: '500',
    fontFamily:'Outfit-Medium',
  },
  
  loginButton: {
    backgroundColor:colors.primary,
    // paddingVertical: 16,
    // paddingHorizontal: 60,
    borderRadius: 8,
    height:42,
    width: '100%',
    // textAlign:'center',
    justifyContent:'center',
    alignItems: 'center',
    // shadowColor: '#000',
    // shadowOffset: {
    //   width: 0,
    //   height: 2,
    // },
    // shadowOpacity: 0.25,
    // shadowRadius: 3.84,
    // elevation: 5,
  },
  loginButtonText: {
    color: colors.defaultWhite,
    fontSize: 16,
    // fontWeight: '600',
    fontFamily:'Outfit-Medium',
  },
});

export default EnhancedSplashScreen;