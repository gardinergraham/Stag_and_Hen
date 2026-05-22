import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, ScrollView, View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing } from '../theme';
import { Button } from '../components';
import { useApp } from '../context/AppContext';
import { paymentsApi, sessionStorage } from '../services/api';

const WelcomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login } = useApp();
  const [pendingEvent, setPendingEvent] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const checkPendingPayment = useCallback(async ({ showAlert = false } = {}) => {
    const pending = await sessionStorage.getPendingEventPayment();
    setPendingEvent(pending);
    if (!pending?.event_id || !pending?.owner_pin) return;

    setCheckingPayment(true);
    try {
      const response = await paymentsApi.getEventStatus(pending.event_id, pending.owner_pin);
      if (response.data?.payment_status === 'paid') {
        const paidSession = { ...pending, payment_status: 'paid' };
        await sessionStorage.clearPendingEventPayment();
        setPendingEvent(null);
        await login(paidSession);
        navigation.replace('Main');
        return;
      }
      if (showAlert) {
        Alert.alert('Payment Pending', 'Payment is still pending. If you have just paid, wait a few seconds and try again.');
      }
    } catch (error) {
      if (showAlert) {
        Alert.alert('Payment Check Failed', error?.response?.data?.detail || 'Could not check payment status yet.');
      }
    } finally {
      setCheckingPayment(false);
    }
  }, [login, navigation]);

  useFocusEffect(
    useCallback(() => {
      checkPendingPayment();
    }, [checkPendingPayment])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkPendingPayment();
      }
    });
    return () => subscription.remove();
  }, [checkPendingPayment]);

  const handlePreview = async () => {
    await login({
      event_id: 'preview-event',
      event_name: 'Preview Party Weekend',
      event_type: 'hen',
      member_name: 'Guest Preview',
      role: 'preview',
      is_preview: true,
      event_tier: 'prime',
      event_tier_price: 95,
    });
    navigation.replace('Main');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.xl) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>The Stag & Hen</Text>
          <Text style={styles.tagline}>Last Stop Before The Altar</Text>

          <Text style={styles.description}>
            Plan the perfect send-off! Share memories, manage your crew, play party games,
            award prize points, and collect video messages.
          </Text>
        </View>

        {pendingEvent && (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>Payment Check</Text>
            <Text style={styles.pendingText}>
              {pendingEvent.event_name} is waiting for Stripe confirmation.
            </Text>
            <Button
              title={checkingPayment ? 'Checking...' : 'Check Payment & Open Event'}
              variant="secondary"
              size="medium"
              loading={checkingPayment}
              onPress={() => checkPendingPayment({ showAlert: true })}
              style={styles.pendingButton}
            />
          </View>
        )}

        <View style={styles.buttons}>
          <Button
            title="Create an Event"
            variant="gold"
            size="medium"
            onPress={() => navigation.navigate('CreateEvent')}
            style={styles.button}
          />
          <Button
            title="Preview Games & Features"
            variant="primary"
            size="medium"
            onPress={handlePreview}
            style={styles.button}
          />
          <Button
            title="Join via QR Code"
            variant="outline"
            size="medium"
            onPress={() => navigation.navigate('ScanQR')}
            style={styles.button}
          />
          <Button
            title="Join Manually"
            variant="outline"
            size="medium"
            onPress={() => navigation.navigate('JoinManual')}
            style={styles.button}
          />
          <Button
            title="Owner Login"
            variant="secondary"
            size="medium"
            onPress={() => navigation.navigate('OwnerLogin')}
            style={styles.ownerButton}
          />
        </View>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: spacing.sm,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  logo: {
    width: 104,
    height: 104,
    borderRadius: 20,
    marginBottom: spacing.md,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gold,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  buttons: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  button: {
    width: '100%',
  },
  ownerButton: {
    alignSelf: 'center',
    marginTop: spacing.xs,
    minWidth: 180,
  },
  pendingCard: {
    backgroundColor: colors.card,
    borderColor: colors.borderLight,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  pendingTitle: {
    ...typography.h3,
    color: colors.gold,
    textAlign: 'center',
  },
  pendingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  pendingButton: {
    marginTop: spacing.md,
  },
});

export default WelcomeScreen;
