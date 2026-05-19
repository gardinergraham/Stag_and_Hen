import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Button, TextInput } from '../components';
import { authApi } from '../services/api';
import { useApp } from '../context/AppContext';

const JoinManualScreen = ({ navigation }) => {
  const { login } = useApp();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    event_name: '',
    name: '',
    pin: '',
  });

  const handlePinChange = (pin) => {
    setForm({ ...form, pin });
    if (pin.length >= 4) {
      Keyboard.dismiss();
    }
  };

  const handleJoin = async () => {
    if (!form.event_name || !form.name || !form.pin) {
      Alert.alert('Missing Info', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.accessManual(form);
      const data = response.data;

      await login({
        event_id: data.event_id,
        event_name: data.event_name,
        event_type: data.event_type,
        member_name: data.member_name,
        role: data.role,
      });

      Alert.alert(
        'Welcome!',
        data.message,
        [{ text: 'Let\'s Party!', onPress: () => navigation.replace('Main') }]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Invalid event name or PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Join Event</Text>
          <Text style={styles.subtitle}>
            Enter the event details shared with you
          </Text>

          <TextInput
            label="Event Name"
            placeholder="e.g., Jamie's Stag Weekend"
            value={form.event_name}
            onChangeText={(text) => setForm({ ...form, event_name: text })}
            autoCapitalize="words"
          />

          <TextInput
            label="Your Name"
            placeholder="What should we call you?"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
            autoCapitalize="words"
          />

          <TextInput
            label="Access PIN"
            placeholder="4-digit PIN"
            value={form.pin}
            onChangeText={handlePinChange}
            keyboardType="number-pad"
            maxLength={4}
          />

          <Button
            title="Join the Party!"
            variant="primary"
            size="large"
            loading={loading}
            onPress={handleJoin}
            style={styles.joinButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  joinButton: {
    marginTop: spacing.lg,
  },
});

export default JoinManualScreen;
