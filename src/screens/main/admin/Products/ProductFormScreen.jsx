import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, Switch, Modal,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCategories, useSuppliers, useDeviceConditions, useTaxes, useCreateTax,
  useManufacturers, useCreateManufacturer,
  useCreateProduct, useUpdateProduct, useAdminBranches,
} from '../../../../services/api/posApi';
import { BASE_URL } from '../../../../services/api/globalApi';
import apiClient from '../../../../services/api/globalApi';
import { useAuth } from '../../../../context/AuthContext';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import CascadingCategorySelect from '../../../../components/Ui/CascadingCategorySelect';
import { getExtraProductFields, generateBarcode } from '../../../../utils/productFieldConfig';
import colors from '../../../../theme/colors';

const EMPTY_FORM = {
  name: '', sku: '', barcode: '', price: '', cost: '', minSellingPrice: '',
  stock: '', lowStockThreshold: '', categoryId: '', supplierId: '', manufacturerId: '',
  description: '', condition: '', physicalLocation: '',
  warrantyDays: '', taxId: '', imageUrl: '', isTaxExcluded: false,
};

const STATUS_OPTIONS = [
  { id: 'active', name: 'Active — visible in POS' },
  { id: 'pending', name: 'Pending — setup required' },
  { id: 'inactive', name: 'Inactive — hidden from POS' },
];

const uploadImage = async (asset) => {
  const token = await AsyncStorage.getItem('authToken');
  const body = new FormData();
  body.append('file', { uri: asset.uri, type: asset.type ?? 'image/jpeg', name: asset.fileName ?? 'product.jpg' });
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json.data?.url ?? json.url ?? json.data?.key ?? json.key ?? '';
};

