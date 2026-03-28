import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Share,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, typography, spacing } from '../theme';
import { Card, Button } from '../components';
import { eventsApi } from '../services/api';
import { useApp } from '../context/AppContext';

const ShareQRScreen = () => {
  const { session } = useApp();
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQRCode();
  }, []);

  const loadQRCode = async () => {
    try {
      // For owner, we need to pass the owner_pin
      // This should ideally be stored in session
      const ownerPin = session.owner_pin;
      if (!ownerPin) {
        Alert.alert('Error', 'Owner PIN not found. Please log in again.');
        return;
      }
      
      const response = await eventsApi.getQRCode(session.event_id, ownerPin);
      setQrData(response.data);
    } catch (error) {
      console.error('Failed to load QR:', error);
      Alert.alert('Error', 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join ${session.event_name}!\n\nEvent: ${session.event_name}\nAccess PIN: ${qrData?.access_pin}\n\nDownload The Stag & Hen app and enter the details above to join the party!`,
        title: 'Join my Stag/Hen Party!',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Generating QR Code...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Share Access</Text>
        <Text style={styles.subtitle}>
          Let your crew scan this QR code to join the party!
        </Text>

        <Card variant="glow" style={styles.qrCard}>
          <Card.Content style={styles.qrContent}>
            {qrData?.qr_data && (
              <View style={styles.qrWrapper}>
                <QRCode
                  value={qrData.qr_data}
                  size={200}
                  backgroundColor={colors.text}
                  color={colors.background}
                />
              </View>
            )}
            <Text style={styles.eventName}>{session.event_name}</Text>
          </Card.Content>
        </Card>

        <Card style={styles.pinCard}>
          <Card.Content>
            <Text style={styles.pinLabel}>Or share this PIN:</Text>
            <Text style={styles.pinValue}>{qrData?.access_pin}</Text>
            <Text style={styles.pinHint}>
              Crew can enter the event name + PIN to join
            </Text>
          </Card.Content>
        </Card>

        <Button
          title="Share Invite"
          variant="primary"
          size="large"
          onPress={handleShare}
          style={styles.shareButton}
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
    padding: spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  qrCard: {
    marginBottom: spacing.lg,
  },
  qrContent: {
    alignItems: 'center',
  },
  qrWrapper: {
    padding: spacing.md,
    backgroundColor: colors.text,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  eventName: {
    ...typography.h3,
    color: colors.gold,
    textAlign: 'center',
  },
  pinCard: {
    marginBottom: spacing.xl,
  },
  pinLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  pinValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 8,
  },
  pinHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  shareButton: {
    marginTop: 'auto',
  },
});

export default ShareQRScreen;
