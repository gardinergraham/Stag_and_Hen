import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, getEventTheme } from '../theme';
import { Button, Card, TextInput } from '../components';
import { useApp } from '../context/AppContext';
import { daresApi } from '../services/api';

const dareDecks = {
  warmup: [
    'Nominate someone to tell the funniest story about the guest of honour.',
    'Take a group selfie with three people pulling their worst serious face.',
    'Swap seats with someone and copy their laugh for one round.',
    'Choose someone to give a one-minute best-man or maid-of-honour speech.',
  ],
  photo: [
    'Recreate a movie poster with the crew and upload it to the gallery.',
    'Find something that matches the party colour and take a photo with it.',
    'Take a “before the chaos” photo with everyone currently in the room.',
    'Get a photo of the guest of honour doing their best catalogue pose.',
  ],
  cheeky: [
    'Let the group choose your next selfie pose.',
    'Give someone a harmless nickname that must stick for the next hour.',
    'Convince a stranger or staff member to give the group a party rating out of 10.',
    'Speak only in dramatic movie-trailer voice until your next turn.',
  ],
  drinks: [
    'Most likely to miss the taxi takes two sips.',
    'Never have I ever: forgotten someone’s name during a night out.',
    'Everyone who has known the guest of honour for more than five years takes a sip.',
    'Choose a Rule Master. Anyone who breaks their rule takes a sip.',
  ],
};

const categories = [
  { id: 'warmup', title: 'Warm Up', icon: 'sparkles' },
  { id: 'photo', title: 'Photo Dare', icon: 'camera' },
  { id: 'cheeky', title: 'Cheeky', icon: 'happy' },
  { id: 'drinks', title: 'Drinks', icon: 'beer' },
];