const InlineSelect = ({ label, value, options, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  return (
    <View style={s.field}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TouchableOpacity style={s.selectBtn} onPress={() => setOpen(true)}>
        <Text style={[s.selectText, !selected && { color: '#999' }]}>{selected ? selected.name : 'Select…'}</Text>
        <Text style={s.chevron}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={s.pickerBg} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.pickerSheet}>
            <ScrollView>
              <TouchableOpacity style={s.pickerRow} onPress={() => { onSelect(''); setOpen(false); }}>
                <Text style={s.pickerText}>— None —</Text>
              </TouchableOpacity>
              {options.map(opt => (
                <TouchableOpacity key={opt.id} style={s.pickerRow} onPress={() => { onSelect(opt.id); setOpen(false); }}>
                  <Text style={[s.pickerText, value === opt.id && { color: colors.primary, fontFamily: 'Outfit-SemiBold' }]}>{opt.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default function ProductFormScreen({ navigation, route }) {
  const product = route?.params?.product ?? null;
  const isEdit = !!product;
  const { user } = useAuth();
  const perms = usePermissions();
  const canManageManufacturers = perms.can(PERMISSIONS.MANAGE_MANUFACTURERS);

  const qc = useQueryClient();
  const { mutateAsync: create, isPending: creating } = useCreateProduct();
  const { mutateAsync: update, isPending: updating } = useUpdateProduct();
  const { mutateAsync: createTax, isPending: creatingTax } = useCreateTax();
  const { mutateAsync: createManufacturer, isPending: creatingManufacturer } = useCreateManufacturer();
  const { data: branchData } = useAdminBranches();

  const { data: rawCats = [] }       = useCategories();
  const { data: rawSuppliers = [] }  = useSuppliers();
  const { data: rawConditions = [] } = useDeviceConditions();
  const { data: rawTaxes = [] }      = useTaxes();
  const { data: rawManufacturers = [] } = useManufacturers();

  const norm = d => Array.isArray(d) ? d : (d?.data ?? []);
  const categories = norm(rawCats);
  const suppliers  = norm(rawSuppliers);
  const conditions = norm(rawConditions);
  const taxes      = norm(rawTaxes);
  const activeTaxes = taxes.filter(t => t.isActive);
  const manufacturers = norm(rawManufacturers);
  const branches = branchData?.branches ?? [];
  const extraFields = getExtraProductFields(user?.businessType);

  const [form, setForm] = useState(EMPTY_FORM);
  const [imgUploading, setImgUploading] = useState(false);
  const [extraData, setExtraData] = useState({});
  const [status, setStatus] = useState('active');
  const [showInlineTaxForm, setShowInlineTaxForm] = useState(false);
  const [inlineTax, setInlineTax] = useState({ name: '', percentage: '' });
  const [showAddManufacturer, setShowAddManufacturer] = useState(false);
  const [newManufacturerName, setNewManufacturerName] = useState('');
  const [selectedTargets, setSelectedTargets] = useState(['__main']);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));
  const setExtra = key => val => setExtraData(p => ({ ...p, [key]: val }));

  useEffect(() => {
    if (product) {
      setForm({
        name:              product.name ?? '',
        sku:               product.sku ?? '',
        barcode:           product.barcode ?? '',
        price:             product.price != null ? String(product.price) : '',
        cost:              product.cost != null ? String(product.cost) : '',
        minSellingPrice:   product.minSellingPrice != null ? String(product.minSellingPrice) : '',
        stock:             product.stock != null ? String(product.stock) : '',
        lowStockThreshold: product.lowStockThreshold != null ? String(product.lowStockThreshold) : '',
        categoryId:        product.categoryId ?? '',
        supplierId:        product.supplierId ?? '',
        manufacturerId:    product.manufacturerId ?? '',
        description:       product.description ?? '',
        condition:         product.condition ?? '',
        physicalLocation:  product.physicalLocation ?? '',
        warrantyDays:      product.warrantyDays != null ? String(product.warrantyDays) : '',
        taxId:             product.taxId ?? '',
        imageUrl:          product.imageUrl ?? '',
        isTaxExcluded:     !!product.isTaxExcluded,
      });
      setStatus(product.status ?? 'active');
      const initExtra = {};
      getExtraProductFields(user?.businessType).forEach(f => {
        const val = product[f.key];
        initExtra[f.key] = f.type === 'date' && val ? String(val).slice(0, 10) : (val ?? (f.type === 'boolean' ? false : ''));
      });
      setExtraData(initExtra);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const handlePickImage = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, async (res) => {
      if (res.didCancel || !res.assets?.length) return;
      setImgUploading(true);
      try {
        const url = await uploadImage(res.assets[0]);
        setForm(p => ({ ...p, imageUrl: url }));
      } catch (e) {
        Alert.alert('Upload failed', e?.message ?? 'Try again');
      } finally {
        setImgUploading(false);
      }
    });
  };

  const handleGenerateBarcode = () => set('barcode')(generateBarcode());

  const handleSaveInlineTax = async () => {
    if (!inlineTax.name.trim() || !inlineTax.percentage) return;
    try {
      const res = await createTax({ name: inlineTax.name.trim(), percentage: parseFloat(inlineTax.percentage) });
      const newTax = res?.data ?? res;
      if (newTax?.id) set('taxId')(String(newTax.id));
      qc.invalidateQueries({ queryKey: ['taxes'] });
      setInlineTax({ name: '', percentage: '' });
      setShowInlineTaxForm(false);
    } catch {
      Alert.alert('Error', 'Failed to create tax');
    }
  };

  const handleAddManufacturer = async () => {
    if (!newManufacturerName.trim()) return;
    try {
      const res = await createManufacturer({ name: newManufacturerName.trim() });
      const newMfr = res?.data ?? res;
      if (newMfr?.id) set('manufacturerId')(String(newMfr.id));
      qc.invalidateQueries({ queryKey: ['manufacturers'] });
      setNewManufacturerName('');
      setShowAddManufacturer(false);
    } catch {
      Alert.alert('Error', 'Failed to create manufacturer');
    }
  };

  const toggleTarget = id => setSelectedTargets(prev =>
    prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Product name is required'); return; }
    if (!form.price)        { Alert.alert('Error', 'Price is required'); return; }
    const extraPayload = {};
    extraFields.forEach(f => {
      const val = extraData[f.key];
      if (f.type === 'boolean') extraPayload[f.key] = !!val;
      else if (val !== '' && val != null) extraPayload[f.key] = val;
    });
    const payload = {
      name:              form.name,
      sku:               form.sku || undefined,
      barcode:           form.barcode || undefined,
      price:             parseFloat(form.price),
      cost:              form.cost ? parseFloat(form.cost) : undefined,
      minSellingPrice:   form.minSellingPrice ? parseFloat(form.minSellingPrice) : undefined,
      stock:             form.stock ? parseInt(form.stock) : 0,
      lowStockThreshold: form.lowStockThreshold ? parseInt(form.lowStockThreshold) : 0,
      categoryId:        form.categoryId || undefined,
      supplierId:        form.supplierId || undefined,
      manufacturerId:    form.manufacturerId || undefined,
      description:       form.description || undefined,
      condition:         form.condition || undefined,
      physicalLocation:  form.physicalLocation || undefined,
      warrantyDays:      form.warrantyDays ? parseInt(form.warrantyDays) : undefined,
      taxId:             form.isTaxExcluded ? (form.taxId || undefined) : undefined,
      isTaxExcluded:     form.isTaxExcluded,
      imageUrl:          form.imageUrl || undefined,
      ...extraPayload,
    };
    try {
      if (isEdit) {
        await update({ id: product.id, ...payload, status });
      } else {
        const targets = selectedTargets.length > 0 ? selectedTargets : ['__main'];
        const results = await Promise.allSettled(targets.map(target =>
          target === '__main'
            ? create(payload)
            : apiClient.post('/admin/products', payload, { headers: { 'X-Branch-Id': target } }),
        ));
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0 && failed < results.length) {
          Alert.alert('Partial success', `Product added to ${results.length - failed} of ${results.length} businesses.`);
        } else if (failed === results.length) {
          Alert.alert('Error', 'Failed to add product');
          return;
        }
      }
      qc.invalidateQueries({ queryKey: ['products'] });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Save failed');
    }
  };

  const F = ({ label, fkey, placeholder, keyboard }) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={form[fkey]}
        onChangeText={set(fkey)}
        keyboardType={keyboard ?? 'default'}
      />
    </View>
  );

  const isSaving = creating || updating || imgUploading;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

        <Text style={s.section}>Product Image</Text>
        <View style={s.imageRow}>
          <View style={s.imagePreview}>
            {form.imageUrl
              ? <Image source={{ uri: form.imageUrl }} style={s.imagePreviewImg} resizeMode="cover" />
              : <Text style={s.imagePlaceholder}>No Image</Text>}
          </View>
          <View style={s.imageActions}>
            <TouchableOpacity style={s.imageBtn} onPress={handlePickImage} disabled={imgUploading}>
              {imgUploading
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={s.imageBtnText}>Upload Image</Text>}
            </TouchableOpacity>
            {form.imageUrl ? (
              <TouchableOpacity style={[s.imageBtn, { borderColor: '#dc2626' }]} onPress={() => set('imageUrl')('')}>
                <Text style={[s.imageBtnText, { color: '#dc2626' }]}>Remove</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={s.imageHint}>PNG, JPG up to 5MB</Text>
          </View>
        </View>

        <Text style={s.section}>Basic Info</Text>
        <F label="Product Name *" fkey="name" placeholder="Product name" />
        <F label="SKU" fkey="sku" placeholder="e.g. PRD-001" />
        <View style={s.field}>
          <Text style={s.label}>Barcode</Text>
          <View style={s.barcodeRow}>
            <TextInput
              style={[s.input, s.barcodeInput]}
              placeholder="Scan or enter barcode"
              placeholderTextColor="#999"
              value={form.barcode}
              onChangeText={set('barcode')}
            />
            <TouchableOpacity style={s.genBarcodeBtn} onPress={handleGenerateBarcode}>
              <Text style={s.genBarcodeBtnText}>Generate</Text>
            </TouchableOpacity>
          </View>
        </View>
        <CascadingCategorySelect categories={categories} value={form.categoryId} onChange={set('categoryId')} label="Category" />
        <InlineSelect label="Supplier" value={form.supplierId} options={suppliers} onSelect={set('supplierId')} />
        <InlineSelect label="Condition" value={form.condition} options={conditions.map(c => ({ id: c.name, name: c.name }))} onSelect={set('condition')} />
        {canManageManufacturers && (
          <>
            <InlineSelect label="Manufacturer" value={form.manufacturerId} options={manufacturers} onSelect={set('manufacturerId')} />
            {!showAddManufacturer ? (
              <TouchableOpacity style={s.addTaxBtn} onPress={() => setShowAddManufacturer(true)}>
                <Text style={s.addTaxBtnText}>+ Add Manufacturer</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.inlineTaxBox}>
                <Text style={s.label}>Manufacturer Name</Text>
                <TextInput style={s.input} value={newManufacturerName} onChangeText={setNewManufacturerName} placeholder="e.g. Samsung, Apple" placeholderTextColor="#999" />
                <View style={s.inlineTaxBtnRow}>
                  <TouchableOpacity style={s.inlineTaxCancelBtn} onPress={() => { setShowAddManufacturer(false); setNewManufacturerName(''); }}>
                    <Text style={s.inlineTaxCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.inlineTaxSaveBtn} onPress={handleAddManufacturer} disabled={creatingManufacturer}>
                    {creatingManufacturer ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.inlineTaxSaveText}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
        <F label="Physical Location" fkey="physicalLocation" placeholder="e.g. Shelf A3" />
        <View style={s.field}>
          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, { height: 80, textAlignVertical: 'top' }]}
            value={form.description}
            onChangeText={set('description')}
            placeholder="Optional product description"
            placeholderTextColor="#999"
            multiline
          />
        </View>

        <Text style={s.section}>Pricing</Text>
        <F label="Sale Price *" fkey="price" placeholder="0.00" keyboard="decimal-pad" />
        <F label="Cost Price" fkey="cost" placeholder="0.00" keyboard="decimal-pad" />
        <F label="Min Selling Price" fkey="minSellingPrice" placeholder="0.00" keyboard="decimal-pad" />

        <Text style={s.section}>Stock</Text>
        <F label="Stock Quantity" fkey="stock" placeholder="0" keyboard="number-pad" />
        <F label="Low Stock Alert" fkey="lowStockThreshold" placeholder="0" keyboard="number-pad" />
        <F label="Warranty (Days)" fkey="warrantyDays" placeholder="e.g. 365" keyboard="number-pad" />

        <Text style={s.section}>Tax Configuration</Text>
        <View style={s.switchRow}>
          <Text style={s.label}>Exclude Tax</Text>
          <Switch
            value={form.isTaxExcluded}
            onValueChange={v => setForm(p => ({ ...p, isTaxExcluded: v, taxId: v ? p.taxId : '' }))}
            trackColor={{ false: '#e5e7eb', true: colors.primary + '60' }}
            thumbColor={form.isTaxExcluded ? colors.primary : '#9ca3af'}
          />
        </View>
        {form.isTaxExcluded && (
          <>
            <InlineSelect
              label="Select Tax"
              value={form.taxId}
              options={activeTaxes.map(t => ({ id: String(t.id), name: `${t.name} (${t.percentage}%)` }))}
              onSelect={set('taxId')}
            />
            {!showInlineTaxForm && activeTaxes.length === 0 && (
              <TouchableOpacity style={s.addTaxBtn} onPress={() => setShowInlineTaxForm(true)}>
                <Text style={s.addTaxBtnText}>+ Add Tax</Text>
              </TouchableOpacity>
            )}
            {showInlineTaxForm && (
              <View style={s.inlineTaxBox}>
                <View style={s.inlineTaxRow}>
                  <View style={s.inlineTaxCol}>
                    <Text style={s.label}>Tax Name</Text>
                    <TextInput style={s.input} value={inlineTax.name} onChangeText={v => setInlineTax(p => ({ ...p, name: v }))} placeholder="VAT" placeholderTextColor="#999" />
                  </View>
                  <View style={s.inlineTaxCol}>
                    <Text style={s.label}>Percentage %</Text>
                    <TextInput style={s.input} value={inlineTax.percentage} onChangeText={v => setInlineTax(p => ({ ...p, percentage: v }))} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
                  </View>
                </View>
                <View style={s.inlineTaxBtnRow}>
                  <TouchableOpacity style={s.inlineTaxCancelBtn} onPress={() => { setShowInlineTaxForm(false); setInlineTax({ name: '', percentage: '' }); }}>
                    <Text style={s.inlineTaxCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.inlineTaxSaveBtn} onPress={handleSaveInlineTax} disabled={creatingTax}>
                    {creatingTax ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.inlineTaxSaveText}>Save Tax</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {extraFields.length > 0 && ['Medicine Details', 'Medical Info', 'Batch & Expiry'].map(section => {
          const fields = extraFields.filter(f => f.section === section);
          if (!fields.length) return null;
          return (
            <View key={section}>
              <Text style={s.section}>{section}</Text>
              {fields.map(f => {
                if (f.type === 'boolean') {
                  return (
                    <View key={f.key} style={s.switchRow}>
                      <Text style={s.label}>{f.label}</Text>
                      <Switch
                        value={!!extraData[f.key]}
                        onValueChange={setExtra(f.key)}
                        trackColor={{ false: '#e5e7eb', true: colors.primary + '60' }}
                        thumbColor={extraData[f.key] ? colors.primary : '#9ca3af'}
                      />
                    </View>
                  );
                }
                if (f.type === 'select') {
                  return (
                    <InlineSelect
                      key={f.key}
                      label={f.label}
                      value={extraData[f.key]}
                      options={f.options.map(o => ({ id: o, name: o }))}
                      onSelect={setExtra(f.key)}
                    />
                  );
                }
                return (
                  <View key={f.key} style={s.field}>
                    <Text style={s.label}>{f.label}</Text>
                    <TextInput
                      style={[s.input, f.type === 'textarea' && { height: 70, textAlignVertical: 'top' }]}
                      value={extraData[f.key] ?? ''}
                      onChangeText={setExtra(f.key)}
                      placeholder={f.type === 'date' ? 'YYYY-MM-DD' : f.placeholder}
                      placeholderTextColor="#999"
                      multiline={f.type === 'textarea'}
                    />
                  </View>
                );
              })}
            </View>
          );
        })}

        {isEdit && (
          <>
            <Text style={s.section}>Product Status</Text>
            {product?.status === 'pending' && (
              <View style={s.pendingBanner}>
                <Text style={s.pendingBannerText}>
                  This product was automatically added from a delivered wholesale order. Set the selling price and activate it to make it available in POS.
                </Text>
              </View>
            )}
            <InlineSelect label="" value={status} options={STATUS_OPTIONS} onSelect={setStatus} />
          </>
        )}

        {!isEdit && user?.role === 'admin' && branches.length > 0 && (
          <>
            <Text style={s.section}>Add to Business(es)</Text>
            <View style={s.targetRow}>
              {[{ id: '__main', name: 'Main Business' }, ...branches].map(b => {
                const selected = selectedTargets.includes(b.id);
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[s.targetChip, selected && s.targetChipActive]}
                    onPress={() => toggleTarget(b.id)}
                  >
                    <Text style={[s.targetChipText, selected && s.targetChipTextActive]}>{b.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={s.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={isSaving}>
          {isSaving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveText}>{isEdit ? 'Update Product' : 'Add Product'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  body: { padding: 16, paddingBottom: 20 },
  section: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 10 },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },
  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  selectText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827' },
  chevron: { fontSize: 12, color: '#9ca3af' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1.5, borderColor: '#D0D5DD', marginBottom: 14 },

  // Barcode
  barcodeRow: { flexDirection: 'row', gap: 8 },
  barcodeInput: { flex: 1 },
  genBarcodeBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  genBarcodeBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary },

  // Inline tax creation
  addTaxBtn: { alignSelf: 'flex-start', marginTop: -6, marginBottom: 14 },
  addTaxBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  inlineTaxBox: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 14 },
  inlineTaxRow: { flexDirection: 'row', gap: 10 },
  inlineTaxCol: { flex: 1 },
  inlineTaxBtnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  inlineTaxCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  inlineTaxCancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280', fontSize: 13 },
  inlineTaxSaveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  inlineTaxSaveText: { fontFamily: 'Outfit-SemiBold', color: '#fff', fontSize: 13 },

  // Status
  pendingBanner: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, padding: 12, marginBottom: 10 },
  pendingBannerText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#92400e', lineHeight: 18 },

  // Multi-business targets
  targetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  targetChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: '#D0D5DD' },
  targetChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  targetChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#374151' },
  targetChipTextActive: { color: '#fff' },

  // Image
  imageRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 8 },
  imagePreview: { width: 90, height: 90, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  imagePreviewImg: { width: 90, height: 90 },
  imagePlaceholder: { fontSize: 11, color: '#9ca3af', fontFamily: 'Outfit-Regular', textAlign: 'center' },
  imageActions: { flex: 1, gap: 8 },
  imageBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' },
  imageBtnText: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary },
  imageHint: { fontSize: 11, color: '#9ca3af', fontFamily: 'Outfit-Regular' },

  // Picker
  pickerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%', padding: 12 },
  pickerRow: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  pickerText: { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#111827' },

  // Footer
  footer: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  cancelText: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#374151' },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveText: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#fff' },
});
