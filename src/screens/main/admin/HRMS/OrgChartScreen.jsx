import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { useHRMSOrgChart } from '../../../../services/api/posApi';
import colors from '../../../../theme/colors';

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

const AVATAR_COLORS = ['#DBEAFE', '#EDE9FE', '#D1FAE5', '#FEF3C7', '#FCE7F3', '#CFFAFE'];
function avatarColor(id = '') {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Builds a reportsTo tree from the flat list, guarding against cycles. */
function buildTree(nodes) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const childrenMap = new Map();
  const roots = [];

  const createsCycle = (id, managerId) => {
    let cur = managerId;
    const seen = new Set();
    while (cur) {
      if (cur === id || seen.has(cur)) return true;
      seen.add(cur);
      cur = byId.get(cur)?.reportsToId ?? null;
    }
    return false;
  };

  for (const n of nodes) {
    const managerId = n.reportsToId && byId.has(n.reportsToId) && !createsCycle(n.id, n.reportsToId) ? n.reportsToId : null;
    if (!managerId) {
      roots.push(n);
    } else {
      if (!childrenMap.has(managerId)) childrenMap.set(managerId, []);
      childrenMap.get(managerId).push(n);
    }
  }
  return { roots, childrenMap };
}

function TreeNode({ node, childrenMap, depth, expanded, toggle, onSelect, selectedId }) {
  const children = childrenMap.get(node.id) ?? [];
  const isOpen = expanded.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <View>
      <TouchableOpacity
        style={[styles.node, { marginLeft: depth * 18 }, isSelected && styles.nodeSelected]}
        onPress={() => onSelect(node)}
      >
        {children.length > 0 ? (
          <TouchableOpacity onPress={() => toggle(node.id)} style={styles.toggleBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.toggleText}>{isOpen ? '▾' : '▸'}</Text>
          </TouchableOpacity>
        ) : <View style={styles.toggleSpacer} />}

        <View style={[styles.avatar, { backgroundColor: avatarColor(node.id) }]}>
          <Text style={styles.avatarText}>{getInitials(node.fullName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nodeName}>{node.fullName}</Text>
          <Text style={styles.nodeSub} numberOfLines={1}>
            {[node.designation, node.department?.name].filter(Boolean).join(' · ') || 'No designation'}
          </Text>
        </View>
        {children.length > 0 && <Text style={styles.reportCount}>{children.length}</Text>}
      </TouchableOpacity>

      {isOpen && children.map(child => (
        <TreeNode
          key={child.id} node={child} childrenMap={childrenMap} depth={depth + 1}
          expanded={expanded} toggle={toggle} onSelect={onSelect} selectedId={selectedId}
        />
      ))}
    </View>
  );
}

export default function OrgChartScreen() {
  const { data: rawNodes = [], isLoading, refetch, isRefetching } = useHRMSOrgChart();
  const nodes = Array.isArray(rawNodes) ? rawNodes : (rawNodes?.data ?? []);
  const [expanded, setExpanded] = useState(new Set());
  const [selected, setSelected] = useState(null);

  const { roots, childrenMap } = useMemo(() => buildTree(nodes), [nodes]);

  // Expand everyone by default the first time data loads, so the hierarchy is visible at a glance
  useMemo(() => {
    if (nodes.length && expanded.size === 0) setExpanded(new Set(nodes.map(n => n.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  const toggle = id => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {roots.length === 0 ? (
          <Text style={styles.empty}>No staff hierarchy set up yet. Add "Reports To" in each employee's HRMS Profile.</Text>
        ) : (
          roots.map(root => (
            <TreeNode
              key={root.id} node={root} childrenMap={childrenMap} depth={0}
              expanded={expanded} toggle={toggle} onSelect={setSelected} selectedId={selected?.id}
            />
          ))
        )}
      </ScrollView>

      {selected && (
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <View style={[styles.avatar, { backgroundColor: avatarColor(selected.id), width: 40, height: 40 }]}>
              <Text style={styles.avatarText}>{getInitials(selected.fullName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailName}>{selected.fullName}</Text>
              <Text style={styles.detailSub}>{selected.designation || 'No designation'}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Email</Text><Text style={styles.detailValue}>{selected.email}</Text></View>
          {selected.employeeId && <View style={styles.detailRow}><Text style={styles.detailLabel}>Employee ID</Text><Text style={styles.detailValue}>{selected.employeeId}</Text></View>}
          {selected.department?.name && <View style={styles.detailRow}><Text style={styles.detailLabel}>Department</Text><Text style={styles.detailValue}>{selected.department.name}</Text></View>}
          {selected.joiningDate && <View style={styles.detailRow}><Text style={styles.detailLabel}>Joined</Text><Text style={styles.detailValue}>{String(selected.joiningDate).slice(0, 10)}</Text></View>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: colors.secondary, fontFamily: 'Outfit-Regular', marginTop: 40, paddingHorizontal: 24 },
  node: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 6 },
  nodeSelected: { borderWidth: 1.5, borderColor: colors.primary },
  toggleBtn: { width: 20, alignItems: 'center' },
  toggleSpacer: { width: 20 },
  toggleText: { fontSize: 14, color: colors.secondary },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontFamily: 'Outfit-Bold', color: colors.defaultBlack },
  nodeName: { fontSize: 14, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  nodeSub: { fontSize: 11, fontFamily: 'Outfit-Regular', color: colors.secondary, marginTop: 1 },
  reportCount: { fontSize: 11, fontFamily: 'Outfit-SemiBold', color: colors.primary, backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  detailCard: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: '#fff', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: -2 }, elevation: 8 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  detailName: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
  detailSub: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary },
  closeBtn: { fontSize: 16, color: colors.secondary, padding: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderTopWidth: 1, borderColor: '#F3F4F6' },
  detailLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: colors.secondary },
  detailValue: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: colors.defaultBlack },
});
