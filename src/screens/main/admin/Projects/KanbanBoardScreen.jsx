import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../../services/api/globalApi';
import { useStaffList } from '../../../../services/api/posApi';
import InlinePicker from '../../../../components/InlinePicker/InlinePicker';
import DatePicker from '../../../../components/Ui/DatePicker';
import colors from '../../../../theme/colors';

const PRIORITIES = ['low', 'medium', 'high'];
const PRIORITY_STYLE = {
  low:    { bg: '#d1fae5', text: '#065f46' },
  medium: { bg: '#fef9c3', text: '#a16207' },
  high:   { bg: '#fee2e2', text: '#b91c1c' },
};

const useProjectsList = () =>
  useQuery({
    queryKey: ['projects'],
    queryFn: async () => { const r = await apiClient.get('/admin/projects'); return r?.data ?? r ?? []; },
    staleTime: 30_000,
  });

const useKanban = projectId =>
  useQuery({
    queryKey: ['kanban', projectId],
    queryFn: async () => { const r = await apiClient.get(`/admin/projects/${projectId}/kanban`); return r?.data ?? r ?? []; },
    enabled: !!projectId,
  });

const EMPTY_TASK = { open: false, mode: 'add', taskId: '', columnId: '', title: '', description: '', priority: 'medium', dueDate: '', assignedToId: '' };
const EMPTY_COL  = { open: false, mode: 'add', colId: '', name: '' };

