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
  Modal,
  TextInput as NativeTextInput,
  AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, getEventTheme } from '../theme';
import { Card, Button } from '../components';
import { eventsApi, kittyApi, pointsApi, paymentsApi } from '../services/api';
import { useApp } from '../context/AppContext';
import { formatEventDateRange, getCountdownLabel, getCountdownParts } from '../utils/eventDates';
import { useEventIAPPurchase } from '../hooks/useEventIAPPurchase';

const HomeScreen = ({ navigation }) => {
  const { session, isOwner, logout, updateSession } = useApp();
  const { purchaseEventPackage, purchaseLoading } = useEventIAPPurchase();
  const isPreview = session?.is_preview;
  const [refreshing, setRefreshing] = useState(false);
  const [event, setEvent] = useState(null);
  const [kittyBalance, setKittyBalance] = useState(0);
  const [members, setMembers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [awardModalVisible, setAwardModalVisible] = useState(false);
  const [selectedAwardMember, setSelectedAwardMember] = useState(null);
  const [awardPoints, setAwardPoints] = useState('10');
  const [awardReason, setAwardReason] = useState('');
  const [awardingPoints, setAwardingPoints] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);

  const loadData = useCallback(async () => {
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
        { id: 'preview-owner', name: 'Graham', role: 'owner', points: 0 },
        { id: 'preview-1', name: 'Maid of Honour', role: 'crew', points: 35 },
        { id: 'preview-2', name: 'Best Mate', role: 'crew', points: 55 },
        { id: 'preview-3', name: 'The Crew', role: 'crew', points: 20 },
      ]);
      setLeaderboard([
        { member_name: 'Best Mate', role: 'crew', points: 55 },
        { member_name: 'Maid of Honour', role: 'crew', points: 35 },
        { member_name: 'The Crew', role: 'crew', points: 20 },
        { member_name: 'Graham', role: 'owner', points: 0 },
      ]);
      return;
    }

    try {
      const [eventRes, kittyRes, membersRes, leaderboardRes] = await Promise.all([
        eventsApi.getById(session.event_id),
        kittyApi.getBalance(session.event_id),
        eventsApi.getMembers(session.event_id),
        pointsApi.getLeaderboard(session.event_id),
      ]);
      const nextEvent = { ...eventRes.data };
      if (isOwner && session?.owner_pin && nextEvent.payment_status !== 'paid') {
        try {
          const paymentRes = await paymentsApi.getEventStatus(session.event_id, session.owner_pin);
          if (paymentRes.data?.payment_status) {
            nextEvent.payment_status = paymentRes.data.payment_status;
          }
        } catch (paymentError) {
          console.log('Could not refresh payment status:', paymentError?.response?.data || paymentError.message);
        }
      }
      setEvent(nextEvent);
      const sessionUpdates = {};
      if (nextEvent.payment_status && nextEvent.payment_status !== session.payment_status) {
        sessionUpdates.payment_status = nextEvent.payment_status;
      }
      if (nextEvent.event_date && nextEvent.event_date !== session.event_date) {
        sessionUpdates.event_date = nextEvent.event_date;
        sessionUpdates.event_end_date = nextEvent.event_end_date;
      }
      if (Object.keys(sessionUpdates).length > 0) {
        await updateSession(sessionUpdates);
      }
      setKittyBalance(kittyRes.data.balance);
      setMembers(membersRes.data);
      setLeaderboard(Array.isArray(leaderboardRes.data) ? leaderboardRes.data : []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [isPreview, isOwner, session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadData();
      }
    });
    return () => subscription.remove();
  }, [loadData]);

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

  const theme = getEventTheme(session.event_type);
  const eventDate = event?.event_date || session.event_date;
  const eventEndDate = event?.event_end_date || session.event_end_date;
  const countdown = getCountdownParts(eventDate);
  const paymentStatus = event?.payment_status || session?.payment_status || 'pending';
  const paymentRequired = isOwner && !isPreview && paymentStatus !== 'paid';
  const pointsByName = leaderboard.reduce((acc, entry) => {
    acc[entry.member_name] = entry.points;
    return acc;
  }, {});

  const openAwardModal = (member) => {
    if (isPreview) {
      Alert.alert('Preview Mode', 'Create an event to award real crew points.');
      return;
    }
    setSelectedAwardMember(member);
    setAwardPoints('10');
    setAwardReason('');
    setAwardModalVisible(true);
  };

  const awardCrewPoints = async () => {
    const parsedPoints = Number.parseInt(awardPoints, 10);
    if (!selectedAwardMember || !Number.isFinite(parsedPoints) || parsedPoints <= 0) {
      Alert.alert('Points Needed', 'Add a positive number of points.');
      return;
    }
    if (!awardReason.trim()) {
      Alert.alert('Reason Needed', 'Add what the points are for.');
      return;
    }

    setAwardingPoints(true);
    try {
      await pointsApi.award(
        {
          event_id: session.event_id,
          member_name: selectedAwardMember.name,
          points: parsedPoints,
          reason: awardReason.trim(),
        },
        session.owner_pin
      );
      setAwardModalVisible(false);
      await loadData();
      Alert.alert('Points Awarded', `${selectedAwardMember.name} received ${parsedPoints} points.`);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Could not award points.');
    } finally {
      setAwardingPoints(false);
    }
  };

  const startEventCheckout = async () => {
    if (!session?.event_id || !session?.owner_pin) return;
    setStartingCheckout(true);
    try {
      await purchaseEventPackage({
        eventId: session.event_id,
        ownerPin: session.owner_pin,
        tier: event?.event_tier || session.event_tier,
      });
      await updateSession({ payment_status: 'paid' });
      await loadData();
      Alert.alert('Payment Complete', 'Your event package is active.');
    } catch (error) {
      const detail = error?.response?.data?.detail || error?.message || 'Could not complete Apple in-app purchase.';
      Alert.alert('Payment Error', detail);
    } finally {
      setStartingCheckout(false);
    }
  };

  const finishDeletion = async (message) => {
    Alert.alert('Deleted', message, [
      {
        text: 'OK',
        onPress: async () => {
          await logout();
          navigation.replace('Welcome');
        },
      },
    ]);
  };

  const deleteThisEvent = () => {
    if (isPreview) {
      Alert.alert('Preview Mode', 'Create an event to manage real event data.');
      return;
    }
    if (!isOwner || !session?.owner_pin) return;

    Alert.alert(
      'Delete This Event?',
      'This permanently deletes this event, its crew, media records, kitty history, games, missions, points, and PIN access. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Event',
          style: 'destructive',
          onPress: async () => {
            setDeletingData(true);
            try {
              await eventsApi.delete(session.event_id, session.owner_pin);
              await finishDeletion('This event and its related data have been deleted.');
            } catch (error) {
              Alert.alert('Error', error?.response?.data?.detail || 'Could not delete this event.');
            } finally {
              setDeletingData(false);
            }
          },
        },
      ]
    );
  };

  const deleteAllOwnerEvents = (includeOwnerData = false) => {
    if (isPreview) {
      Alert.alert('Preview Mode', 'Create an event to manage real event data.');
      return;
    }
    if (!isOwner || !session?.owner_pin) return;

    Alert.alert(
      includeOwnerData ? 'Delete Owner Data?' : 'Delete All My Events?',
      includeOwnerData
        ? 'This permanently deletes all events owned by this owner login, all related media records, crew data, game data, and saved owner PIN access from this device. This cannot be undone.'
        : 'This permanently deletes all events owned by this owner login, including their media records, crew data, games, missions, kitty history, and points. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: includeOwnerData ? 'Delete Owner Data' : 'Delete All Events',
          style: 'destructive',
          onPress: async () => {
            setDeletingData(true);
            try {
              await eventsApi.deleteAllOwnerEvents(session.member_name, session.owner_pin, includeOwnerData);
              await finishDeletion(
                includeOwnerData
                  ? 'All owner events, related data, and local sign-in details have been deleted.'
                  : 'All events owned by this owner login and their related data have been deleted.'
              );
            } catch (error) {
              Alert.alert('Error', error?.response?.data?.detail || 'Could not delete owner events.');
            } finally {
              setDeletingData(false);
            }
          },
        },
      ]
    );
  };

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
            <Text style={[styles.eventType, { color: theme.accent }]}>
              {theme.partyIcon} {theme.label}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Leave</Text>
          </TouchableOpacity>
        </View>

        {/* Welcome Card */}
        <Card variant="highlight" style={[styles.welcomeCard, { borderColor: theme.accent }]}>
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
                variant="primary"
                color={theme.accent}
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

        <Card style={[styles.countdownCard, { borderColor: `${theme.accent}55` }]}>
          <Card.Content>
            <View style={styles.countdownHeader}>
              <View>
                <Text style={styles.countdownLabel}>Countdown</Text>
                <Text style={[styles.countdownTitle, { color: theme.accent }]}>{getCountdownLabel(eventDate)}</Text>
              </View>
              <Text style={styles.countdownIcon}>⏳</Text>
            </View>
            <Text style={styles.countdownDate}>{formatEventDateRange(eventDate, eventEndDate)}</Text>
            {countdown && !countdown.isPast && (
              <View style={styles.countdownPills}>
                <View style={styles.countdownPill}>
                  <Text style={[styles.countdownPillValue, { color: theme.accent }]}>{countdown.days}</Text>
                  <Text style={styles.countdownPillLabel}>Days</Text>
                </View>
                <View style={styles.countdownPill}>
                  <Text style={[styles.countdownPillValue, { color: theme.accent }]}>{countdown.hours}</Text>
                  <Text style={styles.countdownPillLabel}>Hours</Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {paymentRequired && (
          <Card style={styles.paymentCard}>
            <Card.Content>
              <Text style={styles.paymentTitle}>Complete Event Payment</Text>
              <Text style={styles.paymentText}>
                This event is saved, but payment is still pending. Complete Apple in-app purchase to activate the package.
              </Text>
              <Button
                title="Complete Apple Purchase"
                variant="primary"
                color={theme.accent}
                loading={startingCheckout || purchaseLoading}
                onPress={startEventCheckout}
                style={styles.paymentButton}
              />
            </Card.Content>
          </Card>
        )}

        {/* Quick Stats */}
        <View style={styles.statsBlock}>
          <Card style={styles.kittyStatCard} onPress={() => navigation.navigate('Kitty')}>
            <Card.Content style={styles.kittyStatContent}>
              <Text style={[styles.statValue, { color: theme.accent }]}>£{kittyBalance.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Kitty Balance</Text>
            </Card.Content>
          </Card>
          <Card style={styles.crewStatCard}>
            <Card.Content style={styles.crewStatContent}>
              <Text style={styles.crewStatLabel}>Crew Members</Text>
              <Text style={[styles.crewStatValue, { color: theme.accent }]}>{members.length}</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: `${theme.accent}20` }]}
            onPress={() => navigation.navigate('Gallery')}
          >
            <Text style={styles.actionIcon}>📸</Text>
            <Text style={styles.actionLabel}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: `${theme.accent}16` }]}
            onPress={() => navigation.navigate('Shop')}
          >
            <Text style={styles.actionIcon}>{theme.shopIcon}</Text>
            <Text style={styles.actionLabel}>Shop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: `${theme.accent}20` }]}
            onPress={() => navigation.navigate('Dares')}
          >
            <Text style={styles.actionIcon}>🎯</Text>
            <Text style={styles.actionLabel}>Games</Text>
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
              style={[styles.actionCard, { backgroundColor: `${theme.accent}16` }]}
              onPress={() => navigation.navigate('ShareQR')}
            >
              <Text style={styles.actionIcon}>📲</Text>
              <Text style={styles.actionLabel}>Share QR</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Prize Points</Text>
        <Card style={[styles.pointsCard, { borderColor: `${theme.accent}55` }]}>
          <Card.Content>
            <View style={styles.pointsHeader}>
              <View>
                <Text style={[styles.pointsEyebrow, { color: theme.accent }]}>Leaderboard</Text>
                <Text style={styles.pointsTitle}>End of party prize</Text>
              </View>
              <Text style={styles.pointsIcon}>🏆</Text>
            </View>
            {leaderboard.length === 0 ? (
              <Text style={styles.pointsHint}>Award points for missions, dares, photo proof, and best moments.</Text>
            ) : (
              leaderboard.slice(0, 5).map((entry, index) => (
                <View key={entry.member_name} style={styles.leaderboardRow}>
                  <Text style={[styles.leaderboardRank, { color: theme.accent }]}>#{index + 1}</Text>
                  <View style={styles.leaderboardNameWrap}>
                    <Text style={styles.leaderboardName}>{entry.member_name}</Text>
                    <Text style={styles.leaderboardRole}>
                      {entry.role === 'owner' ? 'Organizer' : entry.role === 'guest_of_honour' ? 'Guest of honour' : 'Crew'}
                    </Text>
                  </View>
                  <Text style={styles.leaderboardPoints}>{entry.points} pts</Text>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

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
                <Text style={[styles.memberPoints, { color: theme.accent }]}>
                  {pointsByName[member.name] || member.points || 0} pts
                </Text>
                {member.role === 'owner' && (
                  <Text style={styles.ownerBadge}>👑 Organizer</Text>
                )}
                {isOwner && member.role !== 'owner' && (
                  <TouchableOpacity style={[styles.awardButton, { borderColor: theme.accent }]} onPress={() => openAwardModal(member)}>
                    <Text style={[styles.awardButtonText, { color: theme.accent }]}>Award</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </Card.Content>
        </Card>

        {isOwner && (
          <>
            <Text style={styles.sectionTitle}>Data & Deletion</Text>
            <Card style={styles.deleteCard}>
              <Card.Content>
                <Text style={styles.deleteTitle}>Delete event data</Text>
                <Text style={styles.deleteText}>
                  These actions permanently remove event records from Stag & Hen. Only the owner can use them.
                </Text>
                <Button
                  title="Delete This Event & Media"
                  variant="outline"
                  color={colors.error}
                  loading={deletingData}
                  onPress={deleteThisEvent}
                  style={styles.deleteButton}
                />
                <Button
                  title="Delete All My Events & Media"
                  variant="outline"
                  color={colors.error}
                  loading={deletingData}
                  onPress={() => deleteAllOwnerEvents(false)}
                  style={styles.deleteButton}
                />
                <Button
                  title="Delete Owner Data & Sign-In"
                  variant="primary"
                  color={colors.error}
                  loading={deletingData}
                  onPress={() => deleteAllOwnerEvents(true)}
                  style={styles.deleteButton}
                />
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>

      <Modal visible={awardModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Award Points</Text>
            <Text style={styles.modalSubtitle}>{selectedAwardMember?.name}</Text>
            <Text style={styles.inputLabel}>Points</Text>
            <NativeTextInput
              value={awardPoints}
              onChangeText={setAwardPoints}
              keyboardType="number-pad"
              style={styles.modalInput}
              placeholder="10"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.inputLabel}>Reason</Text>
            <NativeTextInput
              value={awardReason}
              onChangeText={setAwardReason}
              style={[styles.modalInput, styles.reasonInput]}
              placeholder="Best photo proof, mission completed, funniest moment..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                color={theme.accent}
                onPress={() => setAwardModalVisible(false)}
                style={styles.modalButton}
              />
              <Button
                title="Award"
                variant="primary"
                color={theme.accent}
                loading={awardingPoints}
                onPress={awardCrewPoints}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  paymentCard: {
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  paymentTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  paymentText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  paymentButton: {
    alignSelf: 'flex-start',
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
  pointsCard: {
    marginBottom: spacing.xl,
    borderWidth: 1,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pointsEyebrow: {
    ...typography.caption,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  pointsTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.xs,
  },
  pointsIcon: {
    fontSize: 30,
  },
  pointsHint: {
    ...typography.body,
    color: colors.textSecondary,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  leaderboardRank: {
    ...typography.button,
    width: 38,
  },
  leaderboardNameWrap: {
    flex: 1,
  },
  leaderboardName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  leaderboardRole: {
    ...typography.caption,
    color: colors.textMuted,
  },
  leaderboardPoints: {
    ...typography.button,
    color: colors.gold,
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
  memberPoints: {
    ...typography.caption,
    marginRight: spacing.sm,
    fontWeight: '700',
  },
  ownerBadge: {
    ...typography.caption,
    color: colors.gold,
  },
  awardButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  awardButtonText: {
    ...typography.caption,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  reasonInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  deleteCard: {
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  deleteTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  deleteText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  deleteButton: {
    width: '100%',
    marginTop: spacing.sm,
  },
});

export default HomeScreen;