const DaresScreen = ({ navigation }) => {
  const { session, isOwner } = useApp();
  const theme = getEventTheme(session?.event_type);
  const [selectedCategory, setSelectedCategory] = useState('warmup');
  const [customDares, setCustomDares] = useState([]);
  const [currentDare, setCurrentDare] = useState({ text: dareDecks.warmup[0], category: 'warmup', source: 'built-in' });
  const [completed, setCompleted] = useState([]);
  const [manageVisible, setManageVisible] = useState(false);
  const [newDareText, setNewDareText] = useState('');
  const [newDareCategory, setNewDareCategory] = useState('warmup');
  const [savingDare, setSavingDare] = useState(false);

  const loadCustomDares = async () => {
    if (session?.is_preview || !session?.event_id) return;
    try {
      const response = await daresApi.getDares(session.event_id, session.event_type);
      setCustomDares(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log('Could not load custom dares:', error?.response?.data || error.message);
    }
  };

  useEffect(() => {
    loadCustomDares();
  }, [session?.event_id, session?.event_type]);

  const spinDare = (categoryId = selectedCategory) => {
    const deck = [
      ...(dareDecks[categoryId] || dareDecks.warmup).map((text) => ({
        text,
        category: categoryId,
        source: 'built-in',
      })),
      ...customDares
        .filter((dare) => dare.category === categoryId)
        .map((dare) => ({ ...dare, source: dare.event_id ? 'owner' : 'admin' })),
    ];
    const nextDare = deck[Math.floor(Math.random() * deck.length)];
    setSelectedCategory(categoryId);
    setCurrentDare(nextDare);
  };

  const completeDare = () => {
    setCompleted((current) => [currentDare.text, ...current.filter((dare) => dare !== currentDare.text)].slice(0, 5));
    Alert.alert('Dare Complete', 'Nice. Add photo proof to the gallery if it deserves to live forever.');
  };

  const saveOwnerDare = async () => {
    if (!newDareText.trim()) {
      Alert.alert('Dare Needed', 'Add the dare text first.');
      return;
    }

    setSavingDare(true);
    try {
      await daresApi.create(
        {
          text: newDareText.trim(),
          category: newDareCategory,
          event_type: session?.event_type || 'all',
          event_id: session?.event_id,
        },
        session?.owner_pin
      );
      setNewDareText('');
      setNewDareCategory('warmup');
      await loadCustomDares();
      Alert.alert('Dare Added', 'Your crew can now spin this dare.');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Could not add this dare.');
    } finally {
      setSavingDare(false);
    }
  };

  const deleteOwnerDare = async (dare) => {
    Alert.alert('Delete Dare', 'Remove this event dare?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await daresApi.delete(dare.id, session?.owner_pin);
            await loadCustomDares();
          } catch (error) {
            Alert.alert('Error', error?.response?.data?.detail || 'Could not delete this dare.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { borderColor: theme.accent, shadowColor: theme.accent }]}>
          <View style={styles.heroText}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>Party Games</Text>
            <Text style={styles.title}>Dares & Challenges</Text>
            <Text style={styles.subtitle}>
              Quick cards for the crew when the night needs a little spark.
            </Text>
          </View>
          <Text style={styles.heroIcon}>{session?.event_type === 'stag' ? '🍻' : '💃'}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map((category) => {
            const active = selectedCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  active && {
                    borderColor: theme.accent,
                    backgroundColor: `${theme.accent}22`,
                  },
                ]}
                onPress={() => spinDare(category.id)}
              >
                <Ionicons
                  name={category.icon}
                  size={18}
                  color={active ? theme.accent : colors.textSecondary}
                />
                <Text style={[styles.categoryText, active && { color: theme.accent }]}>
                  {category.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Card style={[styles.dareCard, { borderColor: `${theme.accent}66` }]}>
          <Card.Content style={styles.dareContent}>
            <Text style={[styles.dareLabel, { color: theme.accent }]}>
              {categories.find((category) => category.id === selectedCategory)?.title}
            </Text>
            <Text style={styles.dareText}>{currentDare.text}</Text>
            <Text style={[styles.dareSource, { color: theme.accent }]}>
              {currentDare.source === 'owner'
                ? 'Owner dare'
                : currentDare.source === 'admin'
                ? 'Admin dare'
                : 'Built-in dare'}
            </Text>
            <View style={styles.dareActions}>
              <Button
                title="Spin Again"
                variant="outline"
                color={theme.accent}
                onPress={() => spinDare()}
                style={styles.dareButton}
              />
              <Button
                title="Completed"
                variant="primary"
                color={theme.accent}
                onPress={completeDare}
                style={styles.dareButton}
              />
            </View>
          </Card.Content>
        </Card>

        <View style={styles.secondaryActions}>
          {isOwner && (
            <TouchableOpacity
              style={[styles.photoProofButton, { borderColor: theme.accent, marginBottom: spacing.sm }]}
              onPress={() => setManageVisible(true)}
            >
              <Ionicons name="add-circle" size={20} color={theme.accent} />
              <Text style={[styles.photoProofText, { color: theme.accent }]}>Add Owner Dares</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.photoProofButton, { borderColor: theme.accent }]}
            onPress={() => navigation.navigate('Gallery')}
          >
            <Ionicons name="camera" size={20} color={theme.accent} />
            <Text style={[styles.photoProofText, { color: theme.accent }]}>Add Photo Proof</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recently Completed</Text>
        {completed.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Completed dares will show here.</Text>
          </View>
        ) : (
          completed.map((dare, index) => (
            <View key={`${dare}-${index}`} style={styles.completedRow}>
              <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
              <Text style={styles.completedText}>{dare}</Text>
            </View>
          ))
        )}

        {selectedCategory === 'drinks' && (
          <Text style={styles.drinkNote}>
            Keep drinking games optional and sensible. Water rounds count.
          </Text>
        )}
      </ScrollView>

      <Modal visible={manageVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Owner Dares</Text>
              <TouchableOpacity onPress={() => setManageVisible(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              label="New Dare"
              placeholder="e.g., Get a photo with someone wearing blue"
              value={newDareText}
              onChangeText={setNewDareText}
              multiline
              numberOfLines={3}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    newDareCategory === category.id && {
                      borderColor: theme.accent,
                      backgroundColor: `${theme.accent}22`,
                    },
                  ]}
                  onPress={() => setNewDareCategory(category.id)}
                >
                  <Text style={[styles.categoryText, newDareCategory === category.id && { color: theme.accent }]}>
                    {category.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Button
              title="Add Dare"
              variant="primary"
              color={theme.accent}
              loading={savingDare}
              onPress={saveOwnerDare}
              style={styles.modalButton}
            />

            <ScrollView style={styles.ownerDareList}>
              {customDares.filter((dare) => dare.event_id === session?.event_id).length === 0 ? (
                <Text style={styles.emptyText}>No owner dares yet.</Text>
              ) : (
                customDares
                  .filter((dare) => dare.event_id === session?.event_id)
                  .map((dare) => (
                    <View key={dare.id} style={styles.ownerDareRow}>
                      <Text style={styles.ownerDareText}>{dare.text}</Text>
                      <TouchableOpacity onPress={() => deleteOwnerDare(dare)}>
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  heroText: {
    flex: 1,
  },
  eyebrow: {
    ...typography.caption,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  heroIcon: {
    fontSize: 44,
    marginLeft: spacing.md,
  },
  categoryRow: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dareCard: {
    marginBottom: spacing.lg,
  },
  dareContent: {
    padding: spacing.lg,
  },
  dareLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  dareText: {
    ...typography.h2,
    color: colors.text,
    lineHeight: 32,
    marginBottom: spacing.lg,
  },
  dareSource: {
    ...typography.caption,
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
  },
  dareActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dareButton: {
    flex: 1,
  },
  secondaryActions: {
    marginBottom: spacing.xl,
  },
  photoProofButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  photoProofText: {
    ...typography.button,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
  completedRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  completedText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  drinkNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.76)',
    justifyContent: 'flex-end',
  },
  modalPanel: {
    maxHeight: '86%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
  },
  modalButton: {
    marginBottom: spacing.lg,
  },
  ownerDareList: {
    maxHeight: 220,
  },
  ownerDareRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  ownerDareText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
});

export default DaresScreen;