export default function KanbanBoardScreen() {
  const qc = useQueryClient();
  const { data: rawProjects = [], isLoading: projectsLoading } = useProjectsList();
  const projects = Array.isArray(rawProjects) ? rawProjects : (rawProjects?.data ?? []);
  const [projectId, setProjectId] = useState('');

  useEffect(() => {
    if (!projectId && projects.length > 0) setProjectId(projects[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length, projectId]);

  const { data: rawKanban = [], isLoading: kanbanLoading, isFetching: kanbanFetching, refetch: refetchKanban } = useKanban(projectId);
  const kanban = Array.isArray(rawKanban) ? rawKanban : (rawKanban?.data ?? []);
  const { data: rawStaff = [] } = useStaffList();
  const staffList = Array.isArray(rawStaff) ? rawStaff : (rawStaff?.data ?? []);
  const staffOptions = staffList.map(s => ({ id: s.id, name: s.fullName ?? s.name }));

  const reload = () => qc.invalidateQueries({ queryKey: ['kanban', projectId] });

  const [colDialog, setColDialog] = useState(EMPTY_COL);
  const [taskDialog, setTaskDialog] = useState(EMPTY_TASK);
  const [moveTask, setMoveTask] = useState(null);

  const saveColumnMut = useMutation({
    mutationFn: () => colDialog.mode === 'add'
      ? apiClient.post(`/admin/projects/${projectId}/columns`, { name: colDialog.name.trim() })
      : apiClient.patch(`/admin/projects/${projectId}/columns/${colDialog.colId}`, { name: colDialog.name.trim() }),
    onSuccess: () => { reload(); setColDialog(EMPTY_COL); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save column'),
  });

  const deleteColumnMut = useMutation({
    mutationFn: colId => apiClient.delete(`/admin/projects/${projectId}/columns/${colId}`),
    onSuccess: reload,
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to delete column'),
  });

  const saveTaskMut = useMutation({
    mutationFn: () => {
      const payload = {
        columnId: taskDialog.columnId,
        title: taskDialog.title.trim(),
        description: taskDialog.description || undefined,
        priority: taskDialog.priority,
        dueDate: taskDialog.dueDate || undefined,
        assignedToId: taskDialog.assignedToId || undefined,
      };
      return taskDialog.mode === 'add'
        ? apiClient.post(`/admin/projects/${projectId}/kanban/tasks`, payload)
        : apiClient.patch(`/admin/projects/${projectId}/kanban/tasks/${taskDialog.taskId}`, payload);
    },
    onSuccess: () => { reload(); setTaskDialog(EMPTY_TASK); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to save task'),
  });

  const deleteTaskMut = useMutation({
    mutationFn: taskId => apiClient.delete(`/admin/projects/${projectId}/kanban/tasks/${taskId}`),
    onSuccess: reload,
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to delete task'),
  });

  const moveTaskMut = useMutation({
    mutationFn: ({ taskId, columnId }) => apiClient.patch(`/admin/projects/${projectId}/kanban/tasks/${taskId}`, { columnId }),
    onSuccess: () => { reload(); setMoveTask(null); },
    onError: e => Alert.alert('Error', typeof e === 'string' ? e : 'Failed to move task'),
  });

  const openEditTask = (task, colId) => setTaskDialog({
    open: true, mode: 'edit', taskId: task.id, columnId: colId,
    title: task.title, description: task.description ?? '', priority: task.priority ?? 'medium',
    dueDate: task.dueDate ?? '', assignedToId: task.assignedTo?.id ?? '',
  });

  const handleColumnMenu = col => Alert.alert(col.name, undefined, [
    { text: 'Rename', onPress: () => setColDialog({ open: true, mode: 'edit', colId: col.id, name: col.name }) },
    { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Delete Column', 'Delete this column? All tasks inside will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteColumnMut.mutate(col.id) },
    ]) },
    { text: 'Cancel', style: 'cancel' },
  ]);

  const handleDeleteTask = () => Alert.alert('Delete Task', 'Delete this task? This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => { deleteTaskMut.mutate(taskDialog.taskId); setTaskDialog(EMPTY_TASK); } },
  ]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>Board</Text>
        <InlinePicker
          options={projects.map(p => ({ id: p.id, name: p.name }))}
          value={projectId}
          onSelect={setProjectId}
          placeholder={projectsLoading ? 'Loading projects…' : 'No projects'}
          allowNone={false}
        />
      </View>

      {kanbanLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
      ) : !projectId ? (
        <Text style={styles.empty}>Create a project first to use the board.</Text>
      ) : (
        <ScrollView
          horizontal
          contentContainerStyle={styles.board}
          showsHorizontalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={kanbanFetching} onRefresh={refetchKanban} tintColor={colors.primary} />}
        >
          {kanban.map(col => (
            <View key={col.id} style={styles.column}>
              <View style={styles.colHeader}>
                <Text style={styles.colTitle}>{col.name}</Text>
                <View style={styles.colCount}><Text style={styles.colCountText}>{col.tasks.length}</Text></View>
                <TouchableOpacity onPress={() => handleColumnMenu(col)} style={styles.colMenuBtn}>
                  <Text style={styles.colMenuDots}>⋯</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.colTasks}>
                {col.tasks.map(task => {
                  const pr = PRIORITY_STYLE[task.priority ?? 'medium'];
                  return (
                    <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => openEditTask(task, col.id)} onLongPress={() => setMoveTask({ task, fromColId: col.id })}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      {task.description ? <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text> : null}
                      <View style={styles.taskMetaRow}>
                        <View style={[styles.priorityBadge, { backgroundColor: pr.bg }]}>
                          <Text style={[styles.priorityText, { color: pr.text }]}>{task.priority ?? 'medium'}</Text>
                        </View>
                        {task.dueDate ? <Text style={styles.dueDate}>{task.dueDate}</Text> : null}
                      </View>
                      {task.assignedTo && (
                        <View style={styles.assigneeRow}>
                          <View style={styles.assigneeAvatar}><Text style={styles.assigneeInitial}>{task.assignedTo.fullName.charAt(0).toUpperCase()}</Text></View>
                          <Text style={styles.assigneeName} numberOfLines={1}>{task.assignedTo.fullName}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity style={styles.addTaskBtn} onPress={() => setTaskDialog({ ...EMPTY_TASK, open: true, columnId: col.id })}>
                <Text style={styles.addTaskText}>+ Add task</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addColumn} onPress={() => setColDialog({ ...EMPTY_COL, open: true })}>
            <Text style={styles.addColumnText}>+ Add column</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Column dialog */}
      <Modal visible={colDialog.open} animationType="fade" transparent onRequestClose={() => setColDialog(EMPTY_COL)}>
        <View style={styles.modalBg}>
          <View style={styles.smallModalCard}>
            <Text style={styles.modalTitle}>{colDialog.mode === 'add' ? 'Add Column' : 'Rename Column'}</Text>
            <TextInput style={styles.input} value={colDialog.name} onChangeText={v => setColDialog(d => ({ ...d, name: v }))} placeholder="e.g. In Review" placeholderTextColor="#999" autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setColDialog(EMPTY_COL)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => saveColumnMut.mutate()} disabled={!colDialog.name.trim() || saveColumnMut.isPending}>
                {saveColumnMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{colDialog.mode === 'add' ? 'Add' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Task dialog */}
      <Modal visible={taskDialog.open} animationType="slide" transparent onRequestClose={() => setTaskDialog(EMPTY_TASK)}>
        <View style={styles.modalBg}>
          <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: 12 }}>
            <Text style={styles.modalTitle}>{taskDialog.mode === 'add' ? 'Add Task' : 'Edit Task'}</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={taskDialog.title} onChangeText={v => setTaskDialog(d => ({ ...d, title: v }))} placeholder="Task title" placeholderTextColor="#999" />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={taskDialog.description} onChangeText={v => setTaskDialog(d => ({ ...d, description: v }))} placeholder="Optional details…" placeholderTextColor="#999" multiline />

            <Text style={styles.label}>Priority</Text>
            <View style={styles.chips}>
              {PRIORITIES.map(p => (
                <TouchableOpacity key={p} style={[styles.chip, taskDialog.priority === p && styles.chipActive]} onPress={() => setTaskDialog(d => ({ ...d, priority: p }))}>
                  <Text style={[styles.chipText, taskDialog.priority === p && styles.chipTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <DatePicker
              label="Due Date"
              value={taskDialog.dueDate}
              onDateChange={v => setTaskDialog(d => ({ ...d, dueDate: v }))}
              placeholder="Select due date"
            />

            <Text style={styles.label}>Assign To</Text>
            <InlinePicker options={staffOptions} value={taskDialog.assignedToId} onSelect={v => setTaskDialog(d => ({ ...d, assignedToId: v }))} placeholder="Unassigned" />

            <View style={styles.modalActions}>
              {taskDialog.mode === 'edit' && (
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteTask}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTaskDialog(EMPTY_TASK)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => saveTaskMut.mutate()} disabled={!taskDialog.title.trim() || saveTaskMut.isPending}>
                {saveTaskMut.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>{taskDialog.mode === 'add' ? 'Add' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Move task modal */}
      <Modal visible={!!moveTask} animationType="fade" transparent onRequestClose={() => setMoveTask(null)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setMoveTask(null)}>
          <View style={styles.smallModalCard}>
            <Text style={styles.modalTitle}>Move "{moveTask?.task.title}" to…</Text>
            {kanban.filter(c => c.id !== moveTask?.fromColId).map(c => (
              <TouchableOpacity key={c.id} style={styles.moveOption} onPress={() => moveTaskMut.mutate({ taskId: moveTask.task.id, columnId: c.id })}>
                <Text style={styles.moveOptionText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 10 }]} onPress={() => setMoveTask(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee', gap: 8 },
  heading: { fontSize: 18, fontFamily: 'Outfit-Bold', color: '#111' },
  empty: { textAlign: 'center', color: '#999', fontFamily: 'Outfit-Regular', marginTop: 40 },
  board: { padding: 12, gap: 12, alignItems: 'flex-start' },
  column: { width: 260, backgroundColor: '#eef1f5', borderRadius: 12, marginRight: 12, maxHeight: '100%' },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#e2e5ea' },
  colTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#1f2937', flex: 1 },
  colCount: { backgroundColor: '#d1d5db', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 },
  colCountText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', color: '#4b5563' },
  colMenuBtn: { padding: 4 },
  colMenuDots: { fontSize: 16, color: '#9ca3af', fontFamily: 'Outfit-Bold' },
  colTasks: { paddingHorizontal: 8, paddingTop: 8, maxHeight: 460 },
  taskCard: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 8 },
  taskTitle: { fontSize: 13, fontFamily: 'Outfit-SemiBold', color: '#1f2937' },
  taskDesc: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', marginTop: 4 },
  taskMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  priorityBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  priorityText: { fontSize: 10, fontFamily: 'Outfit-SemiBold', textTransform: 'capitalize' },
  dueDate: { fontSize: 10, fontFamily: 'Outfit-Regular', color: '#9ca3af' },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  assigneeAvatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  assigneeInitial: { fontSize: 9, fontFamily: 'Outfit-Bold', color: '#1e40af' },
  assigneeName: { fontSize: 11, fontFamily: 'Outfit-Regular', color: '#6b7280', flexShrink: 1 },
  addTaskBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  addTaskText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#6b7280' },
  addColumn: { width: 220, borderWidth: 2, borderStyle: 'dashed', borderColor: '#d1d5db', borderRadius: 12, paddingVertical: 30, alignItems: 'center', justifyContent: 'center' },
  addColumnText: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#9ca3af' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  smallModalCard: { backgroundColor: '#fff', borderRadius: 16, margin: 20, padding: 20, alignSelf: 'center', width: '85%' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', color: '#111', marginBottom: 14 },
  label: { fontSize: 13, fontFamily: 'Outfit-Medium', color: '#444', marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111', marginBottom: 12 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f4f6f9', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontFamily: 'Outfit-Medium', color: '#555' },
  chipTextActive: { color: '#fff' },
  moveOption: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  moveOptionText: { fontSize: 14, fontFamily: 'Outfit-Regular', color: '#111' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontFamily: 'Outfit-Medium', color: '#6B7280' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontFamily: 'Outfit-SemiBold', color: '#fff' },
  deleteBtn: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
  deleteText: { fontFamily: 'Outfit-SemiBold', color: '#dc2626' },
});
