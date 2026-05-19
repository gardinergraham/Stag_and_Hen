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

const ADMIN_USERNAME = 'GrahamAdmin';
const ADMIN_PASSWORD = '1234';

const AdminLoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    Keyboard.dismiss();

    if (username.trim() !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      Alert.alert('Access Denied', 'That admin username or password is incorrect.');
      return;
    }

    navigation.replace('AdminSettings', {
      adminUsername: ADMIN_USERNAME,
      adminPassword: ADMIN_PASSWORD,
    });
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    if (value.length >= 4) {
      Keyboard.dismiss();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Admin Login</Text>
          <Text style={styles.subtitle}>Manage the products shown in the party shop.</Text>

          <TextInput
            label="Username"
            placeholder="GrahamAdmin"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <TextInput
            label="Password"
            placeholder="1234"
            value={password}
            onChangeText={handlePasswordChange}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />

          <Button
            title="Open Admin"
            variant="secondary"
            size="large"
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
    justifyContent: 'center',
    padding: spacing.xl,
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

export default AdminLoginScreen;
