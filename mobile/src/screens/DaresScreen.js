import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { colors, typography, spacing, getEventTheme } from '../theme';
import { Button, Card, TextInput } from '../components';
import { useApp } from '../context/AppContext';
import { daresApi, eventsApi } from '../services/api';

const dareDecks = {
  warmup: [
    'Nominate someone to tell the funniest story about the guest of honour.',
    'Take a group selfie with three people pulling their worst serious face.',
    'Swap seats with someone and copy their laugh for one round.',
    'Choose someone to give a one-minute best-man or maid-of-honour speech.',
  ],
  photo: [
    'Recreate a movie poster with the crew and upload it to the gallery.',
    'Find something that matches the party colour and take a photo with it.',
    'Take a “before the chaos” photo with everyone currently in the room.',
    'Get a photo of the guest of honour doing their best catalogue pose.',
  ],
  cheeky: [
    'Let the group choose your next selfie pose.',
    'Give someone a harmless nickname that must stick for the next hour.',
    'Convince a stranger or staff member to give the group a party rating out of 10.',
    'Speak only in dramatic movie-trailer voice until your next turn.',
  ],
  drinks: [
    'Most likely to miss the taxi takes two sips.',
    'Never have I ever: forgotten someone’s name during a night out.',
    'Everyone who has known the guest of honour for more than five years takes a sip.',
    'Choose a Rule Master. Anyone who breaks their rule takes a sip.',
  ],
};

const categories = [
  { id: 'warmup', title: 'Warm Up', icon: 'sparkles' },
  { id: 'photo', title: 'Photo Dare', icon: 'camera' },
  { id: 'cheeky', title: 'Cheeky', icon: 'happy' },
  { id: 'drinks', title: 'Drinks', icon: 'beer' },
];

const spinnerPairs = [
  {
    id: 'drink-safe',
    title: 'Drink or Safe',
    left: 'Drink',
    right: 'Safe',
    leftDetail: 'Take two sips or nominate someone to save you.',
    rightDetail: 'You are safe this round.',
    leftColor: '#00B7FF',
    rightColor: '#22C55E',
  },
  {
    id: 'blue-red',
    title: 'Find Blue or Red',
    left: 'Find Blue',
    right: 'Find Red',
    leftDetail: 'Find something blue and get photo proof.',
    rightDetail: 'Find something red and get photo proof.',
    leftColor: '#00B7FF',
    rightColor: '#EF4444',
  },
  {
    id: 'truth-photo',
    title: 'Truth or Photo',
    left: 'Truth',
    right: 'Photo',
    leftDetail: 'Answer a question from the group.',
    rightDetail: 'Do a quick photo challenge for the gallery.',
    leftColor: '#FFD700',
    rightColor: '#FF1493',
  },
  {
    id: 'solo-group',
    title: 'Solo or Group',
    left: 'Solo',
    right: 'Group',
    leftDetail: 'Do the next dare yourself.',
    rightDetail: 'Choose two people to join you.',
    leftColor: '#8B5CF6',
    rightColor: '#0D9488',
  },
];

