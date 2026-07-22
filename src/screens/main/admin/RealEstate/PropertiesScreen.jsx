import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl, ScrollView, Image, Switch,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useREProperties, useCreateREProperty, useREProperty,
  useREPropertyUnits, useCreateREUnit, useAddREPropertyImage,
} from '../../../../services/api/posApi';
import { BASE_URL } from '../../../../services/api/globalApi';
import { usePermissions } from '../../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../../utils/permissions';
import { useCurrency, CURRENCY_SYMBOLS } from '../../../../context/CurrencyContext';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import colors from '../../../../theme/colors';
import HeaderAddButton from '../../../../components/Ui/HeaderAddButton';

const CURRENCY_OPTIONS = Object.keys(CURRENCY_SYMBOLS);
const PROPERTY_TYPES = ['Residential', 'Commercial', 'Land', 'Industrial', 'Mixed-Use', 'Retail', 'Office', 'Warehouse'];
const PURPOSE_OPTIONS = [{ id: 'sale', name: 'For Sale' }, { id: 'rent', name: 'For Rent' }];
const FURNISHING_OPTIONS = ['Unfurnished', 'Semi-Furnished', 'Furnished'];
const STATUS_FILTERS = ['All', 'Available', 'Occupied', 'Sold', 'Inactive'];

