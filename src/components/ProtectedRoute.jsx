import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { usePermissions } from '../hooks/usePermissions';
import colors from '../theme/colors';

const NoAccess = ({ navigation }) => (
  <View style={styles.container}>
    <Text style={styles.icon}>🔒</Text>
    <Text style={styles.title}>Access Denied</Text>
    <Text style={styles.body}>You don't have permission to view this page.</Text>
    {navigation && (
      <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
        <Text style={styles.btnText}>Go Back</Text>
      </TouchableOpacity>
    )}
  </View>
);

const ProtectedRoute = ({ component: Component, permission, ...rest }) => {
  const perms = usePermissions();

  if (permission && !perms.can(permission)) {
    return <NoAccess navigation={rest.navigation} />;
  }

  return <Component {...rest} />;
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 8 },
  body: { fontSize: 15, fontFamily: 'Outfit-Regular', color: colors.secondary, textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontFamily: 'Outfit-Medium', fontSize: 15 },
});

export default ProtectedRoute;
