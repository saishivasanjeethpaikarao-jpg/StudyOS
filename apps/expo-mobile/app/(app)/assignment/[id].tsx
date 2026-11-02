import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, addDays } from 'date-fns';
import { useAssignment, useCompleteStudySession, useStudyPlan, useStudyProgress, useStudySessions } from '@/hooks/useStudyOS';
import { getApi } from '@/lib/api';
import { newClientId } from '@/lib/ids';
import { SyncBanner } from '@/components/SyncBanner';
import { formatInZone } from '@/lib/date';
import { openClockAlarm } from '@/lib/alarms';

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const assignmentId = String(id);
  const { data: assignment, isLoading } = useAssignment(assignmentId);
  const { data: progress } = useStudyProgress(assignmentId);
  const { data: sessions = [], refetch } = useStudySessions(assignmentId);
  const planner = useStudyPlan();
  const completeSession = useCompleteStudySession();
  const [showPlanner, setShowPlanner] = useState(false);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof planner.mutateAsync>>['preview'] | null>(null);
  const [preferredMinutes, setPreferredMinutes] = useState(40);

  const planInput = useMemo(() => ({
    targetMinutes: assignment?.estimatedMinutes ?? undefined,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: assignment ? format(addDays(assignment.dueAt, -1), 'yyyy-MM-dd') : format(addDays(new Date(), 3), 'yyyy-MM-dd'),
    preferredSessionMinutes: preferredMinutes,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  }), [assignment, preferredMinutes]);

  if (isLoading || !assignment) return <SafeAreaView style={styles.container}><ActivityIndicator color="#7c3aed" style={{ marginTop: 60 }} /></SafeAreaView>;
  const runPreview = async () => {
    try { const result = await planner.mutateAsync({ assignmentId, input: planInput }); setPreview(result.preview); setShowPlanner(true); }
    catch (error) { Alert.alert('Could not preview plan', error instanceof Error ? error.message : 'Try again'); }
  };
  const confirm = async () => {
    if (!preview?.confirmable) return;
    try {
      const result = await getApi().assignments.confirmStudyPlan(assignmentId, { clientMutationId: newClientId(), assignmentRevision: preview.assignmentRevision, availabilityFingerprint: preview.availabilityFingerprint, normalizedInput: preview.normalizedInput, proposedSlots: preview.proposedSlots });
      setShowPlanner(false); setPreview(null); void refetch(); Alert.alert('Plan saved', `${result.sessions.length} study sessions added to your plan.`);
    } catch (error) { Alert.alert('Plan changed', error instanceof Error ? error.message : 'Refresh and preview again'); }
  };
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <SyncBanner />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>ASSIGNMENT</Text><Text style={styles.title}>{assignment.title}</Text><Text style={styles.due}>Due {format(assignment.dueAt, 'EEE, MMM d · h:mm a')}</Text>
        {assignment.description ? <Text style={styles.description}>{assignment.description}</Text> : null}
        <View style={styles.progressCard}><View><Text style={styles.progressLabel}>Study progress</Text><Text style={styles.progressNumber}>{progress?.studiedMinutes ?? assignment.completedMinutes} <Text style={styles.progressUnit}>/ {assignment.estimatedMinutes ?? '—'} min</Text></Text></View><View style={styles.progressRing}><Text style={styles.progressRingText}>{assignment.estimatedMinutes ? `${Math.round(((progress?.studiedMinutes ?? 0) / assignment.estimatedMinutes) * 100)}%` : '—'}</Text></View></View>
        <TouchableOpacity style={styles.planButton} onPress={() => void runPreview()}><Text style={styles.planButtonText}>Plan study</Text><Text style={styles.planButtonHint}>Preview calm, focused sessions</Text></TouchableOpacity>
        <Text style={styles.sectionTitle}>Study sessions</Text>
        {sessions.length === 0 ? <Text style={styles.muted}>No sessions yet. Plan a little time to get started.</Text> : sessions.map((session) => <View key={session.id} style={styles.session}><TouchableOpacity style={{ flex: 1 }} onPress={async () => { const result = await openClockAlarm(session.startAt, assignment.title, session.timezone); Alert.alert(result === 'opened' ? 'Clock opened' : 'Clock unavailable', result === 'opened' ? 'Confirm the alarm in your Android Clock app.' : 'StudyOS will keep this as an in-app session reminder.'); }}><Text style={styles.sessionDate}>{formatInZone(session.startAt, session.timezone, { weekday: 'short', month: 'short', day: 'numeric' })}</Text><Text style={styles.sessionTime}>{formatInZone(session.startAt, session.timezone, { hour: 'numeric', minute: '2-digit' })} · {session.plannedMinutes} min</Text></TouchableOpacity>{session.status === 'planned' ? <TouchableOpacity onPress={() => void completeSession.mutateAsync({ session }).then(() => void refetch()).catch((error) => Alert.alert('Could not complete', error instanceof Error ? error.message : 'Try again'))}><Text style={styles.complete}>Complete</Text></TouchableOpacity> : <Text style={[styles.status, session.status === 'completed' && styles.statusDone]}>{session.status}</Text>}</View>)}
        <View style={styles.links}><Link href={{ pathname: '/(app)/resources', params: { assignmentId } }} asChild><TouchableOpacity style={styles.linkCard}><Text style={styles.linkIcon}>↗</Text><Text style={styles.linkText}>Resources</Text></TouchableOpacity></Link><Link href={{ pathname: '/(app)/notes', params: { assignmentId } }} asChild><TouchableOpacity style={styles.linkCard}><Text style={styles.linkIcon}>✎</Text><Text style={styles.linkText}>Notes</Text></TouchableOpacity></Link><Link href="/(app)/quizzes" asChild><TouchableOpacity style={styles.linkCard}><Text style={styles.linkIcon}>✓</Text><Text style={styles.linkText}>Knowledge checks</Text></TouchableOpacity></Link></View>
      </ScrollView>
      {showPlanner && preview ? <View style={styles.modalBackdrop}><View style={styles.modal}><Text style={styles.modalTitle}>Preview your plan</Text><Text style={styles.muted}>{preview.plannedMinutes} minutes across {preview.proposedSlots.length} sessions</Text><View style={styles.segment}><TouchableOpacity onPress={() => setPreferredMinutes(25)} style={[styles.segmentItem, preferredMinutes === 25 && styles.segmentSelected]}><Text>25m</Text></TouchableOpacity><TouchableOpacity onPress={() => setPreferredMinutes(40)} style={[styles.segmentItem, preferredMinutes === 40 && styles.segmentSelected]}><Text>40m</Text></TouchableOpacity><TouchableOpacity onPress={() => setPreferredMinutes(60)} style={[styles.segmentItem, preferredMinutes === 60 && styles.segmentSelected]}><Text>60m</Text></TouchableOpacity></View>{preview.proposedSlots.map((slot) => <View key={slot.startAt} style={styles.slot}><Text style={styles.slotDay}>{format(new Date(slot.startAt), 'EEE, MMM d')}</Text><Text style={styles.slotTime}>{format(new Date(slot.startAt), 'h:mm a')} · {slot.plannedMinutes} min</Text></View>)}{preview.unscheduledMinutes > 0 && <Text style={styles.warning}>{preview.unscheduledMinutes} minutes do not fit before the deadline.</Text>}<View style={styles.actions}><TouchableOpacity onPress={() => { setShowPlanner(false); setPreview(null); }}><Text style={styles.cancel}>Close</Text></TouchableOpacity><TouchableOpacity style={[styles.save, !preview.confirmable && styles.disabled]} disabled={!preview.confirmable} onPress={() => void confirm()}><Text style={styles.saveText}>Confirm plan</Text></TouchableOpacity></View></View></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  eyebrow: { color: '#7c3aed', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#172033', fontSize: 29, fontWeight: '800', marginTop: 6, lineHeight: 35 },
  due: { color: '#64748b', marginTop: 8 },
  description: { color: '#475569', lineHeight: 21, marginTop: 18 },
  progressCard: { backgroundColor: '#21134f', borderRadius: 18, padding: 20, marginTop: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: '#ddd6fe', fontSize: 13, fontWeight: '700' },
  progressNumber: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 5 },
  progressUnit: { color: '#c4b5fd', fontSize: 16, fontWeight: '600' },
  progressRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 6, borderColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  progressRingText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  planButton: { backgroundColor: '#f97316', borderRadius: 16, padding: 17, marginTop: 14 },
  planButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  planButtonHint: { color: '#ffedd5', fontSize: 12, marginTop: 4 },
  sectionTitle: { color: '#172033', fontSize: 18, fontWeight: '800', marginTop: 28, marginBottom: 11 },
  muted: { color: '#64748b', lineHeight: 20 },
  session: { backgroundColor: '#fff', borderRadius: 14, padding: 15, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionDate: { color: '#172033', fontWeight: '800' },
  sessionTime: { color: '#64748b', fontSize: 13, marginTop: 4 },
  status: { color: '#7c3aed', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  statusDone: { color: '#16a34a' },
  complete: { color: '#16a34a', fontWeight: '800', fontSize: 12 },
  links: { flexDirection: 'row', gap: 8, marginTop: 18 },
  linkCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 13, minHeight: 76 },
  linkIcon: { color: '#f97316', fontSize: 20 },
  linkText: { color: '#334155', fontSize: 12, fontWeight: '800', marginTop: 8 },
  modalBackdrop: { position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34 },
  modalTitle: { color: '#172033', fontSize: 22, fontWeight: '800', marginBottom: 3 },
  segment: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 10, padding: 4, marginTop: 18 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 7 },
  segmentSelected: { backgroundColor: '#fff' },
  slot: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 11 },
  slotDay: { color: '#334155', fontWeight: '700' },
  slotTime: { color: '#64748b' },
  warning: { color: '#b45309', backgroundColor: '#fffbeb', padding: 10, borderRadius: 8, marginTop: 11, fontSize: 13 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20, marginTop: 20 },
  cancel: { color: '#64748b', fontWeight: '700' },
  save: { backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  disabled: { opacity: 0.45 },
  saveText: { color: '#fff', fontWeight: '800' },
});
