import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { colors, typography } from '../theme';
import { useApp } from '../context/AppContext';

const SplashScreen = ({ navigation }) => {
  const { loading, isLoggedIn } = useApp();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    // Animate logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after loading
    if (!loading) {
      const timer = setTimeout(() => {
        if (isLoggedIn) {
          navigation.replace('Main');
        } else {
          navigation.replace('Welcome');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, isLoggedIn]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require('../../assets/logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>The Stag & Hen</Text>
        <Text style={styles.tagline}>Last Stop Before The Altar</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 30,
    marginBottom: 24,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: 8,
  },
  tagline: {
    ...typography.body,
    color: colors.gold,
  },
});

export default SplashScreen;
