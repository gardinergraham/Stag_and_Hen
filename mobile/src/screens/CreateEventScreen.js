import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, typography, spacing } from '../theme';
import { Button, TextInput, Card } from '../components';
import { eventsApi, paymentsApi, sessionStorage } from '../services/api';

const CreateEventScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    event_name: '',
    event_type: 'stag',
    bride_groom_name: '',
    owner_name: '',
    event_date: null,
    event_end_date: null,
    description: '',
    event_tier: 'prime',
    event_tier_price: 95,
    media_delete_policy: 'never',
  });
  const [picker, setPicker] = useState(null);
  const STAG_BLUE = '#00B7FF';
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

  const formatPickerDate = (date) => {
    if (!date) return 'Choose date';
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPickerTime = (date) => {
    if (!date) return 'Choose time';
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPickerValue = () => {
    if (!picker) return new Date();
    const existing = form[picker.field];
    if (existing) return existing;
    if (picker.field === 'event_end_date' && form.event_date) return form.event_date;
    return new Date();
  };

  const handleDateTimeChange = (event, selectedDate) => {
    if (Platform.OS !== 'ios') {
      setPicker(null);
    }
    if (!selectedDate || event?.type === 'dismissed' || !picker) return;

    const currentValue = form[picker.field] || new Date();
    const nextValue = new Date(currentValue);

    if (picker.mode === 'date') {
      nextValue.setFullYear(selectedDate.getFullYear());
      nextValue.setMonth(selectedDate.getMonth());
      nextValue.setDate(selectedDate.getDate());
      if (!form[picker.field]) {
        nextValue.setHours(picker.field === 'event_end_date' ? 23 : 12, 0, 0, 0);
      }
    } else {
      nextValue.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    }

    setForm((currentForm) => ({
      ...currentForm,
      [picker.field]: nextValue,
    }));
  };

  const getDefaultEndDate = (startDate) => {
    if (!startDate) return null;
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 0, 0);
    return endDate;
  };

  const renderPickerRow = (label, field, mode) => {
    const date = form[field];
    const value = mode === 'date' ? formatPickerDate(date) : formatPickerTime(date);
    const isActive = picker?.field === field && picker?.mode === mode;

    return (
      <TouchableOpacity
        style={[styles.pickerRow, isActive && styles.pickerRowActive]}
        onPress={() => setPicker({ field, mode })}
      >
        <View>
          <Text style={styles.pickerLabel}>{label}</Text>
          <Text style={[styles.pickerValue, !date && styles.pickerPlaceholder]}>{value}</Text>
        </View>
        <Text style={styles.pickerIcon}>{mode === 'date' ? 'Date' : 'Time'}</Text>
      </TouchableOpacity>
    );
  };

  const handleCreate = async () => {
    if (!form.event_name || !form.bride_groom_name || !form.owner_name) {
      Alert.alert('Missing Info', 'Please fill in all required fields.');
      return;
    }

    if (!form.event_date && form.event_end_date) {
      Alert.alert('Check the Dates', 'Please choose a start date before choosing an end date.');
      return;
    }

    const resolvedEndDate = form.event_end_date || getDefaultEndDate(form.event_date);
    const eventDate = form.event_date ? form.event_date.toISOString() : null;
    const eventEndDate = resolvedEndDate ? resolvedEndDate.toISOString() : null;

    if (eventDate && eventEndDate && new Date(eventEndDate) < new Date(eventDate)) {
      Alert.alert('Check the Dates', 'The end date cannot be before the start date.');
      return;
    }

    setLoading(true);
    try {
      const { event_date, event_end_date, ...eventForm } = form;
      const response = await eventsApi.create({
        ...eventForm,
        event_date: eventDate,
        event_end_date: eventEndDate,
      });
      const event = response.data;
      const pendingEventPayment = {
        event_id: event.id,
        event_name: event.event_name,
        event_type: event.event_type,
        member_name: event.owner_name,
        role: 'owner',
        owner_pin: event.owner_pin,
        access_pin: event.access_pin,
        event_date: event.event_date,
        event_end_date: event.event_end_date,
        event_tier: event.event_tier,
        event_tier_price: event.event_tier_price,
        payment_status: event.payment_status,
      };
      await sessionStorage.savePendingEventPayment(pendingEventPayment);

      let checkoutStarted = false;
      try {
        const checkoutResponse = await paymentsApi.createEventCheckout({
          event_id: event.id,
          owner_pin: event.owner_pin,
        });
        const checkoutUrl = checkoutResponse.data?.checkout_url;
        if (checkoutUrl) {
          checkoutStarted = true;
          await Linking.openURL(checkoutUrl);
        }
      } catch (checkoutError) {
        Alert.alert(
          'Event Created',
          checkoutError.response?.data?.detail
            ? `Your event was created, but Stripe Checkout could not start yet.\n\n${checkoutError.response.data.detail}\n\nYou can retry from the Home screen.`
            : 'Your event was created, but Stripe Checkout could not start yet. You can retry from the Home screen.'
        );
      }

      Alert.alert(
        checkoutStarted ? 'Payment Started' : 'Payment Needed',
        `Your event will not open until Stripe confirms payment.\n\nPackage: £${event.event_tier_price?.toFixed?.(2) || form.event_tier_price.toFixed(2)}\nOwner PIN: ${event.owner_pin}\nCrew Access PIN: ${event.access_pin}\n\nAfter payment completes, return to the app. We will check the payment and open your event automatically.`,
        [
          { text: 'OK', onPress: () => navigation.replace('Welcome') },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create event or start payment');
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

        <Text style={styles.sectionTitle}>Event Dates</Text>
        <View style={styles.dateGrid}>
          {renderPickerRow('Start Date', 'event_date', 'date')}
          {renderPickerRow('Start Time', 'event_date', 'time')}
          {renderPickerRow('End Date', 'event_end_date', 'date')}
          {renderPickerRow('End Time', 'event_end_date', 'time')}
        </View>

        {picker && (
          <View style={styles.pickerPanel}>
            <DateTimePicker
              value={getPickerValue()}
              mode={picker.mode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateTimeChange}
              minuteInterval={5}
            />
            {Platform.OS === 'ios' && (
              <Button
                title="Done"
                variant="secondary"
                size="small"
                onPress={() => setPicker(null)}
                style={styles.donePickerButton}
              />
            )}
          </View>
        )}

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
          title="Create Event & Pay"
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
  dateGrid: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pickerRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  pickerRowActive: {
    borderColor: colors.gold,
    backgroundColor: `${colors.gold}12`,
  },
  pickerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  pickerValue: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.xs,
  },
  pickerPlaceholder: {
    color: colors.textMuted,
  },
  pickerIcon: {
    ...typography.caption,
    color: colors.gold,
    textTransform: 'uppercase',
  },
  pickerPanel: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  donePickerButton: {
    margin: spacing.md,
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
