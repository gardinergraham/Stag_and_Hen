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
    event_tier: 'prime',
    event_tier_price: 95,
    media_delete_policy: 'never',
  });
  const STAG_BLUE = '#2563EB';
  const HEN_PINK = colors.primary; 

  const eventTypes = [
    { id: 'stag', label: 'Stag Do', emoji: '🦌' },
    { id: 'hen', label: 'Hen Party', emoji: '🐔' },
  ];

  const eventTiers = [
    {
      id: 'one_day',
      name: 'One Day',
      price: 25,
      media_delete_policy: '1_day',
      detail: 'Media deletes after 24 hours',
    },
    {
      id: 'extended',
      name: 'Extended',
      price: 55,
      media_delete_policy: '1_month',
      detail: 'Media kept for the month',
    },
    {
      id: 'prime',
      name: 'Prime',
      price: 95,
      media_delete_policy: 'never',
      detail: 'Media kept forever',
    },
  ];

  const selectTier = (tier) => {
    setForm({
      ...form,
      event_tier: tier.id,
      event_tier_price: tier.price,
      media_delete_policy: tier.media_delete_policy,
    });
  };

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
        event_tier: event.event_tier,
        event_tier_price: event.event_tier_price,
      });

      Alert.alert(
        'Event Created!',
        `Your ${form.event_type === 'stag' ? 'Stag Do' : 'Hen Party'} is ready!\n\nPackage: £${event.event_tier_price?.toFixed?.(2) || form.event_tier_price.toFixed(2)}\nOwner PIN: ${event.owner_pin}\nCrew Access PIN: ${event.access_pin}\n\nKeep these safe!`,
        [
          {
            text: 'Show QR Code',
            onPress: () =>
              navigation.reset({
                index: 1,
                routes: [{ name: 'Main' }, { name: 'ShareQR' }],
              }),
          },
          { text: 'Go Home', onPress: () => navigation.replace('Main') },
        ]
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
        {eventTypes.map((type) => {
          const isActive = form.event_type === type.id;
          const activeColor = type.id === 'stag' ? STAG_BLUE : HEN_PINK;

          return (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeOption,
                isActive && {
                  borderColor: activeColor,
                  backgroundColor: `${activeColor}20`,
                },
              ]}
              onPress={() => setForm({ ...form, event_type: type.id })}
            >
              <Text style={styles.typeEmoji}>{type.emoji}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  isActive && { color: activeColor },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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

        <Text style={styles.sectionTitle}>Choose Event Package</Text>
        <View style={styles.tierList}>
          {eventTiers.map((tier) => {
            const active = form.event_tier === tier.id;
            return (
            <TouchableOpacity
              key={tier.id}
              style={[
                styles.tierOption,
                active && styles.tierOptionActive,
              ]}
              onPress={() => selectTier(tier)}
            >
              <View style={styles.tierHeader}>
                <Text style={[styles.tierName, active && styles.tierNameActive]}>
                  {tier.name}
                </Text>
                <Text style={styles.tierPrice}>£{tier.price.toFixed(2)}</Text>
              </View>
              <Text style={styles.tierDetail}>{tier.detail}</Text>
            </TouchableOpacity>
            );
          })}
        </View>

       <Button
          title="Create Event"
          variant="primary"
          color={form.event_type === 'stag' ? STAG_BLUE : HEN_PINK}
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
  tierList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  tierOption: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierOptionActive: {
    borderColor: colors.gold,
    backgroundColor: `${colors.gold}15`,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  tierName: {
    ...typography.h3,
    color: colors.text,
  },
  tierNameActive: {
    color: colors.gold,
  },
  tierPrice: {
    ...typography.h3,
    color: colors.gold,
  },
  tierDetail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  createButton: {
    marginTop: spacing.md,
  },
});

export default CreateEventScreen;
