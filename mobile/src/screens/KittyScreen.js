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
} from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Card, Button, TextInput } from '../components';
import { kittyApi } from '../services/api';
import { useApp } from '../context/AppContext';

const KittyScreen = () => {
  const { session, isOwner } = useApp();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showContribute, setShowContribute] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [purpose, setPurpose] = useState('');
  const [ownerPin, setOwnerPin] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        kittyApi.getBalance(session.event_id),
        kittyApi.getTransactions(session.event_id),
      ]);
      setBalance(balanceRes.data.balance);
      setTransactions(transactionsRes.data);
    } catch (error) {
      console.error('Failed to load kitty:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleContribute = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      await kittyApi.contribute({
        event_id: session.event_id,
        contributor_name: session.member_name,
        amount: numAmount,
        message: message || null,
      });
      setShowContribute(false);
      setAmount('');
      setMessage('');
      await loadData();
      Alert.alert('Thank You!', `£${numAmount.toFixed(2)} added to the kitty!`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to contribute');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (!ownerPin) {
      Alert.alert('PIN Required', 'Please enter your owner PIN.');
      return;
    }
    if (!purpose) {
      Alert.alert('Purpose Required', 'Please enter what the money is for.');
      return;
    }

    setLoading(true);
    try {
      await kittyApi.withdraw({
        event_id: session.event_id,
        owner_pin: ownerPin,
        amount: numAmount,
        purpose,
      });
      setShowWithdraw(false);
      setAmount('');
      setPurpose('');
      setOwnerPin('');
      await loadData();
      Alert.alert('Withdrawn', `£${numAmount.toFixed(2)} withdrawn for: ${purpose}`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to withdraw');
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.subtitle}>Pool money for drinks, activities & more</Text>

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
                  title="Withdraw"
                  variant="outline"
                  size="medium"
                  onPress={() => setShowWithdraw(true)}
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
          💳 Payments are currently in test mode (MOCKED)
        </Text>
      </ScrollView>

      {/* Contribute Modal */}
      <Modal visible={showContribute} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add to Kitty</Text>
            <TextInput
              label="Amount (£)"
              placeholder="e.g., 20"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <TextInput
              label="Message (Optional)"
              placeholder="For the drinks!"
              value={message}
              onChangeText={setMessage}
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setShowContribute(false);
                  setAmount('');
                  setMessage('');
                }}
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
        </View>
      </Modal>

      {/* Withdraw Modal */}
      <Modal visible={showWithdraw} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw from Kitty</Text>
            <TextInput
              label="Amount (£)"
              placeholder="e.g., 50"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <TextInput
              label="What's it for?"
              placeholder="e.g., Round of drinks"
              value={purpose}
              onChangeText={setPurpose}
            />
            <TextInput
              label="Owner PIN"
              placeholder="Your 4-digit PIN"
              value={ownerPin}
              onChangeText={setOwnerPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setShowWithdraw(false);
                  setAmount('');
                  setPurpose('');
                  setOwnerPin('');
                }}
                style={styles.modalButton}
              />
              <Button
                title="Withdraw"
                variant="primary"
                loading={loading}
                onPress={handleWithdraw}
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
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
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
  modalButton: {
    flex: 1,
  },
});

export default KittyScreen;