const fmtCur = (n, cur) => `${CURRENCY_SYMBOLS[cur] ?? (cur ? cur + ' ' : '')}${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const uploadImage = async asset => {
  const token = await AsyncStorage.getItem('authToken');
  const body = new FormData();
  body.append('file', { uri: asset.uri, type: asset.type ?? 'image/jpeg', name: asset.fileName ?? 'property.jpg' });
  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json();
  return json.data?.url ?? json.url ?? json.data?.key ?? json.key ?? '';
};

const EMPTY_FORM = {
  title: '', propertyType: '', isMultiUnit: false,
  addressLine1: '', addressLine2: '', city: '', state: '', country: '', postalCode: '',
  description: '', amenities: '', yearBuilt: '',
  purpose: '', listPrice: '', currency: '', bedrooms: '', bathrooms: '', areaSqFt: '', furnishing: '',
};

const EMPTY_UNIT_FORM = {
  unitNumber: '', floor: '', bedrooms: '', bathrooms: '', areaSqFt: '', furnishing: '',
  purpose: '', listPrice: '', currency: '', depositAmount: '', description: '',
};

// ─── Create Property Modal ─────────────────────────────────────────────────────
const CreatePropertyModal = ({ visible, onClose, onSave, isSaving, bizCurrency }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));

  useEffect(() => { if (visible) setForm(EMPTY_FORM); }, [visible]);

  const handleSubmit = () => {
    if (!form.title.trim()) { Alert.alert('Required', 'Property title is required'); return; }
    if (!form.propertyType) { Alert.alert('Required', 'Please select a property type'); return; }
    if (!form.addressLine1.trim() || !form.city.trim() || !form.country.trim()) {
      Alert.alert('Required', 'Address, city and country are required'); return;
    }
    const payload = {
      title: form.title.trim(),
      propertyType: form.propertyType,
      isMultiUnit: form.isMultiUnit,
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim() || undefined,
      city: form.city.trim(),
      state: form.state.trim() || undefined,
      country: form.country.trim(),
      postalCode: form.postalCode.trim() || undefined,
      description: form.description.trim() || undefined,
      amenities: form.amenities.trim() ? form.amenities.split(',').map(a => a.trim()).filter(Boolean) : undefined,
      yearBuilt: form.yearBuilt ? parseInt(form.yearBuilt, 10) : undefined,
    };
    if (!form.isMultiUnit) {
      payload.purpose = form.purpose || undefined;
      payload.listPrice = form.listPrice ? parseFloat(form.listPrice) : undefined;
      payload.currency = form.currency || bizCurrency;
      payload.bedrooms = form.bedrooms ? parseInt(form.bedrooms, 10) : undefined;
      payload.bathrooms = form.bathrooms ? parseInt(form.bathrooms, 10) : undefined;
      payload.areaSqFt = form.areaSqFt ? parseFloat(form.areaSqFt) : undefined;
      payload.furnishing = form.furnishing || undefined;
    }
    onSave(payload);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.fullModalBg}>
        <View style={styles.fullModalCard}>
          <View style={styles.formHeader}>
            <Text style={styles.modalTitle}>New Property</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <Text style={styles.formSection}>Basic Info</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} value={form.title} onChangeText={set('title')} placeholder="e.g. Sunset Apartments" placeholderTextColor="#999" />
            </View>
            <InlinePicker
              label="Property Type *"
              options={PROPERTY_TYPES.map(t => ({ id: t, name: t }))}
              value={form.propertyType}
              onSelect={set('propertyType')}
              placeholder="Select type"
              allowNone={false}
            />
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Multi-Unit Property</Text>
                <Text style={styles.helperText}>Building/complex with several units</Text>
              </View>
              <Switch
                value={form.isMultiUnit}
                onValueChange={set('isMultiUnit')}
                trackColor={{ false: '#e5e7eb', true: colors.primary + '60' }}
                thumbColor={form.isMultiUnit ? colors.primary : '#9ca3af'}
              />
            </View>

            <Text style={styles.formSection}>Address</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Address Line 1 *</Text>
              <TextInput style={styles.input} value={form.addressLine1} onChangeText={set('addressLine1')} placeholder="Street address" placeholderTextColor="#999" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Address Line 2</Text>
              <TextInput style={styles.input} value={form.addressLine2} onChangeText={set('addressLine2')} placeholder="Apartment, suite, etc." placeholderTextColor="#999" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>City *</Text>
                <TextInput style={styles.input} value={form.city} onChangeText={set('city')} placeholder="City" placeholderTextColor="#999" />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>State</Text>
                <TextInput style={styles.input} value={form.state} onChangeText={set('state')} placeholder="State" placeholderTextColor="#999" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Country *</Text>
                <TextInput style={styles.input} value={form.country} onChangeText={set('country')} placeholder="Country" placeholderTextColor="#999" />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Postal Code</Text>
                <TextInput style={styles.input} value={form.postalCode} onChangeText={set('postalCode')} placeholder="Postal code" placeholderTextColor="#999" />
              </View>
            </View>

            <Text style={styles.formSection}>Details</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={form.description} onChangeText={set('description')} placeholder="Optional description" placeholderTextColor="#999" multiline />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Amenities</Text>
              <TextInput style={styles.input} value={form.amenities} onChangeText={set('amenities')} placeholder="Pool, Gym, Parking (comma separated)" placeholderTextColor="#999" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Year Built</Text>
              <TextInput style={styles.input} value={form.yearBuilt} onChangeText={set('yearBuilt')} placeholder="e.g. 2015" placeholderTextColor="#999" keyboardType="number-pad" />
            </View>

            {!form.isMultiUnit && (
              <>
                <Text style={styles.formSection}>Unit Details (single-unit property)</Text>
                <InlinePicker label="Purpose" options={PURPOSE_OPTIONS} value={form.purpose} onSelect={set('purpose')} placeholder="Sale or Rent" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>List Price</Text>
                    <TextInput style={styles.input} value={form.listPrice} onChangeText={set('listPrice')} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <InlinePicker label="Currency" options={CURRENCY_OPTIONS.map(c => ({ id: c, name: c }))} value={form.currency || bizCurrency} onSelect={set('currency')} allowNone={false} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>Bedrooms</Text>
                    <TextInput style={styles.input} value={form.bedrooms} onChangeText={set('bedrooms')} placeholder="0" placeholderTextColor="#999" keyboardType="number-pad" />
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>Bathrooms</Text>
                    <TextInput style={styles.input} value={form.bathrooms} onChangeText={set('bathrooms')} placeholder="0" placeholderTextColor="#999" keyboardType="number-pad" />
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Area (sq ft)</Text>
                  <TextInput style={styles.input} value={form.areaSqFt} onChangeText={set('areaSqFt')} placeholder="0" placeholderTextColor="#999" keyboardType="decimal-pad" />
                </View>
                <InlinePicker label="Furnishing" options={FURNISHING_OPTIONS.map(f => ({ id: f, name: f }))} value={form.furnishing} onSelect={set('furnishing')} placeholder="Select furnishing" />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isSaving}>
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Create Property</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Add Unit mini-form ─────────────────────────────────────────────────────────
const AddUnitForm = ({ propertyId, bizCurrency, onDone }) => {
  const [form, setForm] = useState(EMPTY_UNIT_FORM);
  const set = key => val => setForm(p => ({ ...p, [key]: val }));
  const { mutateAsync: createUnit, isPending } = useCreateREUnit();

  const handleSubmit = async () => {
    if (!form.purpose) { Alert.alert('Required', 'Please select a purpose'); return; }
    try {
      await createUnit({
        propertyId,
        unitNumber: form.unitNumber.trim() || undefined,
        floor: form.floor ? parseInt(form.floor, 10) : undefined,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms, 10) : undefined,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms, 10) : undefined,
        areaSqFt: form.areaSqFt ? parseFloat(form.areaSqFt) : undefined,
        furnishing: form.furnishing || undefined,
        purpose: form.purpose,
        listPrice: form.listPrice ? parseFloat(form.listPrice) : undefined,
        currency: form.currency || bizCurrency,
        depositAmount: form.depositAmount ? parseFloat(form.depositAmount) : undefined,
        description: form.description.trim() || undefined,
      });
      setForm(EMPTY_UNIT_FORM);
      onDone?.();
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to add unit');
    }
  };

  return (
    <View style={styles.inlineBox}>
      <Text style={styles.inlineBoxTitle}>Add New Unit</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Unit #</Text>
          <TextInput style={styles.input} value={form.unitNumber} onChangeText={set('unitNumber')} placeholder="e.g. 4B" placeholderTextColor="#999" />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Floor</Text>
          <TextInput style={styles.input} value={form.floor} onChangeText={set('floor')} placeholder="0" placeholderTextColor="#999" keyboardType="number-pad" />
        </View>
      </View>
      <InlinePicker label="Purpose *" options={PURPOSE_OPTIONS} value={form.purpose} onSelect={set('purpose')} placeholder="Sale or Rent" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>List Price</Text>
          <TextInput style={styles.input} value={form.listPrice} onChangeText={set('listPrice')} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <InlinePicker label="Currency" options={CURRENCY_OPTIONS.map(c => ({ id: c, name: c }))} value={form.currency || bizCurrency} onSelect={set('currency')} allowNone={false} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Bedrooms</Text>
          <TextInput style={styles.input} value={form.bedrooms} onChangeText={set('bedrooms')} placeholder="0" placeholderTextColor="#999" keyboardType="number-pad" />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Bathrooms</Text>
          <TextInput style={styles.input} value={form.bathrooms} onChangeText={set('bathrooms')} placeholder="0" placeholderTextColor="#999" keyboardType="number-pad" />
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Deposit Amount</Text>
        <TextInput style={styles.input} value={form.depositAmount} onChangeText={set('depositAmount')} placeholder="0.00" placeholderTextColor="#999" keyboardType="decimal-pad" />
      </View>
      <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={isPending}>
        {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Add Unit</Text>}
      </TouchableOpacity>
    </View>
  );
};

// ─── Property Detail Modal (units + images) ────────────────────────────────────
const PropertyDetailModal = ({ propertyId, onClose, bizCurrency }) => {
  const { data: property, isLoading } = useREProperty(propertyId);
  const { data: rawUnits = [] } = useREPropertyUnits(propertyId);
  const { mutateAsync: addImage, isPending: addingImage } = useAddREPropertyImage();
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [uploading, setUploading] = useState(false);

  const units = Array.isArray(rawUnits) ? rawUnits : (rawUnits?.data ?? []);
  const images = property?.images ?? [];

  const handlePickImage = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, async res => {
      if (res.didCancel || !res.assets?.length) return;
      setUploading(true);
      try {
        const url = await uploadImage(res.assets[0]);
        await addImage({ propertyId, url });
      } catch (e) {
        Alert.alert('Upload failed', e?.message ?? 'Try again');
      } finally {
        setUploading(false);
      }
    });
  };

  if (!propertyId) return null;

  return (
    <Modal visible={!!propertyId} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.fullModalBg}>
        <View style={styles.fullModalCard}>
          <View style={styles.formHeader}>
            <Text style={styles.modalTitle}>{property?.title ?? '…'}</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formSection}>Photos</Text>
              <View style={styles.imageGrid}>
                {images.map((img, i) => (
                  <Image key={img.id ?? i} source={{ uri: img.url }} style={styles.thumb} resizeMode="cover" />
                ))}
                <TouchableOpacity style={styles.addImageTile} onPress={handlePickImage} disabled={uploading || addingImage}>
                  {(uploading || addingImage)
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Text style={styles.addImageTileText}>+ Add</Text>}
                </TouchableOpacity>
              </View>

              {property?.isMultiUnit && (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.formSection}>Units ({units.length})</Text>
                    <TouchableOpacity onPress={() => setShowAddUnit(v => !v)}>
                      <Text style={styles.inlineAddLink}>{showAddUnit ? 'Cancel' : '+ Add Unit'}</Text>
                    </TouchableOpacity>
                  </View>
                  {showAddUnit && (
                    <AddUnitForm propertyId={propertyId} bizCurrency={bizCurrency} onDone={() => setShowAddUnit(false)} />
                  )}
                  {units.map(u => (
                    <View key={u.id} style={styles.unitRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.unitTitle}>{u.unitNumber ? `Unit ${u.unitNumber}` : 'Unit'}{u.floor != null ? ` · Floor ${u.floor}` : ''}</Text>
                        <Text style={styles.unitMeta}>
                          {u.purpose === 'rent' ? 'For Rent' : 'For Sale'}
                          {u.listPrice != null ? ` · ${fmtCur(u.listPrice, u.currency ?? bizCurrency)}` : ''}
                        </Text>
                      </View>
                      <View style={[styles.badge, u.status === 'Available' ? styles.badgeActive : styles.badgeNeutral]}>
                        <Text style={styles.badgeText}>{u.status ?? '—'}</Text>
                      </View>
                    </View>
                  ))}
                  {units.length === 0 && <Text style={styles.emptyResultText}>No units yet.</Text>}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Main screen ───────────────────────────────────────────────────────────────
const PropertiesScreen = () => {
  const perms = usePermissions();
  const canManage = perms.can(PERMISSIONS.MANAGE_RE_PROPERTIES);
  const { currency: bizCurrency } = useCurrency();

  const [search, setSearch] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const queryParams = {
    propertyType: propertyTypeFilter || undefined,
    city: cityFilter || undefined,
    status: statusFilter === 'All' ? undefined : statusFilter,
    search: search || undefined,
  };

  const { data: raw = [], isLoading, refetch } = useREProperties(queryParams);
  const { mutateAsync: create, isPending: creating } = useCreateREProperty();

  const properties = Array.isArray(raw) ? raw : (raw?.data ?? []);

  const handleSave = async payload => {
    try {
      await create(payload);
      setShowCreate(false);
    } catch (err) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to create property');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Properties</Text>
          <Text style={styles.subHeading}>Properties & units</Text>
        </View>
        {canManage && (
          <HeaderAddButton onPress={() => setShowCreate(true)} label="New Property" />
        )}
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, statusFilter === f && styles.filterChipActive]} onPress={() => setStatusFilter(f)}>
            <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={properties}
        keyExtractor={p => String(p.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={styles.filtersWrap}>
            <TouchableOpacity style={styles.filterToggle} onPress={() => setFiltersOpen(v => !v)}>
              <Text style={styles.filterToggleText}>{filtersOpen ? '▾' : '▸'} Filter</Text>
            </TouchableOpacity>
            {filtersOpen && (
              <View style={styles.filtersBody}>
                <TextInput style={styles.input} placeholder="Search by title, reference…" placeholderTextColor="#999" value={search} onChangeText={setSearch} />
                <TextInput style={styles.input} placeholder="Filter by city" placeholderTextColor="#999" value={cityFilter} onChangeText={setCityFilter} />
                <InlinePicker label="" options={PROPERTY_TYPES.map(t => ({ id: t, name: t }))} value={propertyTypeFilter} onSelect={setPropertyTypeFilter} placeholder="All property types" />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setDetailId(item.id)} activeOpacity={0.8}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.refNum}>{item.referenceNumber ?? item.reference}</Text>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              </View>
              <View style={[styles.badge, styles.badgeNeutral]}>
                <Text style={styles.badgeText}>{item.status ?? '—'}</Text>
              </View>
            </View>
            <Text style={styles.metaText}>{item.propertyType} · {item.city}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>{item.isMultiUnit ? `${item.units?.length ?? item.unitCount ?? 0} units` : 'Single unit'}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.empty}>No properties found.</Text>}
      />

      <CreatePropertyModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={handleSave}
        isSaving={creating}
        bizCurrency={bizCurrency}
      />
      <PropertyDetailModal propertyId={detailId} onClose={() => setDetailId(null)} bizCurrency={bizCurrency} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  heading: { fontSize: 18, fontFamily: 'Outfit-SemiBold', color: '#111' },
  subHeading: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6B7280', marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText: { color: '#fff', fontFamily: 'Outfit-SemiBold', fontSize: 13 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f0f0' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f3f4f6' },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  filterChipTextActive: { color: '#fff', fontFamily: 'Outfit-SemiBold' },

  filtersWrap: { paddingTop: 10 },
  filterToggle: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  filterToggleText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#374151' },
  filtersBody: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 4, gap: 8, borderWidth: 1, borderColor: '#eee' },

  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14, marginTop: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  refNum: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.secondary },
  cardTitle: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#111827', marginTop: 2 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, minWidth: 60, alignItems: 'center' },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeNeutral: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 12, fontFamily: 'Outfit-Bold', color: '#374151' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  metaText: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 6 },
  empty: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', marginTop: 40 },

  // Modal
  fullModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  fullModalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '92%' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  closeX: { fontSize: 18, color: colors.secondary, padding: 4 },
  modalTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#111827', flex: 1 },
  formSection: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: colors.primary, marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5 },
  helperText: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 2 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', backgroundColor: '#fff' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1.5, borderColor: '#D0D5DD', marginBottom: 14 },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },

  inlineAddLink: { color: colors.primary, fontFamily: 'Outfit-SemiBold', fontSize: 12 },
  emptyResultText: { textAlign: 'center', color: '#9ca3af', fontFamily: 'Outfit-Regular', padding: 14, fontSize: 13 },

  // Units
  inlineBox: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  inlineBoxTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827', marginBottom: 8 },
  unitRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 8, gap: 8 },
  unitTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#111827' },
  unitMeta: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 2 },

  // Images
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  thumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#f3f4f6' },
  addImageTile: { width: 80, height: 80, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addImageTileText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.primary },
});

export default PropertiesScreen;
