import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, typography, shadows } from '../theme';

const Button = ({
  title,
  onPress,
  variant = 'primary', // primary, secondary, gold, outline
  size = 'medium', // small, medium, large
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  color,
}) => {
  const getButtonStyle = () => {
    const base = [styles.button, styles[size]];

    switch (variant) {
      case 'primary':
        base.push({
          backgroundColor: color || colors.primary,
          ...shadows.glow(color || colors.primary),
        });
        break;

      case 'secondary':
        base.push({
          backgroundColor: color || colors.secondary,
          ...shadows.glow(color || colors.secondary),
        });
        break;

      case 'gold':
        base.push(styles.gold);
        break;

      case 'outline':
        base.push({
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: color || colors.secondary,
        });
        break;
    }

    if (disabled) {
      base.push(styles.disabled);
    }

    return base;
  };

  const getTextStyle = () => {
    const base = [styles.text, styles[`${size}Text`]];

    if (variant === 'gold') {
      base.push(styles.goldText);
    } else if (variant === 'outline') {
      base.push({
        color: color || colors.secondary,
      });
    }

    if (disabled) {
      base.push(styles.disabledText);
    }

    return base;
  };

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'gold' ? colors.background : colors.text} />
      ) : (
        <>
          {icon}
          <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 8,
  },
  
  // Sizes
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  large: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  
  // Variants
  primary: {
    backgroundColor: colors.primary,
    ...shadows.glow(colors.primary),
  },
  secondary: {
    backgroundColor: colors.secondary,
    ...shadows.glow(colors.secondary),
  },
  gold: {
    backgroundColor: colors.gold,
    ...shadows.glow(colors.gold),
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
  
  // Text
  text: {
    color: colors.text,
    ...typography.button,
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  goldText: {
    color: colors.background,
  },
  outlineText: {
    color: colors.secondary,
  },
  disabledText: {
    opacity: 0.7,
  },
});

export default Button;
