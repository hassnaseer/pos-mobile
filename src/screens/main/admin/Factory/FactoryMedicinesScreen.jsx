import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../../../../theme/colors';

const FactoryMedicinesScreen = () => (
  <View style={styles.root}>
    <Text style={styles.title}>Medicines</Text>
    <Text style={styles.sub}>Factory medicines management coming soon.</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9', justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 22, fontFamily: 'Outfit-Bold', color: colors.defaultBlack, marginBottom: 8 },
  sub: { fontSize: 14, fontFamily: 'Outfit-Regular', color: colors.secondary, textAlign: 'center' },
});

export default FactoryMedicinesScreen;
