import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { colors, typography, spacing, shadows } from '../theme';
import { Card, Button } from '../components';
import { eventsApi, kittyApi } from '../services/api';
import { useApp } from '../context/AppContext';
import { formatEventDateRange, getCountdownLabel, getCountdownParts } from '../utils/eventDates';

const HomeScreen = ({ navigation }) => {
  const { session, isOwner, logout, updateSession } = useApp();
  const isPreview = session?.is_preview;
  const [refreshing, setRefreshing] = useState(false);
  const [event, setEvent] = useState(null);
  const [kittyBalance, setKittyBalance] = useState(0);
  const [members, setMembers] = useState([]);

  const loadData = async () => {
    if (isPreview) {
      setEvent({
        event_name: session.event_name,
        event_type: session.event_type,
        event_date: session.event_date || new Date(Date.now() + 1000 * 60 * 60 * 24 * 42).toISOString(),
        event_end_date: session.event_end_date || new Date(Date.now() + 1000 * 60 * 60 * 24 * 44).toISOString(),
        event_tier: session.event_tier,
      });
      setKittyBalance(185);
      setMembers([
        { id: 'preview-owner', name: 'Graham', role: 'owner' },
        { id: 'preview-1', name: 'Maid of Honour', role: 'crew' },
        { id: 'preview-2', name: 'Best Mate', role: 'crew' },
        { id: 'preview-3', name: 'The Crew', role: 'crew' },
      ]);
      return;
    }

    try {
      const [eventRes, kittyRes, membersRes] = await Promise.all([
        eventsApi.getById(session.event_id),
        kittyApi.getBalance(session.event_id),
        eventsApi.getMembers(session.event_id),
      ]);
      setEvent(eventRes.data);
      if (eventRes.data?.event_date && eventRes.data.event_date !== session.event_date) {
        await updateSession({
          event_date: eventRes.data.event_date,
          event_end_date: eventRes.data.event_end_date,
        });
      }
      setKittyBalance(kittyRes.data.balance);
      setMembers(membersRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [session.event_id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    Alert.alert(isPreview ? 'Exit Preview' : 'Leave Event', isPreview ? 'Exit the app preview?' : 'Are you sure you want to leave this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isPreview ? 'Exit' : 'Leave',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.replace('Welcome');
        },
      },
    ]);
  };

  const isStag = session.event_type === 'stag';
  const eventDate = event?.event_date || session.event_date;
  const eventEndDate = event?.event_end_date || session.event_end_date;
  const countdown = getCountdownParts(eventDate);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/logo.jpg')} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.eventName}>{session.event_name}</Text>
            <Text style={styles.eventType}>
              {isStag ? '🦌 Stag Do' : '🐔 Hen Party'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Leave</Text>
          </TouchableOpacity>
        </View>

        {/* Welcome Card */}
        <Card variant="highlight" style={styles.welcomeCard}>
          <Card.Content>
            <Text style={styles.welcomeText}>
              Hey {session.member_name}! 👋
            </Text>
            <Text style={styles.roleText}>
              {isPreview ? 'Preview mode: explore before creating an event' : isOwner ? '👑 You\'re the organizer' : '🎉 You\'re part of the crew'}
            </Text>
            {isPreview && (
              <Button
                title="Create Your Event"
                variant="gold"
                size="small"
                onPress={async () => {
                  await logout();
                  navigation.replace('CreateEvent');
                }}
                style={styles.previewButton}
              />
            )}
          </Card.Content>
        </Card>

        <Card style={styles.countdownCard}>
          <Card.Content>
            <View style={styles.countdownHeader}>
              <View>
                <Text style={styles.countdownLabel}>Countdown</Text>
                <Text style={styles.countdownTitle}>{getCountdownLabel(eventDate)}</Text>
              </View>
              <Text style={styles.countdownIcon}>⏳</Text>
            </View>
            <Text style={styles.countdownDate}>{formatEventDateRange(eventDate, eventEndDate)}</Text>
            {countdown && !countdown.isPast && (
              <View style={styles.countdownPills}>
                <View style={styles.countdownPill}>
                  <Text style={styles.countdownPillValue}>{countdown.days}</Text>
                  <Text style={styles.countdownPillLabel}>Days</Text>
                </View>
                <View style={styles.countdownPill}>
                  <Text style={styles.countdownPillValue}>{countdown.hours}</Text>
                  <Text style={styles.countdownPillLabel}>Hours</Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsBlock}>
          <Card style={styles.kittyStatCard} onPress={() => navigation.navigate('Kitty')}>
            <Card.Content style={styles.kittyStatContent}>
              <Text style={styles.statValue}>£{kittyBalance.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Kitty Balance</Text>
            </Card.Content>
          </Card>
          <Card style={styles.crewStatCard}>
            <Card.Content style={styles.crewStatContent}>
              <Text style={styles.crewStatLabel}>Crew Members</Text>
              <Text style={styles.crewStatValue}>{members.length}</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: `${colors.primary}20` }]}
            onPress={() => navigation.navigate('Gallery')}
          >
            <Text style={styles.actionIcon}>📸</Text>
            <Text style={styles.actionLabel}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: `${colors.secondary}20` }]}
            onPress={() => navigation.navigate('Shop')}
          >
            <Text style={styles.actionIcon}>🛍️</Text>
            <Text style={styles.actionLabel}>Shop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: `${colors.gold}20` }]}
            onPress={() => navigation.navigate('Kitty')}
          >
            <Text style={styles.actionIcon}>💰</Text>
            <Text style={styles.actionLabel}>Kitty</Text>
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: `${colors.secondary}20` }]}
              onPress={() => navigation.navigate('ShareQR')}
            >
              <Text style={styles.actionIcon}>📲</Text>
              <Text style={styles.actionLabel}>Share QR</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Crew Members */}
        <Text style={styles.sectionTitle}>The Crew</Text>
        <Card>
          <Card.Content>
            {members.map((member, index) => (
              <View key={member.id} style={[styles.memberRow, index < members.length - 1 && styles.memberBorder]}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.memberName}>{member.name}</Text>
                {member.role === 'owner' && (
                  <Text style={styles.ownerBadge}>👑 Organizer</Text>
                )}
              </View>
            ))}
          </Card.Content>
        </Card>
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
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  eventName: {
    ...typography.h3,
    color: colors.text,
  },
  eventType: {
    ...typography.bodySmall,
    color: colors.gold,
  },
  logoutBtn: {
    padding: spacing.sm,
  },
  logoutText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  welcomeCard: {
    marginBottom: spacing.lg,
  },
  welcomeText: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  roleText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  previewButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  countdownCard: {
    marginBottom: spacing.lg,
    borderColor: colors.borderLight,
    borderWidth: 1,
  },
  countdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  countdownLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  countdownTitle: {
    ...typography.h2,
    color: colors.gold,
    marginTop: spacing.xs,
  },
  countdownIcon: {
    fontSize: 30,
  },
  countdownDate: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  countdownPills: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  countdownPill: {
    flex: 1,
    backgroundColor: `${colors.gold}12`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.gold}35`,
    padding: spacing.md,
    alignItems: 'center',
  },
  countdownPillValue: {
    ...typography.h2,
    color: colors.gold,
  },
  countdownPillLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  statsBlock: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  kittyStatCard: {
    width: '100%',
  },
  kittyStatContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  crewStatCard: {
    width: '100%',
  },
  crewStatContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  statValue: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.gold,
    textAlign: 'center',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  crewStatLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  crewStatValue: {
    ...typography.h2,
    color: colors.gold,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  actionCard: {
    width: '47%',
    padding: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  actionLabel: {
    ...typography.button,
    color: colors.text,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  memberBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  memberInitial: {
    ...typography.button,
    color: colors.text,
  },
  memberName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  ownerBadge: {
    ...typography.caption,
    color: colors.gold,
  },
});

export default HomeScreen;
