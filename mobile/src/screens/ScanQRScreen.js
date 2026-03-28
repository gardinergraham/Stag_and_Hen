import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, typography, spacing } from '../theme';
import { Button, TextInput } from '../components';
import { authApi } from '../services/api';
import { useApp } from '../context/AppContext';

const ScanQRScreen = ({ navigation }) => {
  const { login } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);

    try {
      // Parse QR data (format: stagandhen://join?data=base64)
      if (data.startsWith('stagandhen://join?data=')) {
        const encoded = data.split('data=')[1];
        const decoded = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));
        setQrData(decoded);
        setShowNameInput(true);
      } else {
        Alert.alert('Invalid QR', 'This QR code is not from The Stag & Hen app.', [
          { text: 'Scan Again', onPress: () => setScanned(false) },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not read QR code.', [
        { text: 'Scan Again', onPress: () => setScanned(false) },
      ]);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.accessViaQR({
        event_id: qrData.event_id,
        access_pin: qrData.pin,
        name: name.trim(),
      });
      const data = response.data;

      await login({
        event_id: data.event_id,
        event_name: data.event_name,
        event_type: data.event_type,
        member_name: data.member_name,
        role: data.role,
      });

      Alert.alert('Welcome!', data.message, [
        { text: "Let's Party!", onPress: () => navigation.replace('Main') },
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to join event', [
        { text: 'Try Again', onPress: () => setScanned(false) },
      ]);
      setShowNameInput(false);
      setQrData(null);
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.title}>Camera Access Needed</Text>
          <Text style={styles.message}>
            We need camera access to scan the QR code shared with you.
          </Text>
          <Button
            title="Grant Permission"
            variant="primary"
            onPress={requestPermission}
            style={styles.permissionButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (showNameInput) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.nameInputContainer}>
          <Text style={styles.title}>Almost There!</Text>
          <Text style={styles.eventName}>{qrData?.event_name}</Text>
          <Text style={styles.message}>Enter your name to join the party</Text>
          
          <TextInput
            label="Your Name"
            placeholder="What should we call you?"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          
          <Button
            title="Join the Party!"
            variant="gold"
            size="large"
            loading={loading}
            onPress={handleJoin}
            style={styles.joinButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.instructions}>
              Point your camera at the QR code
            </Text>
          </View>
        </CameraView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructions: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  permissionButton: {
    marginTop: spacing.md,
  },
  nameInputContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  eventName: {
    ...typography.h2,
    color: colors.gold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  joinButton: {
    marginTop: spacing.lg,
  },
});

export default ScanQRScreen;
