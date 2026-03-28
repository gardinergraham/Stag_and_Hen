import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Button, TextInput } from '../components';
import { authApi } from '../services/api';
import { useApp } from '../context/AppContext';

const OwnerLoginScreen = ({ navigation }) => {
  const { login } = useApp();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    event_name: '',
    owner_pin: '',
  });

  const handleLogin = async () => {
    if (!form.event_name || !form.owner_pin) {
      Alert.alert('Missing Info', 'Please fill in all fields.');
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
        member_name: data.member_name,
        role: 'owner',
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
      <View style={styles.content}>
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
          onChangeText={(text) => setForm({ ...form, owner_pin: text })}
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
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
