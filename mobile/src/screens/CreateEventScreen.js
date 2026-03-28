import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Button, TextInput, Card } from '../components';
import { eventsApi } from '../services/api';
import { useApp } from '../context/AppContext';

const CreateEventScreen = ({ navigation }) => {
  const { login } = useApp();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    event_name: '',
    event_type: 'stag',
    bride_groom_name: '',
    owner_name: '',
    description: '',
    media_delete_policy: 'never',
  });

  const eventTypes = [
    { id: 'stag', label: 'Stag Do', emoji: '🦌' },
    { id: 'hen', label: 'Hen Party', emoji: '🐔' },
  ];

  const deletePolicies = [
    { id: 'never', label: 'Keep Forever' },
    { id: '1_day', label: 'Delete after 1 Day' },
    { id: '1_week', label: 'Delete after 1 Week' },
    { id: '1_month', label: 'Delete after 1 Month' },
  ];

  const handleCreate = async () => {
    if (!form.event_name || !form.bride_groom_name || !form.owner_name) {
      Alert.alert('Missing Info', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await eventsApi.create(form);
      const event = response.data;

      // Save session
      await login({
        event_id: event.id,
        event_name: event.event_name,
        event_type: event.event_type,
        member_name: event.owner_name,
        role: 'owner',
        owner_pin: event.owner_pin,
        access_pin: event.access_pin,
      });

      Alert.alert(
        'Event Created!',
        `Your ${form.event_type === 'stag' ? 'Stag Do' : 'Hen Party'} is ready!\n\nOwner PIN: ${event.owner_pin}\nCrew Access PIN: ${event.access_pin}\n\nKeep these safe!`,
        [{ text: 'Let\'s Go!', onPress: () => navigation.replace('Main') }]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Create Your Event</Text>
        <Text style={styles.subtitle}>Let's plan an unforgettable party!</Text>

        <View style={styles.typeSelector}>
          {eventTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeOption,
                form.event_type === type.id && styles.typeOptionActive,
              ]}
              onPress={() => setForm({ ...form, event_type: type.id })}
            >
              <Text style={styles.typeEmoji}>{type.emoji}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  form.event_type === type.id && styles.typeLabelActive,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          label="Event Name *"
          placeholder="e.g., Jamie's Stag Weekend"
          value={form.event_name}
          onChangeText={(text) => setForm({ ...form, event_name: text })}
        />

        <TextInput
          label={form.event_type === 'stag' ? "Groom's Name *" : "Bride's Name *"}
          placeholder="e.g., Jamie Smith"
          value={form.bride_groom_name}
          onChangeText={(text) => setForm({ ...form, bride_groom_name: text })}
        />

        <TextInput
          label="Your Name (Organizer) *"
          placeholder="e.g., Tom Wilson"
          value={form.owner_name}
          onChangeText={(text) => setForm({ ...form, owner_name: text })}
        />

        <TextInput
          label="Description (Optional)"
          placeholder="Wild weekend in Vegas!"
          value={form.description}
          onChangeText={(text) => setForm({ ...form, description: text })}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.sectionTitle}>Media Auto-Delete</Text>
        <View style={styles.policyGrid}>
          {deletePolicies.map((policy) => (
            <TouchableOpacity
              key={policy.id}
              style={[
                styles.policyOption,
                form.media_delete_policy === policy.id && styles.policyOptionActive,
              ]}
              onPress={() => setForm({ ...form, media_delete_policy: policy.id })}
            >
              <Text
                style={[
                  styles.policyLabel,
                  form.media_delete_policy === policy.id && styles.policyLabelActive,
                ]}
              >
                {policy.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Create Event"
          variant="gold"
          size="large"
          loading={loading}
          onPress={handleCreate}
          style={styles.createButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  typeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  typeEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  typeLabel: {
    ...typography.button,
    color: colors.textSecondary,
  },
  typeLabelActive: {
    color: colors.primary,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  policyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  policyOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  policyOptionActive: {
    borderColor: colors.secondary,
    backgroundColor: `${colors.secondary}20`,
  },
  policyLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  policyLabelActive: {
    color: colors.secondary,
  },
  createButton: {
    marginTop: spacing.md,
  },
});

export default CreateEventScreen;
