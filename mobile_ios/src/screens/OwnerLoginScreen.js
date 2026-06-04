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

const APPLE_REVIEW_EVENT_NAME = 'apple review team';
const APPLE_REVIEW_OWNER_PINS = new Set(['4740', '4640', '3664']);

const OwnerLoginScreen = ({ navigation }) => {
  const { login } = useApp();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    event_name: '',
    owner_pin: '',
  });

  const handlePinChange = (owner_pin) => {
    setForm({ ...form, owner_pin });
    if (owner_pin.length >= 4) {
      Keyboard.dismiss();
    }
  };

  const handleLogin = async () => {
    if (!form.event_name || !form.owner_pin) {
      Alert.alert('Missing Info', 'Please fill in all fields.');
      return;
    }

    if (
      form.event_name.trim().toLowerCase() === APPLE_REVIEW_EVENT_NAME &&
      APPLE_REVIEW_OWNER_PINS.has(form.owner_pin)
    ) {
      await login({
        event_id: 'apple-review-demo',
        event_name: 'Apple Review Demo',
        event_type: 'hen',
        event_date: new Date().toISOString().split('T')[0],
        event_end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        member_name: 'Apple Review Team',
        role: 'owner',
        owner_pin: '4740',
        access_pin: '246810',
        is_preview: true,
        event_tier: 'prime',
        event_tier_price: 95,
      });
      navigation.replace('Main');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.ownerLogin(form);
      const data = response.data;

      await login({
        event_id: data.event_id,
        event_name: data.event_name,
        event_type: data.event_type,
        event_date: data.event_date,
        event_end_date: data.event_end_date,
        member_name: data.member_name,
        role: 'owner',
        owner_pin: data.owner_pin || form.owner_pin,
        access_pin: data.access_pin,
        payment_status: data.payment_status || 'paid',
        event_tier: data.event_tier,
        event_tier_price: data.event_tier_price,
        media_delete_policy: data.media_delete_policy,
        upload_extension_hours: data.upload_extension_hours || 0,
      });

      Alert.alert(
        'Welcome Back!',
        data.message,
        [{ text: 'Continue', onPress: () => navigation.replace('Main') }]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Invalid credentials');
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
          <Text style={styles.title}>Owner Login</Text>
          <Text style={styles.subtitle}>
            Access your event with your owner PIN
          </Text>

          <TextInput
            label="Event Name"
            placeholder="Your event name"
            value={form.event_name}
            onChangeText={(text) => setForm({ ...form, event_name: text })}
            autoCapitalize="words"
          />

          <TextInput
            label="Owner PIN"
            placeholder="Your 4-digit owner PIN"
            value={form.owner_pin}
            onChangeText={handlePinChange}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />

          <Button
            title="Login"
            variant="secondary"
            size="large"
            loading={loading}
            onPress={handleLogin}
            style={styles.loginButton}
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
  loginButton: {
    marginTop: spacing.lg,
  },
});

export default OwnerLoginScreen;
