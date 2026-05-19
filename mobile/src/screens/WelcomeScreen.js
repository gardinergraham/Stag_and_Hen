import React from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Button } from '../components';

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Welcome to</Text>
        <Text style={styles.brandTitle}>The Stag & Hen</Text>
        <Text style={styles.tagline}>Last Stop Before The Altar</Text>
        
        <Text style={styles.description}>
          Plan the perfect send-off! Share memories, manage your crew, and make sure 
          everyone has the night (or weekend) of their lives.
        </Text>
      </View>

      <View style={styles.buttons}>
        <Button
          title="Create an Event"
          variant="gold"
          size="large"
          onPress={() => navigation.navigate('CreateEvent')}
          style={styles.button}
        />
        <Button
          title="Join via QR Code"
          variant="primary"
          size="large"
          onPress={() => navigation.navigate('ScanQR')}
          style={styles.button}
        />
        <Button
          title="Join Manually"
          variant="outline"
          size="large"
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
        <Button
          title="Admin Login"
          variant="outline"
          size="medium"
          onPress={() => navigation.navigate('AdminLogin')}
          style={styles.ownerButton}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  brandTitle: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },
  tagline: {
    ...typography.h3,
    color: colors.gold,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttons: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  button: {
    width: '100%',
  },
  ownerButton: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
});

export default WelcomeScreen;