const DaresScreen = ({ navigation }) => {
  const { session, isOwner } = useApp();
  const theme = getEventTheme(session?.event_type);
  const [selectedCategory, setSelectedCategory] = useState('warmup');
  const [customDares, setCustomDares] = useState([]);
  const [customSpinnerPairs, setCustomSpinnerPairs] = useState([]);
  const [currentDare, setCurrentDare] = useState({ text: dareDecks.warmup[0], category: 'warmup', source: 'built-in' });
  const [completed, setCompleted] = useState([]);
  const [manageVisible, setManageVisible] = useState(false);
  const [newDareText, setNewDareText] = useState('');
  const [newDareCategory, setNewDareCategory] = useState('warmup');
  const [savingDare, setSavingDare] = useState(false);
  const [newPairTitle, setNewPairTitle] = useState('');
  const [newPairLeft, setNewPairLeft] = useState('');
  const [newPairRight, setNewPairRight] = useState('');
  const [newPairLeftDetail, setNewPairLeftDetail] = useState('');
  const [newPairRightDetail, setNewPairRightDetail] = useState('');
  const [savingPair, setSavingPair] = useState(false);
  const [members, setMembers] = useState([]);
  const [guestOfHonour, setGuestOfHonour] = useState('');
  const [selectedPairId, setSelectedPairId] = useState('drink-safe');
  const [spinnerResult, setSpinnerResult] = useState(null);
  const [recentSpinResults, setRecentSpinResults] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const wheelRotation = useRef(new Animated.Value(0)).current;
  const spinCount = useRef(0);

  const loadCustomDares = async () => {
    if (session?.is_preview || !session?.event_id) return;
    try {
      const response = await daresApi.getDares(session.event_id, session.event_type);
      setCustomDares(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log('Could not load custom dares:', error?.response?.data || error.message);
    }
  };

  const loadCustomSpinnerPairs = async () => {
    if (session?.is_preview || !session?.event_id) return;
    try {
      const response = await daresApi.getSpinnerPairs(session.event_id, session.event_type);
      setCustomSpinnerPairs(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log('Could not load spinner choices:', error?.response?.data || error.message);
    }
  };

  const loadSpinTargets = async () => {
    if (session?.is_preview) {
      setGuestOfHonour(session?.event_type === 'stag' ? 'The Groom' : 'The Bride');
      setMembers([
        { id: 'preview-owner', name: 'Graham', role: 'owner' },
        { id: 'preview-1', name: 'Best Mate', role: 'crew' },
        { id: 'preview-2', name: 'Maid of Honour', role: 'crew' },
      ]);
      return;
    }

    if (!session?.event_id) return;

    try {
      const [eventResponse, membersResponse] = await Promise.all([
        eventsApi.getById(session.event_id),
        eventsApi.getMembers(session.event_id),
      ]);
      setGuestOfHonour(eventResponse.data?.bride_groom_name || '');
      setMembers(Array.isArray(membersResponse.data) ? membersResponse.data : []);
    } catch (error) {
      console.log('Could not load spin targets:', error?.response?.data || error.message);
    }
  };

  const loadRecentSpinResults = async () => {
    if (session?.is_preview || !session?.event_id) return;
    try {
      const response = await daresApi.getSpinResults(session.event_id);
      setRecentSpinResults(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log('Could not load shared spin results:', error?.response?.data || error.message);
    }
  };

  useEffect(() => {
    loadCustomDares();
    loadCustomSpinnerPairs();
    loadSpinTargets();
    loadRecentSpinResults();
  }, [session?.event_id, session?.event_type]);

  useEffect(() => {
    if (session?.is_preview || !session?.event_id) return undefined;

    const interval = setInterval(loadRecentSpinResults, 8000);
    return () => clearInterval(interval);
  }, [session?.event_id, session?.is_preview]);

  const availableSpinnerPairs = [
    ...spinnerPairs,
    ...customSpinnerPairs.map((pair) => ({
      id: pair.id,
      title: pair.title,
      left: pair.left,
      right: pair.right,
      leftDetail: pair.left_detail || '',
      rightDetail: pair.right_detail || '',
      leftColor: pair.left_color || theme.accent,
      rightColor: pair.right_color || colors.success,
      source: pair.event_id ? 'owner' : 'admin',
    })),
  ];
  const selectedPair = availableSpinnerPairs.find((pair) => pair.id === selectedPairId) || availableSpinnerPairs[0];
  const spinTargets = [
    ...members.map((member) => ({
      id: member.id || member.name,
      name: member.name,
      label: member.role === 'owner' ? 'Owner' : 'Crew',
    })),
    ...(guestOfHonour
      ? [{ id: 'guest-of-honour', name: guestOfHonour, label: session?.event_type === 'stag' ? 'Groom' : 'Bride' }]
      : []),
  ].filter((target) => target.name);

  const spinCrewWheel = () => {
    if (spinning) return;

    const targets = spinTargets.length
      ? spinTargets
      : [{ id: 'current-user', name: session?.member_name || 'Someone', label: 'Crew' }];
    const target = targets[Math.floor(Math.random() * targets.length)];
    const side = Math.random() >= 0.5 ? 'bottom' : 'top';
    const action = side === 'bottom' ? selectedPair.right : selectedPair.left;
    const detail = side === 'bottom' ? selectedPair.rightDetail : selectedPair.leftDetail;
    const baseRotation = side === 'bottom' ? 180 : 0;
    const landingOffset = Math.floor(Math.random() * 70) - 35;

    spinCount.current += 1;
    setSpinning(true);
    setSpinnerResult(null);

    Animated.timing(wheelRotation, {
      toValue: spinCount.current * 360 * 4 + baseRotation + landingOffset,
      duration: 1600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(async () => {
      const result = { target, action, detail, side, spinnerTitle: selectedPair.title };
      setSpinnerResult(result);
      setSpinning(false);

      if (session?.is_preview || !session?.event_id) return;

      try {
        const response = await daresApi.createSpinResult({
          event_id: session.event_id,
          spinner_title: selectedPair.title,
          target_name: target.name,
          target_label: target.label,
          action,
          detail,
          spun_by: session?.member_name || (isOwner ? 'Owner' : 'Crew'),
        });
        const savedResult = response.data;
        setRecentSpinResults((current) => [savedResult, ...current.filter((item) => item.id !== savedResult.id)].slice(0, 10));
      } catch (error) {
        console.log('Could not share spin result:', error?.response?.data || error.message);
      }
    });
  };

  const wheelRotate = wheelRotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const formatSpinTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const spinDare = (categoryId = selectedCategory) => {
    const deck = [
      ...(dareDecks[categoryId] || dareDecks.warmup).map((text) => ({
        text,
        category: categoryId,
        source: 'built-in',
      })),
      ...customDares
        .filter((dare) => dare.category === categoryId)
        .map((dare) => ({ ...dare, source: dare.event_id ? 'owner' : 'admin' })),
    ];
    const nextDare = deck[Math.floor(Math.random() * deck.length)];
    setSelectedCategory(categoryId);
    setCurrentDare(nextDare);
  };

  const completeDare = () => {
    setCompleted((current) => [currentDare.text, ...current.filter((dare) => dare !== currentDare.text)].slice(0, 5));
    Alert.alert('Dare Complete', 'Nice. Add photo proof to the gallery if it deserves to live forever.');
  };

  const saveOwnerDare = async () => {
    if (!newDareText.trim()) {
      Alert.alert('Dare Needed', 'Add the dare text first.');
      return;
    }

    setSavingDare(true);
    try {
      await daresApi.create(
        {
          text: newDareText.trim(),
          category: newDareCategory,
          event_type: session?.event_type || 'all',
          event_id: session?.event_id,
        },
        session?.owner_pin
      );
      setNewDareText('');
      setNewDareCategory('warmup');
      await loadCustomDares();
      Alert.alert('Dare Added', 'Your crew can now spin this dare.');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Could not add this dare.');
    } finally {
      setSavingDare(false);
    }
  };

  const deleteOwnerDare = async (dare) => {
    Alert.alert('Delete Dare', 'Remove this event dare?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await daresApi.delete(dare.id, session?.owner_pin);
            await loadCustomDares();
          } catch (error) {
            Alert.alert('Error', error?.response?.data?.detail || 'Could not delete this dare.');
          }
        },
      },
    ]);
  };

  const saveOwnerSpinnerPair = async () => {
    if (!newPairTitle.trim() || !newPairLeft.trim() || !newPairRight.trim()) {
      Alert.alert('Choices Needed', 'Add a title and both spinner choices first.');
      return;
    }

    setSavingPair(true);
    try {
      await daresApi.createSpinnerPair(
        {
          title: newPairTitle.trim(),
          left: newPairLeft.trim(),
          right: newPairRight.trim(),
          left_detail: newPairLeftDetail.trim() || null,
          right_detail: newPairRightDetail.trim() || null,
          left_color: theme.accent,
          right_color: colors.success,
          event_type: session?.event_type || 'all',
          event_id: session?.event_id,
        },
        session?.owner_pin
      );
      setNewPairTitle('');
      setNewPairLeft('');
      setNewPairRight('');
      setNewPairLeftDetail('');
      setNewPairRightDetail('');
      await loadCustomSpinnerPairs();
      Alert.alert('Spinner Added', 'Your crew can now use this spinner choice.');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Could not add this spinner choice.');
    } finally {
      setSavingPair(false);
    }
  };

  const deleteOwnerSpinnerPair = async (pair) => {
    Alert.alert('Delete Spinner Choice', `Remove "${pair.title}" from this event?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await daresApi.deleteSpinnerPair(pair.id, session?.owner_pin);
            if (selectedPairId === pair.id) {
              setSelectedPairId('drink-safe');
              setSpinnerResult(null);
            }
            await loadCustomSpinnerPairs();
          } catch (error) {
            Alert.alert('Error', error?.response?.data?.detail || 'Could not delete this spinner choice.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { borderColor: theme.accent, shadowColor: theme.accent }]}>
          <View style={styles.heroText}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>Party Games</Text>
            <Text style={styles.title}>Dares & Challenges</Text>
            <Text style={styles.subtitle}>
              Quick cards for the crew when the night needs a little spark.
            </Text>
          </View>
          <Text style={styles.heroIcon}>{session?.event_type === 'stag' ? '🍻' : '💃'}</Text>
        </View>

        <Card style={[styles.spinnerCard, { borderColor: `${theme.accent}66` }]}>
          <Card.Content style={styles.spinnerContent}>
            <View style={styles.spinnerHeader}>
              <View>
                <Text style={[styles.dareLabel, { color: theme.accent }]}>Spin the Crew</Text>
                <Text style={styles.spinnerTitle}>{selectedPair.title}</Text>
              </View>
              <Ionicons name="navigate" size={24} color={theme.accent} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {availableSpinnerPairs.map((pair) => {
                const active = selectedPairId === pair.id;
                return (
                  <TouchableOpacity
                    key={pair.id}
                    style={[
                      styles.categoryChip,
                      active && {
                        borderColor: theme.accent,
                        backgroundColor: `${theme.accent}22`,
                      },
                    ]}
                    onPress={() => {
                      setSelectedPairId(pair.id);
                      setSpinnerResult(null);
                    }}
                  >
                    <Text style={[styles.categoryText, active && { color: theme.accent }]}>
                      {pair.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.wheelStage}>
              <View style={styles.wheelPointer} />
              <Animated.View style={[styles.wheelFrame, { transform: [{ rotate: wheelRotate }] }]}>
                <Svg width={170} height={170} viewBox="0 0 170 170">
                  <Path
                    d="M 5 85 A 80 80 0 0 1 165 85 L 5 85 Z"
                    fill={selectedPair.leftColor}
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="2"
                  />
                  <Path
                    d="M 5 85 A 80 80 0 0 0 165 85 L 5 85 Z"
                    fill={selectedPair.rightColor}
                    stroke="rgba(0,0,0,0.25)"
                    strokeWidth="2"
                  />
                </Svg>
                <View pointerEvents="none" style={styles.wheelLabelTop}>
                  <Text style={styles.wheelText}>{selectedPair.left}</Text>
                </View>
                <View pointerEvents="none" style={styles.wheelLabelBottom}>
                  <Text style={styles.wheelText}>{selectedPair.right}</Text>
                </View>
              </Animated.View>
            </View>

            {spinnerResult ? (
              <View style={styles.spinnerResult}>
                <Text style={styles.spinnerPerson}>{spinnerResult.target.name}</Text>
                <Text style={[styles.spinnerAction, { color: theme.accent }]}>{spinnerResult.action}</Text>
                <Text style={styles.spinnerDetail}>{spinnerResult.detail}</Text>
                <Text style={styles.spinnerRole}>{spinnerResult.target.label}</Text>
              </View>
            ) : (
              <Text style={styles.spinnerHint}>
                Spin to pick a person and decide which side of the challenge they land on.
              </Text>
            )}

            <Button
              title={spinning ? 'Spinning...' : 'Spin'}
              variant="primary"
              color={theme.accent}
              loading={spinning}
              onPress={spinCrewWheel}
            />
          </Card.Content>
        </Card>

        <Card style={styles.sharedSpinCard}>
          <Card.Content style={styles.sharedSpinContent}>
            <View style={styles.sharedSpinHeader}>
              <View>
                <Text style={[styles.dareLabel, { color: theme.accent }]}>Shared Results</Text>
                <Text style={styles.sharedSpinTitle}>Latest Spins</Text>
              </View>
              <TouchableOpacity onPress={loadRecentSpinResults}>
                <Ionicons name="refresh" size={22} color={theme.accent} />
              </TouchableOpacity>
            </View>
            {recentSpinResults.length === 0 ? (
              <Text style={styles.spinnerHint}>Spin results from the crew will show here.</Text>
            ) : (
              recentSpinResults.slice(0, 5).map((result) => (
                <View key={result.id} style={styles.sharedSpinRow}>
                  <View style={styles.sharedSpinIcon}>
                    <Ionicons name="navigate" size={16} color={theme.accent} />
                  </View>
                  <View style={styles.sharedSpinTextWrap}>
                    <Text style={styles.sharedSpinText}>
                      {result.target_name} got {result.action}
                    </Text>
                    <Text style={styles.sharedSpinMeta}>
                      {result.spinner_title}
                      {result.spun_by ? ` · spun by ${result.spun_by}` : ''}
                      {formatSpinTime(result.created_at) ? ` · ${formatSpinTime(result.created_at)}` : ''}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map((category) => {
            const active = selectedCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  active && {
                    borderColor: theme.accent,
                    backgroundColor: `${theme.accent}22`,
                  },
                ]}
                onPress={() => spinDare(category.id)}
              >
                <Ionicons
                  name={category.icon}
                  size={18}
                  color={active ? theme.accent : colors.textSecondary}
                />
                <Text style={[styles.categoryText, active && { color: theme.accent }]}>
                  {category.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Card style={[styles.dareCard, { borderColor: `${theme.accent}66` }]}>
          <Card.Content style={styles.dareContent}>
            <Text style={[styles.dareLabel, { color: theme.accent }]}>
              {categories.find((category) => category.id === selectedCategory)?.title}
            </Text>
            <Text style={styles.dareText}>{currentDare.text}</Text>
            <Text style={[styles.dareSource, { color: theme.accent }]}>
              {currentDare.source === 'owner'
                ? 'Owner dare'
                : currentDare.source === 'admin'
                ? 'Admin dare'
                : 'Built-in dare'}
            </Text>
            <View style={styles.dareActions}>
              <Button
                title="Spin Again"
                variant="outline"
                color={theme.accent}
                onPress={() => spinDare()}
                style={styles.dareButton}
              />
              <Button
                title="Completed"
                variant="primary"
                color={theme.accent}
                onPress={completeDare}
                style={styles.dareButton}
              />
            </View>
          </Card.Content>
        </Card>

        <View style={styles.secondaryActions}>
          {isOwner && (
            <TouchableOpacity
              style={[styles.photoProofButton, { borderColor: theme.accent, marginBottom: spacing.sm }]}
              onPress={() => setManageVisible(true)}
            >
              <Ionicons name="add-circle" size={20} color={theme.accent} />
              <Text style={[styles.photoProofText, { color: theme.accent }]}>Manage Owner Games</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.photoProofButton, { borderColor: theme.accent }]}
            onPress={() => navigation.navigate('Gallery')}
          >
            <Ionicons name="camera" size={20} color={theme.accent} />
            <Text style={[styles.photoProofText, { color: theme.accent }]}>Add Photo Proof</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recently Completed</Text>
        {completed.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Completed dares will show here.</Text>
          </View>
        ) : (
          completed.map((dare, index) => (
            <View key={`${dare}-${index}`} style={styles.completedRow}>
              <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
              <Text style={styles.completedText}>{dare}</Text>
            </View>
          ))
        )}

        {selectedCategory === 'drinks' && (
          <Text style={styles.drinkNote}>
            Keep drinking games optional and sensible. Water rounds count.
          </Text>
        )}
      </ScrollView>

      <Modal visible={manageVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Owner Games</Text>
              <TouchableOpacity onPress={() => setManageVisible(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TextInput
              label="New Dare"
              placeholder="e.g., Get a photo with someone wearing blue"
              value={newDareText}
              onChangeText={setNewDareText}
              multiline
              numberOfLines={3}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    newDareCategory === category.id && {
                      borderColor: theme.accent,
                      backgroundColor: `${theme.accent}22`,
                    },
                  ]}
                  onPress={() => setNewDareCategory(category.id)}
                >
                  <Text style={[styles.categoryText, newDareCategory === category.id && { color: theme.accent }]}>
                    {category.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Button
              title="Add Dare"
              variant="primary"
              color={theme.accent}
              loading={savingDare}
              onPress={saveOwnerDare}
              style={styles.modalButton}
            />

            <ScrollView style={styles.ownerDareList}>
              {customDares.filter((dare) => dare.event_id === session?.event_id).length === 0 ? (
                <Text style={styles.emptyText}>No owner dares yet.</Text>
              ) : (
                customDares
                  .filter((dare) => dare.event_id === session?.event_id)
                  .map((dare) => (
                    <View key={dare.id} style={styles.ownerDareRow}>
                      <Text style={styles.ownerDareText}>{dare.text}</Text>
                      <TouchableOpacity onPress={() => deleteOwnerDare(dare)}>
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))
              )}
            </ScrollView>

            <View style={styles.modalDivider} />

            <Text style={styles.ownerSectionTitle}>Owner Spinner Choices</Text>
            <TextInput
              label="Spinner Title"
              placeholder="e.g., Drink or Dare"
              value={newPairTitle}
              onChangeText={setNewPairTitle}
            />
            <View style={styles.pairInputRow}>
              <TextInput
                label="Choice One"
                placeholder="Drink"
                value={newPairLeft}
                onChangeText={setNewPairLeft}
                style={styles.pairInput}
              />
              <TextInput
                label="Choice Two"
                placeholder="Dare"
                value={newPairRight}
                onChangeText={setNewPairRight}
                style={styles.pairInput}
              />
            </View>
            <TextInput
              label="Choice One Detail"
              placeholder="e.g., Take two sips"
              value={newPairLeftDetail}
              onChangeText={setNewPairLeftDetail}
            />
            <TextInput
              label="Choice Two Detail"
              placeholder="e.g., Pick a dare card"
              value={newPairRightDetail}
              onChangeText={setNewPairRightDetail}
            />
            <Button
              title="Add Spinner Choice"
              variant="primary"
              color={theme.accent}
              loading={savingPair}
              onPress={saveOwnerSpinnerPair}
              style={styles.modalButton}
            />

            <ScrollView style={styles.ownerDareList}>
              {customSpinnerPairs.filter((pair) => pair.event_id === session?.event_id).length === 0 ? (
                <Text style={styles.emptyText}>No owner spinner choices yet.</Text>
              ) : (
                customSpinnerPairs
                  .filter((pair) => pair.event_id === session?.event_id)
                  .map((pair) => (
                    <View key={pair.id} style={styles.ownerDareRow}>
                      <View style={styles.ownerDareSummary}>
                        <Text style={styles.ownerDareText}>{pair.title}</Text>
                        <Text style={styles.ownerPairChoices}>{pair.left} / {pair.right}</Text>
                      </View>
                      <TouchableOpacity onPress={() => deleteOwnerSpinnerPair(pair)}>
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))
              )}
            </ScrollView>
            </ScrollView>
          </View>
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  heroText: {
    flex: 1,
  },
  eyebrow: {
    ...typography.caption,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  heroIcon: {
    fontSize: 44,
    marginLeft: spacing.md,
  },
  categoryRow: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dareCard: {
    marginBottom: spacing.lg,
  },
  spinnerCard: {
    marginBottom: spacing.lg,
  },
  spinnerContent: {
    padding: spacing.lg,
  },
  spinnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  spinnerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  wheelStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  wheelPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.text,
    marginBottom: -2,
    zIndex: 2,
  },
  wheelFrame: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.text,
  },
  wheelText: {
    ...typography.button,
    color: colors.text,
    textAlign: 'center',
  },
  wheelLabelTop: {
    position: 'absolute',
    top: 34,
    left: 18,
    right: 18,
    alignItems: 'center',
  },
  wheelLabelBottom: {
    position: 'absolute',
    bottom: 34,
    left: 18,
    right: 18,
    alignItems: 'center',
  },
  spinnerHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  spinnerResult: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  spinnerPerson: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
  },
  spinnerAction: {
    ...typography.h3,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  spinnerDetail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  spinnerRole: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  sharedSpinCard: {
    marginBottom: spacing.lg,
  },
  sharedSpinContent: {
    padding: spacing.lg,
  },
  sharedSpinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sharedSpinTitle: {
    ...typography.h3,
    color: colors.text,
  },
  sharedSpinRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sharedSpinIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  sharedSpinTextWrap: {
    flex: 1,
  },
  sharedSpinText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '700',
  },
  sharedSpinMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  dareContent: {
    padding: spacing.lg,
  },
  dareLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  dareText: {
    ...typography.h2,
    color: colors.text,
    lineHeight: 32,
    marginBottom: spacing.lg,
  },
  dareSource: {
    ...typography.caption,
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
  },
  dareActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dareButton: {
    flex: 1,
  },
  secondaryActions: {
    marginBottom: spacing.xl,
  },
  photoProofButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  photoProofText: {
    ...typography.button,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
  completedRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  completedText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  drinkNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.76)',
    justifyContent: 'flex-end',
  },
  modalPanel: {
    maxHeight: '86%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
  },
  modalButton: {
    marginBottom: spacing.lg,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  ownerSectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  pairInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pairInput: {
    flex: 1,
  },
  ownerDareList: {
    maxHeight: 220,
  },
  ownerDareRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  ownerDareText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  ownerDareSummary: {
    flex: 1,
  },
  ownerPairChoices: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

export default DaresScreen;
