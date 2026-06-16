import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSALegalPage, useUpdateSALegalPage } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

const LegalTab = ({ type, label }) => {
  const { data, isLoading, refetch } = useSALegalPage(type);
  const { mutateAsync: updateLegal } = useUpdateSALegalPage();

  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.content !== undefined) setContent(data.content);
  }, [data?.content]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLegal({ type, content });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      refetch();
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Save failed');
    } finally { setSaving(false); }
  };

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.tabContent}>
        <Text style={styles.fieldLabel}>{label} Content</Text>
        <TextInput
          style={styles.bigInput}
          value={content}
          onChangeText={setContent}
          multiline
          placeholder={`Enter ${label.toLowerCase()} content…`}
          placeholderTextColor="#999"
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={[styles.saveBtn, (saving || !content.trim()) && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving || !content.trim()}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : `Save ${label}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const SALegalPagesScreen = () => {
  const [activeTab, setActiveTab] = useState('terms');

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {[
          { key: 'terms', label: 'Terms of Service' },
          { key: 'privacy', label: 'Privacy Policy' },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'terms'
        ? <LegalTab key="terms" type="terms" label="Terms of Service" />
        : <LegalTab key="privacy" type="privacy" label="Privacy Policy" />}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderColor: 'transparent' },
  tabActive: { borderColor: colors.primary },
  tabText: { fontSize: 13, fontFamily: 'Outfit-Regular', color: colors.secondary },
  tabTextActive: { fontFamily: 'Outfit-SemiBold', color: colors.primary },
  tabContent: { padding: 16, flexGrow: 1 },
  fieldLabel: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack, marginBottom: 8 },
  bigInput: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 10, padding: 14, fontSize: 14, fontFamily: 'Outfit-Regular',
    color: '#1a1a1a', minHeight: 400, textAlignVertical: 'top', marginBottom: 16,
  },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 15 },
});

export default SALegalPagesScreen;
