import React, { useEffect, useRef } from 'react';
import {
  Modal, View, TouchableOpacity, Animated, StyleSheet,
  Dimensions, Platform, StatusBar,
} from 'react-native';
import { useSidebarStore } from '../../store/sidebarStore';
import Sidebar from './Sidebar';

const { width: W, height: WH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(W * 0.82, 300);
// On Android with statusBarTranslucent the modal fills the full screen height
// (including status bar), so we need screen height not window height.
const PANEL_HEIGHT = Platform.OS === 'android'
  ? WH + (StatusBar.currentHeight ?? 0)
  : WH;

const SidebarOverlay = () => {
  const { isOpen, close } = useSidebarStore();
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: isOpen ? 0 : -SIDEBAR_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: isOpen ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen]);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Dimmed backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />
        </Animated.View>

        {/* Sidebar panel — explicit pixel height so Sidebar's flex:1 is constrained */}
        <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
          <Sidebar onClose={close} />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    height: PANEL_HEIGHT,
    backgroundColor: '#fff',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default SidebarOverlay;
