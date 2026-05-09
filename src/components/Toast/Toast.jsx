import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

const { width } = Dimensions.get('window');

const Toast = ({
  visible,
  message = 'Offer generated!',
  duration = 3000,
  onHide,
  // onUndo,
}) => {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => hideToast(), duration);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -40,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onHide && onHide());
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.indicator} />
      <View style={styles.textContainer}>
        <Text style={styles.message}>{message}</Text>
        {/* <TouchableOpacity onPress={onUndo}>
          <Text style={styles.undo}>Undo</Text>
        </TouchableOpacity> */}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: width * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  indicator: {
    width: 4,
    height: '100%',
    backgroundColor: '#00C853', // bright green like Figma bar
    borderRadius: 4,
    marginRight: 12,
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  message: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '500',
  },
  undo: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: 'Outfit-SemiBold',
    marginLeft: 12,
  },
});

export default Toast;
