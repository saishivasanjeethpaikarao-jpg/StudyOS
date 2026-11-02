import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { format } from 'date-fns';
import { useAssignments, useCreateAssignment, useCreateSubject, useSubjects } from '@/hooks/useStudyOS';
import { SyncBanner } from '@/components/SyncBanner';

export default function AssignmentsScreen() {
  const { data: assignments = [], isLoading, refetch } = useAssignments();
  const { data: subjects = [] } = useSubjects();
  const createAssignment = useCreateAssignment();
  const createSubject = useCreateSubject();
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState<string | undefined>();
  const [newSubject, setNewSubject] = useState('');

  const submit = async () => {
    if (!title.trim()) return;
    try {
      let selectedSubject = subjectId;
      if (!selectedSubject && newSubject.trim()) selectedSubject = (await createSubject.mutateAsync({ name: newSubject.trim() })).id;
      await createAssignment.mutateAsync({ title: title.trim(), subjectId: selectedSubject ?? null, dueAt: new Date(Date.now() + 7 * 86400000).toISOString(), estimatedMinutes: 60 });
      setTitle(''); setNewSubject(''); setSubjectId(undefined); setShowNew(false); void refetch();
    } catch (error) { Alert.alert('Could not save assignment', error instanceof Error ? error.message : 'Try again'); }
  };
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <SyncBanner />
      <View style={styles.header}><View><Text style={styles.eyebrow}>LEARN</Text><Text style={styles.title}>Assignments</Text><Text style={styles.subtitle}>Keep every deadline in one calm place.</Text></View><TouchableOpacity style={styles.add} onPress={() => setShowNew(true)}><Text style={styles.addText}>+</Text></TouchableOpacity></View>
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={() => void refetch()}
        ListEmptyComponent={!isLoading ? <View style={styles.empty}><Text style={styles.emptyTitle}>Nothing due yet</Text><Text style={styles.subtitle}>Add your first assignment to start planning study time.</Text></View> : null}
        renderItem={({ item }) => {
          const subject = subjects.find((candidate) => candidate.id === item.subjectId);
          return <Link href={{ pathname: '/(app)/assignment/[id]', params: { id: item.id } }} asChild><TouchableOpacity style={styles.card}><View style={styles.cardTop}><Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text><Text style={styles.chevron}>›</Text></View><Text style={styles.meta}>{subject?.name ?? 'General'} · Due {format(item.dueAt, 'MMM d')}</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, item.estimatedMinutes ? item.completedMinutes / item.estimatedMinutes * 100 : 0)}%` }]} /></View><Text style={styles.progress}>{item.completedMinutes} of {item.estimatedMinutes ?? '—'} minutes recorded</Text></TouchableOpacity></Link>;
        }}
      />
      <Modal visible={showNew} animationType="slide" transparent onRequestClose={() => setShowNew(false)}><View style={styles.modalBackdrop}><View style={styles.modal}><Text style={styles.modalTitle}>New assignment</Text><TextInput style={styles.input} placeholder="What do you need to do?" value={title} onChangeText={setTitle} autoFocus /><Text style={styles.inputLabel}>Subject (optional)</Text><View style={styles.subjects}>{subjects.slice(0, 4).map((subject) => <TouchableOpacity key={subject.id} onPress={() => setSubjectId(subject.id)} style={[styles.chip, subject.id === subjectId && styles.chipSelected]}><Text style={[styles.chipText, subject.id === subjectId && styles.chipTextSelected]}>{subject.name}</Text></TouchableOpacity>)}</View><TextInput style={styles.input} placeholder="Or add a new subject" value={newSubject} onChangeText={setNewSubject} /><View style={styles.actions}><TouchableOpacity onPress={() => setShowNew(false)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.save} onPress={() => void submit()}><Text style={styles.saveText}>Save assignment</Text></TouchableOpacity></View></View></View></Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#172033', fontSize: 27, fontWeight: '800', marginTop: 4 },
  subtitle: { color: '#64748b', marginTop: 5, lineHeight: 20 },
  add: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
  list: { padding: 16, paddingTop: 6, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 9, elevation: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitle: { color: '#172033', fontSize: 17, fontWeight: '800', flex: 1, lineHeight: 22 },
  chevron: { color: '#a78bfa', fontSize: 27, lineHeight: 24, paddingLeft: 12 },
  meta: { color: '#64748b', fontSize: 13, marginTop: 8 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#ede9fe', marginTop: 13, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#f97316', borderRadius: 3 },
  progress: { color: '#64748b', fontSize: 12, marginTop: 7 },
  empty: { backgroundColor: '#fff', padding: 24, borderRadius: 16, marginTop: 8 },
  emptyTitle: { color: '#172033', fontSize: 19, fontWeight: '800', marginBottom: 6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34 },
  modalTitle: { color: '#172033', fontSize: 22, fontWeight: '800', marginBottom: 18 },
  inputLabel: { color: '#475569', fontWeight: '700', fontSize: 13, marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, color: '#172033', backgroundColor: '#f8fafc' },
  subjects: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 13 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f1f5f9' },
  chipSelected: { backgroundColor: '#ede9fe' },
  chipText: { color: '#64748b', fontSize: 13, fontWeight: '700' },
  chipTextSelected: { color: '#6d28d9' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20, marginTop: 22 },
  cancel: { color: '#64748b', fontWeight: '700' },
  save: { backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  saveText: { color: '#fff', fontWeight: '800' },
});
