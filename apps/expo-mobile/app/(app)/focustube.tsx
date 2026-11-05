import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Link } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApi } from '@/lib/api';
import type { LearningResource } from '@open-sunsama/types';
import { SyncBanner } from '@/components/SyncBanner';
import { useAccountSync } from '@/lib/sync';
import { newClientId } from '@/lib/ids';

interface TimestampNote {
  id: string;
  timestamp: string;
  seconds: number;
  text: string;
  createdAt: string;
}

const STARTER_VIDEOS = [
  { id: 'starter-1', videoId: 'zOjov-2OZ0E', title: 'Harvard CS50 2024 - Lecture 0', channel: 'CS50' },
  { id: 'starter-2', videoId: '7UJ4C_R643s', title: 'MIT 18.06 Linear Algebra - Lecture 1', channel: 'MIT OpenCourseWare' },
  { id: 'starter-3', videoId: 'ukZ-4Sj3v3M', title: 'How to Study Effectively with Active Recall', channel: 'Ali Abdaal' },
  { id: 'starter-4', videoId: 'P3OX617oQjE', title: 'Organic Chemistry Introduction', channel: 'Organic Chemistry Tutor' },
];

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

export default function FocusTubeScreen() {
  const params = useLocalSearchParams<{ videoId?: string }>();
  const sync = useAccountSync();

  const [resources, setResources] = useState<LearningResource[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string>('zOjov-2OZ0E');
  const [activeTitle, setActiveTitle] = useState<string>('Harvard CS50 2024 - Lecture 0');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);

  // Add video state
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');

  // Note state
  const [noteTimestamp, setNoteTimestamp] = useState('00:00');
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<TimestampNote[]>([]);

  // Load user saved youtube resources
  const loadResources = async () => {
    try {
      const all = await getApi().resources.list({});
      const ytResources = all.filter((r) => r.type === 'youtube');
      setResources(ytResources);
      if (params.videoId) {
        setActiveVideoId(params.videoId);
      } else if (ytResources.length > 0) {
        const first = ytResources[0];
        const vidId = first.providerItemId || extractYouTubeId(first.url || '');
        if (vidId) {
          setActiveVideoId(vidId);
          setActiveTitle(first.title);
        }
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    void loadResources();
  }, [params.videoId]);

  // Load timestamped notes for the active video
  useEffect(() => {
    async function fetchNotes() {
      try {
        const stored = await AsyncStorage.getItem(`studyos:focustube:notes:${activeVideoId}`);
        if (stored) {
          setNotes(JSON.parse(stored) as TimestampNote[]);
        } else {
          setNotes([]);
        }
      } catch {
        setNotes([]);
      }
    }
    void fetchNotes();
  }, [activeVideoId]);

  const saveNotesToStorage = async (updatedNotes: TimestampNote[]) => {
    setNotes(updatedNotes);
    try {
      await AsyncStorage.setItem(
        `studyos:focustube:notes:${activeVideoId}`,
        JSON.stringify(updatedNotes)
      );
    } catch {
      // Storage error fallback
    }
  };

  const handleAddVideo = async () => {
    const extracted = extractYouTubeId(inputUrl.trim());
    if (!extracted) {
      Alert.alert('Invalid URL', 'Please enter a valid YouTube video link.');
      return;
    }
    const finalTitle = inputTitle.trim() || `YouTube Lecture (${extracted})`;
    try {
      const id = newClientId();
      await sync.enqueueMutation({
        entityType: 'resource',
        operation: 'create',
        entityId: id,
        payload: {
          type: 'youtube',
          title: finalTitle,
          url: `https://www.youtube.com/watch?v=${extracted}`,
          providerItemId: extracted,
        },
      });

      const newResource = {
        id,
        userId: 'pending',
        type: 'youtube',
        title: finalTitle,
        url: `https://www.youtube.com/watch?v=${extracted}`,
        providerItemId: extracted,
        storageKey: null,
        mimeType: null,
        filename: null,
        sizeBytes: null,
        completedAt: null,
        revision: 1,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as LearningResource;

      setResources((current) => [newResource, ...current]);
      setActiveVideoId(extracted);
      setActiveTitle(finalTitle);
      setInputUrl('');
      setInputTitle('');
      setShowAddModal(false);
      Alert.alert('Video Added', 'Synchronized to your StudyOS library across Web, Desktop & Mobile.');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not add video.');
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    Alert.alert('Delete Video', 'Remove this video from your FocusTube library?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await sync.enqueueMutation({
              entityType: 'resource',
              operation: 'delete',
              entityId: resourceId,
            });
            setResources((prev) => prev.filter((r) => r.id !== resourceId));
          } catch {
            Alert.alert('Error', 'Could not delete resource.');
          }
        },
      },
    ]);
  };

  const parseTimestampToSeconds = (ts: string): number => {
    const parts = ts.split(':').map((p) => parseInt(p, 10) || 0);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    const seconds = parseTimestampToSeconds(noteTimestamp);
    const newNote: TimestampNote = {
      id: newClientId(),
      timestamp: noteTimestamp.trim() || '00:00',
      seconds,
      text: noteText.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newNote, ...notes];
    await saveNotesToStorage(updated);
    setNoteText('');
    setNoteTimestamp('00:00');
    setShowNoteModal(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    const updated = notes.filter((n) => n.id !== noteId);
    await saveNotesToStorage(updated);
  };

  const openDistractionFree = () => {
    // Open in clean, distraction-free YouTube embed URL
    const embedUrl = `https://www.youtube-nocookie.com/embed/${activeVideoId}?rel=0&modestbranding=1`;
    void Linking.openURL(embedUrl);
  };

  const openAtTimestamp = (seconds: number) => {
    const url = `https://youtu.be/${activeVideoId}?t=${seconds}`;
    void Linking.openURL(url);
  };

  const activeThumbnail = `https://img.youtube.com/vi/${activeVideoId}/hqdefault.jpg`;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <SyncBanner />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>ACADEMIC VIDEO LEARNING</Text>
            <Text style={styles.title}>FocusTube 📺</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addBtnText}>+ Add Video</Text>
          </TouchableOpacity>
        </View>

        {/* Active Player Preview Card */}
        <View style={styles.playerCard}>
          <Image
            source={{ uri: activeThumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
          <View style={styles.playerInfo}>
            <Text style={styles.badge}>ACTIVE LESSON</Text>
            <Text style={styles.videoTitle} numberOfLines={2}>
              {activeTitle}
            </Text>

            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.primaryPlayBtn} onPress={openDistractionFree}>
                <Text style={styles.primaryPlayText}>▶ Watch Focus Mode</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => void Linking.openURL(`https://youtu.be/${activeVideoId}`)}
              >
                <Text style={styles.secondaryBtnText}>YouTube App</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.actionPill}
                onPress={() => setShowNoteModal(true)}
              >
                <Text style={styles.actionPillText}>📝 Take Note</Text>
              </TouchableOpacity>

              <Link href="/(app)/quizzes" asChild>
                <TouchableOpacity style={styles.actionPill}>
                  <Text style={styles.actionPillText}>⚡ Quiz Me</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>

        {/* Timestamped Notes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Timestamped Notes ({notes.length})</Text>
            <TouchableOpacity onPress={() => setShowNoteModal(true)}>
              <Text style={styles.linkText}>+ Add Note</Text>
            </TouchableOpacity>
          </View>

          {notes.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No notes for this lecture yet.</Text>
              <Text style={styles.emptySubtext}>
                Tap &apos;Take Note&apos; to bookmark key moments with clickable timestamps.
              </Text>
            </View>
          ) : (
            notes.map((item) => (
              <View key={item.id} style={styles.noteItem}>
                <TouchableOpacity
                  style={styles.stampBadge}
                  onPress={() => openAtTimestamp(item.seconds)}
                >
                  <Text style={styles.stampText}>⏱ {item.timestamp}</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.noteContent}>{item.text}</Text>
                </View>
                <TouchableOpacity onPress={() => void handleDeleteNote(item.id)}>
                  <Text style={styles.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* User Saved Lectures Shelf */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Saved Videos ({resources.length})
          </Text>

          {resources.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Your personal library is empty.</Text>
              <Text style={styles.emptySubtext}>
                Add lecture URLs to build your distraction-free course playlist.
              </Text>
            </View>
          ) : (
            resources.map((item) => {
              const vidId = item.providerItemId || extractYouTubeId(item.url || '');
              const thumb = vidId
                ? `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`
                : undefined;
              return (
                <View key={item.id} style={styles.shelfCard}>
                  {thumb && (
                    <Image source={{ uri: thumb }} style={styles.shelfThumb} />
                  )}
                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={styles.shelfTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={styles.shelfActions}>
                      <TouchableOpacity
                        onPress={() => {
                          if (vidId) {
                            setActiveVideoId(vidId);
                            setActiveTitle(item.title);
                          }
                        }}
                      >
                        <Text style={styles.selectAction}>Select</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => void handleDeleteResource(item.id)}
                      >
                        <Text style={styles.deleteAction}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Curated Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Curated Academic Starter Lectures</Text>
          {STARTER_VIDEOS.map((starter) => (
            <TouchableOpacity
              key={starter.id}
              style={styles.curatedCard}
              onPress={() => {
                setActiveVideoId(starter.videoId);
                setActiveTitle(starter.title);
              }}
            >
              <Image
                source={{ uri: `https://img.youtube.com/vi/${starter.videoId}/hqdefault.jpg` }}
                style={styles.curatedThumb}
              />
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Text style={styles.curatedTitle} numberOfLines={2}>
                  {starter.title}
                </Text>
                <Text style={styles.curatedMeta}>{starter.channel}</Text>
              </View>
              <Text style={styles.curatedPlay}>▶</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Modal: Add YouTube Video */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add YouTube Lecture</Text>
            <Text style={styles.label}>Lecture URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://www.youtube.com/watch?v=..."
              value={inputUrl}
              onChangeText={setInputUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text style={styles.label}>Custom Title (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chapter 4: Neural Networks"
              value={inputTitle}
              onChangeText={setInputTitle}
            />
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.save} onPress={() => void handleAddVideo()}>
                <Text style={styles.saveText}>Save to Library</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Timestamped Note */}
      <Modal visible={showNoteModal} animationType="slide" transparent onRequestClose={() => setShowNoteModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Timestamp Note</Text>
            <Text style={styles.label}>Timestamp (MM:SS)</Text>
            <TextInput
              style={styles.input}
              placeholder="04:15"
              value={noteTimestamp}
              onChangeText={setNoteTimestamp}
              autoCapitalize="none"
            />
            <Text style={styles.label}>Study Note</Text>
            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder="Key insight, formula or question..."
              value={noteText}
              onChangeText={setNoteText}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.save} onPress={() => void handleSaveNote()}>
                <Text style={styles.saveText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eyebrow: { color: '#ef4444', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: '#f8fafc', fontSize: 26, fontWeight: '800', marginTop: 2 },
  addBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  playerCard: {
    backgroundColor: '#151d2f',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  thumbnail: { width: '100%', height: 190 },
  playerInfo: { padding: 16 },
  badge: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  videoTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
    lineHeight: 24,
  },
  controlsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  primaryPlayBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryPlayText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  secondaryBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: '#cbd5e1', fontWeight: '700', fontSize: 13 },
  quickActionsRow: { flexDirection: 'row', gap: 10 },
  actionPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionPillText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  linkText: { color: '#38bdf8', fontSize: 13, fontWeight: '600' },
  emptyCard: {
    backgroundColor: '#151d2f',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyText: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
  emptySubtext: { color: '#64748b', fontSize: 12, marginTop: 4, lineHeight: 18 },
  noteItem: {
    backgroundColor: '#151d2f',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  stampBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stampText: { color: '#ef4444', fontWeight: '800', fontSize: 12 },
  noteContent: { color: '#e2e8f0', fontSize: 13, lineHeight: 18 },
  deleteText: { color: '#64748b', fontSize: 14, paddingHorizontal: 6 },
  shelfCard: {
    backgroundColor: '#151d2f',
    borderRadius: 12,
    flexDirection: 'row',
    padding: 10,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  shelfThumb: { width: 80, height: 50, borderRadius: 6 },
  shelfTitle: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
  shelfActions: { flexDirection: 'row', gap: 14, marginTop: 6 },
  selectAction: { color: '#38bdf8', fontSize: 12, fontWeight: '700' },
  deleteAction: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  curatedCard: {
    backgroundColor: '#151d2f',
    borderRadius: 12,
    flexDirection: 'row',
    padding: 10,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  curatedThumb: { width: 70, height: 45, borderRadius: 6 },
  curatedTitle: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  curatedMeta: { color: '#64748b', fontSize: 11, marginTop: 2 },
  curatedPlay: { color: '#ef4444', fontSize: 16, paddingRight: 6 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#151d2f',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: '#1e293b',
  },
  modalTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 14 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    color: '#f8fafc',
    fontSize: 14,
    marginBottom: 12,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8 },
  cancel: { color: '#94a3b8', fontWeight: '700', paddingVertical: 10 },
  save: { backgroundColor: '#dc2626', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  saveText: { color: '#fff', fontWeight: '800' },
});
