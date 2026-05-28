import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Linking,
  AppState,
} from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Card, Button, TextInput } from '../components';
import { kittyApi } from '../services/api';
import { useApp } from '../context/AppContext';

const KittyScreen = () => {
  const { session, isOwner } = useApp();
  const isPreview = session?.is_preview;
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectStatus, setConnectStatus] = useState(null);
  const [connectLoading, setConnectLoading] = useState(false);

  const parseAmount = (value) => Number.parseFloat(String(value).replace(',', '.'));

  const resetContributeForm = () => {
    Keyboard.dismiss();
    setShowContribute(false);
    setContributionAmount('');
    setMessage('');
  };

  const loadData = async () => {
    if (isPreview) {
      setBalance(185);
      setTransactions([
        {
          id: 'preview-tx-1',
          transaction_type: 'contribution',
          amount: 50,
          contributor_name: 'Maid of Honour',
          message: 'First round is covered',
          created_at: new Date().toISOString(),
        },
        {
          id: 'preview-tx-2',
          transaction_type: 'contribution',
          amount: 135,
          contributor_name: 'The Crew',
          message: 'Activity fund',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ]);
      return;
    }

    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        kittyApi.getBalance(session.event_id),
        kittyApi.getTransactions(session.event_id),
      ]);
      setBalance(balanceRes.data.balance);
      setTransactions(transactionsRes.data);
      if (isOwner && session.owner_pin) {
        try {
          const connectRes = await kittyApi.getConnectStatus(session.event_id, session.owner_pin);
          setConnectStatus(connectRes.data);
        } catch (connectError) {
          console.log('Could not load Stripe Connect status:', connectError?.response?.data || connectError.message);
        }
      }
    } catch (error) {
      console.error('Failed to load kitty:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadData();
      }
    });
    return () => subscription.remove();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleContribute = async () => {
    Keyboard.dismiss();
    if (isPreview) {
      Alert.alert('Preview Mode', 'Create an event to collect real kitty contributions.');
      return;
    }

    const numAmount = parseAmount(contributionAmount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      if (connectStatus && connectStatus.charges_enabled === false) {
        Alert.alert('Kitty Payments Not Ready', 'The event owner needs to finish Stripe setup before real kitty payments can be collected.');
        return;
      }

      const response = await kittyApi.createContributionCheckout({
        event_id: session.event_id,
        contributor_name: session.member_name,
        amount: numAmount,
        message: message || null,
      });
      const checkoutUrl = response.data?.checkout_url;
      if (!checkoutUrl) {
        throw new Error('Stripe did not return a checkout link.');
      }
      resetContributeForm();
      await Linking.openURL(checkoutUrl);
      Alert.alert('Payment Started', 'Complete Stripe Checkout, then return to the app. The kitty balance will update after Stripe confirms the payment.');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to contribute');
    } finally {
      setLoading(false);
    }
  };

  const startConnect = async () => {
    if (!isOwner || !session?.owner_pin) return;
    setConnectLoading(true);
    try {
      const response = await kittyApi.startConnect({
        event_id: session.event_id,
        owner_pin: session.owner_pin,
      });
      const url = response.data?.onboarding_url;
      setConnectStatus(response.data);
      if (url) {
        await Linking.openURL(url);
      }
    } catch (error) {
      Alert.alert('Stripe Setup Error', error.response?.data?.detail || 'Could not start Stripe setup.');
    } finally {
      setConnectLoading(false);
    }
  };

  const openConnectDashboard = async () => {
    if (!isOwner || !session?.owner_pin) return;
    setConnectLoading(true);
    try {
      const response = await kittyApi.openConnectDashboard({
        event_id: session.event_id,
        owner_pin: session.owner_pin,
      });
      const url = response.data?.dashboard_url || response.data?.onboarding_url;
      setConnectStatus(response.data);
      if (url) {
        await Linking.openURL(url);
      }
    } catch (error) {
      Alert.alert('Stripe Dashboard Error', error.response?.data?.detail || 'Could not open Stripe.');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleWithdraw = async () => {
    Keyboard.dismiss();
    if (isPreview) {
      Alert.alert('Preview Mode', 'Create an event to withdraw from the kitty.');
      return;
    }

    if (balance <= 0) {
      Alert.alert('No Kitty Balance', 'There is no kitty balance to withdraw yet.');
      return;
    }

    if (!connectStatus?.payouts_enabled && !connectStatus?.details_submitted) {
      Alert.alert(
        'Stripe Setup Needed',
        'Finish Stripe setup first, then Stripe will handle payouts to your bank account.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Set Up Stripe', onPress: startConnect },
        ]
      );
      return;
    }

    Alert.alert(
      `Withdraw £${balance.toFixed(2)}`,
      'Stripe pays out the connected kitty balance to your bank account based on your Stripe payout schedule. If more funds are still being added, wait until the kitty is settled before withdrawing the total. Open Stripe to view the available balance, bank account, and payout details.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Stripe', onPress: openConnectDashboard },
      ]
    );
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <Text style={styles.title}>Group Kitty</Text>
        <Text style={styles.subtitle}>Pool money for activities, taxis, surprises & more</Text>

        {isOwner && !isPreview && (
          <Card style={styles.connectCard}>
            <Card.Content>
              <Text style={styles.connectTitle}>Kitty Payments</Text>
              <Text style={styles.connectText}>
                {connectStatus?.charges_enabled
                  ? 'Stripe is ready. Crew payments can go straight into your connected kitty account.'
                  : 'Set up Stripe once so crew can add real money to the kitty.'}
              </Text>
              <Button
                title={connectStatus?.charges_enabled ? 'Open Stripe Dashboard' : 'Set Up Stripe'}
                variant={connectStatus?.charges_enabled ? 'outline' : 'primary'}
                loading={connectLoading}
                onPress={connectStatus?.charges_enabled ? openConnectDashboard : startConnect}
                style={styles.connectButton}
              />
            </Card.Content>
          </Card>
        )}

        {/* Balance Card */}
        <Card variant="glow" style={styles.balanceCard}>
          <Card.Content style={styles.balanceContent}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceValue}>£{balance.toFixed(2)}</Text>
            <View style={styles.balanceActions}>
              <Button
                title="Add Money"
                variant="primary"
                size="medium"
                onPress={() => setShowContribute(true)}
                style={styles.balanceButton}
              />
              {isOwner && (
                <Button
                  title={`Withdraw £${balance.toFixed(2)}`}
                  variant="outline"
                  size="medium"
                  disabled={balance <= 0}
                  onPress={handleWithdraw}
                  style={styles.balanceButton}
                />
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Transactions */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.length === 0 ? (
          <Card>
            <Card.Content style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💸</Text>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </Card.Content>
          </Card>
        ) : (
          transactions.map((tx) => (
            <Card key={tx.id} style={styles.transactionCard}>
              <Card.Content style={styles.transactionContent}>
                <View style={styles.transactionIcon}>
                  <Text style={styles.transactionIconText}>
                    {tx.transaction_type === 'contribution' ? '💚' : '💸'}
                  </Text>
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionTitle}>
                    {tx.transaction_type === 'contribution'
                      ? tx.contributor_name
                      : tx.purpose}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDate(tx.created_at)}
                  </Text>
                  {tx.message && (
                    <Text style={styles.transactionMessage}>"{tx.message}"</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    tx.transaction_type === 'contribution'
                      ? styles.amountPositive
                      : styles.amountNegative,
                  ]}
                >
                  {tx.transaction_type === 'contribution' ? '+' : '-'}£
                  {tx.amount.toFixed(2)}
                </Text>
              </Card.Content>
            </Card>
          ))
        )}

        <Text style={styles.mockedNotice}>
          💳 Kitty payments use Stripe Checkout. Balance updates after Stripe confirms payment.
        </Text>
      </ScrollView>

      {/* Contribute Modal */}
      <Modal visible={showContribute} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.modalTouchArea}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Add to Kitty</Text>
                  <TextInput
                    label="Amount (£)"
                    placeholder="e.g., 20"
                    value={contributionAmount}
                    onChangeText={setContributionAmount}
                    keyboardType="decimal-pad"
                  />
                  <Button
                    title="Done"
                    variant="outline"
                    size="small"
                    onPress={Keyboard.dismiss}
                    style={styles.doneButton}
                  />
                  <TextInput
                    label="Message (Optional)"
                    placeholder="For the weekend!"
                    value={message}
                    onChangeText={setMessage}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  <View style={styles.modalActions}>
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={resetContributeForm}
                      style={styles.modalButton}
                    />
                    <Button
                      title="Contribute"
                      variant="gold"
                      loading={loading}
                      onPress={handleContribute}
                      style={styles.modalButton}
                    />
                  </View>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  connectCard: {
    marginBottom: spacing.lg,
  },
  connectTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  connectText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  connectButton: {
    alignSelf: 'stretch',
  },
  balanceCard: {
    marginBottom: spacing.xl,
  },
  balanceContent: {
    alignItems: 'center',
  },
  balanceLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.gold,
    marginVertical: spacing.md,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  balanceButton: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  transactionCard: {
    marginBottom: spacing.sm,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionIconText: {
    fontSize: 20,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  transactionDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  transactionMessage: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  transactionAmount: {
    ...typography.h3,
    fontWeight: '700',
  },
  amountPositive: {
    color: colors.success,
  },
  amountNegative: {
    color: colors.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  mockedNotice: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalTouchArea: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  doneButton: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});

export default KittyScreen;
