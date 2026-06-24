import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
} from 'react-native';
import colors from '../../theme/colors';

/**
 * Cascading category selector that mirrors the web frontend behaviour.
 *
 * Props:
 *   categories  – flat array of { id, name, parentId } from the API
 *   value       – currently selected category id (the deepest leaf)
 *   onChange    – called with the new leaf category id (string) or '' to clear
 *   label       – optional label for the first dropdown
 */
export default function CascadingCategorySelect({ categories = [], value, onChange, label = 'Category' }) {
  const [open, setOpen] = useState(null); // which level picker is open (index or null)

  const getChildren = (parentId) =>
    categories.filter(c => (c.parentId ?? null) === (parentId ?? null));

  // Reconstruct the path from the selected value upward
  const buildPath = (leafId) => {
    if (!leafId) return [];
    const path = [];
    let cur = categories.find(c => c.id === leafId);
    while (cur) {
      path.unshift(cur.id);
      cur = cur.parentId ? categories.find(c => c.id === cur.parentId) : null;
    }
    return path;
  };

  const path = buildPath(value);

  // Build the levels to render
  const levels = [];
  // Level 0: root categories
  const roots = getChildren(null);
  if (roots.length > 0) {
    levels.push({ label: label, options: roots, selectedId: path[0] || '' });
  }
  // Subsequent levels
  for (let i = 0; i < path.length; i++) {
    const children = getChildren(path[i]);
    if (children.length > 0) {
      levels.push({
        label: i === 0 ? 'Subcategory' : `Sub-level ${i + 1}`,
        options: children,
        selectedId: path[i + 1] || '',
      });
    }
  }

  const handleSelect = (levelIdx, selectedId) => {
    setOpen(null);
    if (!selectedId) {
      // Clear from this level onward — set value to parent at levelIdx-1, or '' for root
      const newLeaf = levelIdx > 0 ? path[levelIdx - 1] : '';
      onChange(newLeaf);
    } else {
      // Set this level's selection. The new path is path up to levelIdx, then selectedId.
      // Check if the selected item has children — if so it's not yet a leaf but we still update value.
      const newPath = [...path.slice(0, levelIdx), selectedId];
      onChange(newPath[newPath.length - 1]);
    }
  };

  // Build display breadcrumb
  const breadcrumb = path
    .map(id => categories.find(c => c.id === id)?.name || '')
    .filter(Boolean)
    .join(' › ');

  return (
    <View style={s.wrap}>
      {levels.map((level, idx) => {
        const selected = level.options.find(o => o.id === level.selectedId);
        return (
          <View key={idx} style={s.levelWrap}>
            <Text style={s.label}>{level.label}</Text>
            <TouchableOpacity style={s.selectBtn} onPress={() => setOpen(idx)}>
              <Text style={[s.selectText, !selected && s.placeholder]}>
                {selected ? selected.name : idx === 0 ? 'Select category…' : 'Select sub-category…'}
              </Text>
              <Text style={s.chevron}>▾</Text>
            </TouchableOpacity>

            <Modal visible={open === idx} transparent animationType="fade">
              <TouchableOpacity style={s.pickerBg} activeOpacity={1} onPress={() => setOpen(null)}>
                <View style={s.pickerSheet}>
                  <Text style={s.pickerTitle}>{level.label}</Text>
                  <ScrollView>
                    <TouchableOpacity style={s.pickerRow} onPress={() => handleSelect(idx, '')}>
                      <Text style={s.pickerText}>— None —</Text>
                    </TouchableOpacity>
                    {level.options.map(opt => (
                      <TouchableOpacity
                        key={opt.id}
                        style={s.pickerRow}
                        onPress={() => handleSelect(idx, opt.id)}
                      >
                        <Text style={[s.pickerText, level.selectedId === opt.id && s.pickerTextActive]}>
                          {opt.name}
                        </Text>
                        {getChildren(opt.id).length > 0 && (
                          <Text style={s.hasChildren}>›</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        );
      })}

      {breadcrumb ? (
        <Text style={s.breadcrumb}>{breadcrumb}</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  levelWrap: { marginBottom: 10 },
  label: { fontSize: 14, fontFamily: 'Outfit-Medium', color: '#374151', marginBottom: 5 },
  selectBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff',
  },
  selectText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111827', flex: 1 },
  placeholder: { color: '#999' },
  chevron: { fontSize: 12, color: '#9ca3af', marginLeft: 8 },
  breadcrumb: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#9ca3af', marginTop: 4, marginLeft: 2 },

  // Picker modal
  pickerBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '65%', padding: 12 },
  pickerTitle: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: '#374151', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: '#f0f0f0', marginBottom: 4 },
  pickerRow: { paddingVertical: 13, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: '#f5f5f5', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerText: { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#111827', flex: 1 },
  pickerTextActive: { color: colors.primary, fontFamily: 'Outfit-SemiBold' },
  hasChildren: { fontSize: 16, color: '#9ca3af', marginLeft: 8 },
});
