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
import logo from '../../assets/images/newLogo.png';
import backgroundImage from '../../assets/images/splash_bgImg.jpg';
import colors from '../../../src/theme/colors';

const EnhancedSplashScreen = ({ onLogin, onFinish, navigation }) => {
  const goLegal = (type) => navigation.navigate('Auth', { screen: 'LegalPage', params: { type } });

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
            <View style={styles.logoBox}>
              <Image source={logo} style={{ width: 64, height: 64 }} resizeMode="contain" />
            </View>
            <Text style={styles.headline}>Your all-in-one{'\n'}POS solution</Text>
            <Text style={styles.tagline}>Fast. Reliable. Built for your business.</Text>
          </View>

          {/* Login Button + Legal links */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={onLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>

            <View style={styles.legalRow}>
              <TouchableOpacity onPress={() => goLegal('terms')}>
                <Text style={styles.legalLink}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.legalSep}>·</Text>
              <TouchableOpacity onPress={() => goLegal('privacy')}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#FFFFFF80',
    marginHorizontal: 20,
    padding: 10,
    borderRadius: 8,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
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
    fontFamily: 'Outfit-Medium',
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  legalLink: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    textDecorationLine: 'underline',
  },
  legalSep: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
  },
});

export default EnhancedSplashScreen;