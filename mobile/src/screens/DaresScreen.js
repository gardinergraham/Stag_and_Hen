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
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path } from 'react-native-svg';
import { colors, typography, spacing, getEventTheme } from '../theme';
import { Button, Card, TextInput } from '../components';
import { useApp } from '../context/AppContext';
import api, { daresApi, eventsApi, pointsApi } from '../services/api';

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

const gameModes = [
  {
    id: 'spinner',
    title: 'Spinner',
    subtitle: 'Pick a person and a forfeit',
    icon: 'navigate',
    category: null,
  },
  {
    id: 'dares',
    title: 'Dares',
    subtitle: 'Quick cards for the crew',
    icon: 'sparkles',
    category: 'warmup',
  },
  {
    id: 'photo',
    title: 'Photo Challenges',
    subtitle: 'Create gallery moments',
    icon: 'camera',
    category: 'photo',
  },
  {
    id: 'drinks',
    title: 'Drinking Games',
    subtitle: 'Optional rounds and rules',
    icon: 'beer',
    category: 'drinks',
  },
  {
    id: 'missions',
    title: 'Secret Missions',
    subtitle: 'Private tasks for each guest',
    icon: 'eye',
    category: null,
  },
  {
    id: 'messages',
    title: 'Video Messages',
    subtitle: 'Advice and memories to keep',
    icon: 'videocam',
    category: null,
  },
];

const messagePrompts = [
  'Best memory',
  'Advice',
  'Future wishes',
  'Toast',
  'Prediction',
];

const henGameModes = [
  {
    id: 'purse',
    title: 'Bag Game',
    subtitle: 'Score what is in your bag',
    icon: 'bag-handle',
    category: null,
  },
  {
    id: 'brideQuiz',
    title: 'Bride Quiz',
    subtitle: 'How well do you know her?',
    icon: 'heart',
    category: null,
  },
];

const purseItems = [
  { name: 'Gum or mints', points: 1 },
  { name: 'Nail polish', points: 1 },
  { name: 'Cash note', points: 1 },
  { name: 'Tissue', points: 1 },
  { name: 'Hand sanitizer', points: 1 },
  { name: 'Lipstick', points: 1 },
  { name: 'Lotion', points: 5 },
  { name: 'Library card', points: 5 },
  { name: 'Hair tie', points: 5 },
  { name: 'Coupons', points: 5 },
  { name: 'Chocolate', points: 5 },
  { name: 'Receipts', points: 5 },
  { name: 'Cell phone', points: 10 },
  { name: 'Key', points: 10 },
  { name: 'Lip balm', points: 10 },
  { name: 'Credit card', points: 10 },
  { name: 'Driving licence', points: 10 },
  { name: 'Pen', points: 10 },
  { name: 'Photo of the bride', points: 15 },
  { name: 'Pepper spray', points: 15 },
  { name: 'Underwear', points: 15 },
  { name: 'Photo of the groom', points: 15 },
  { name: 'Mini bottle', points: 15 },
  { name: 'Foreign currency', points: 15 },
  { name: 'Notebook', points: 20 },
  { name: 'Medicine', points: 20 },
  { name: 'Perfume', points: 20 },
  { name: 'Toothbrush', points: 20 },
  { name: 'Gift card', points: 20 },
  { name: 'Movie ticket stub', points: 20 },
  { name: 'Sewing kit', points: 25 },
  { name: 'Band-aid', points: 25 },
  { name: 'Postage stamp', points: 25 },
  { name: 'Take-out menu', points: 25 },
  { name: 'Spoon or fork', points: 25 },
  { name: 'Passport', points: 25 },
];

const brideQuizQuestions = [
  'What is her middle name?',
  'When is her birthday?',
  'What is her favourite food?',
  'What is her shoe size?',
  'Stay in or go out?',
  'Call or text?',
  'Singing or dancing?',
  'When is the wedding date?',
  'Where did she meet the groom?',
  'Where did the groom propose?',
  'How long has the bride dated the groom?',
  'How many children does she want?',
  'Is she a cat or dog person?',
  'Red wine or white wine?',
  'Lipstick or lip gloss?',
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
  const [selectedGameMode, setSelectedGameMode] = useState('spinner');
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
  const [spinResultsVisible, setSpinResultsVisible] = useState(false);
  const [secretMission, setSecretMission] = useState(null);
  const [missionCompletions, setMissionCompletions] = useState([]);
  const [missionEvidence, setMissionEvidence] = useState('');
  const [purseChecked, setPurseChecked] = useState({});
  const [purseScores, setPurseScores] = useState([]);
  const [submittingPurseScore, setSubmittingPurseScore] = useState(false);
  const [loadingMission, setLoadingMission] = useState(false);
  const [completingMission, setCompletingMission] = useState(false);
  const [awardVisible, setAwardVisible] = useState(false);
  const [awardTarget, setAwardTarget] = useState(null);
  const [awardPoints, setAwardPoints] = useState('10');
  const [awardReason, setAwardReason] = useState('');
  const [awardingPoints, setAwardingPoints] = useState(false);
  const [selectedMessagePrompt, setSelectedMessagePrompt] = useState(messagePrompts[0]);
  const [uploadingMessage, setUploadingMessage] = useState(false);
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

  const loadSecretMission = async () => {
    const memberName = session?.member_name || session?.owner_name;
    if (session?.is_preview || !session?.event_id || !memberName) return;
    try {
      const response = await daresApi.getSecretMission(session.event_id, memberName);
      setSecretMission(response.data || null);
    } catch (error) {
      console.log('Could not load secret mission:', error?.response?.data || error.message);
    }
  };

  const loadMissionCompletions = async () => {
    if (session?.is_preview || !session?.event_id) return;
    try {
      const response = await daresApi.getSecretMissionCompletions(session.event_id);
      setMissionCompletions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log('Could not load mission completions:', error?.response?.data || error.message);
    }
  };

  const loadPurseScores = async () => {
    if (session?.is_preview || !session?.event_id) return;
    try {
      const response = await daresApi.getPurseScores(session.event_id);
      setPurseScores(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log('Could not load bag scores:', error?.response?.data || error.message);
    }
  };

  useEffect(() => {
    loadCustomDares();
    loadCustomSpinnerPairs();
    loadSpinTargets();
    loadRecentSpinResults();
    loadSecretMission();
    loadMissionCompletions();
    loadPurseScores();
  }, [session?.event_id, session?.event_type]);

  useEffect(() => {
    if (session?.is_preview || !session?.event_id) return undefined;

    const interval = setInterval(loadRecentSpinResults, 8000);
    return () => clearInterval(interval);
  }, [session?.event_id, session?.is_preview]);

  useEffect(() => {
    if (session?.is_preview || !session?.event_id) return undefined;

    const interval = setInterval(loadMissionCompletions, 12000);
    return () => clearInterval(interval);
  }, [session?.event_id, session?.is_preview]);

  useEffect(() => {
    if (session?.is_preview || !session?.event_id || session?.event_type !== 'hen') return undefined;

    const interval = setInterval(loadPurseScores, 12000);
    return () => clearInterval(interval);
  }, [session?.event_id, session?.event_type, session?.is_preview]);

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
  const visibleGameModes = session?.event_type === 'hen' ? [...gameModes, ...henGameModes] : gameModes;
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
  const pointAwardTargets = spinTargets.filter((target) => target.label !== 'Owner');
  const purseScore = purseItems.reduce((total, item) => (purseChecked[item.name] ? total + item.points : total), 0);
  const purseGroups = [1, 5, 10, 15, 20, 25].map((points) => ({
    points,
    items: purseItems.filter((item) => item.points === points),
  }));

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

  const selectGameMode = (mode) => {
    setSelectedGameMode(mode.id);
    if (mode.category) {
      spinDare(mode.category);
    }
  };

  const drawSecretMission = async (forceNew = false) => {
    const memberName = session?.member_name || session?.owner_name;
    if (!memberName) {
      Alert.alert('Name Needed', 'Join the event with your name first.');
      return;
    }

    if (session?.is_preview) {
      setSecretMission({
        id: `preview-mission-${Date.now()}`,
        mission_text: 'Convince someone it is your birthday without saying the word birthday.',
        is_completed: false,
      });
      setMissionEvidence('');
      return;
    }

    setLoadingMission(true);
    try {
      const response = await daresApi.assignSecretMission({
        event_id: session.event_id,
        member_name: memberName,
        force_new: forceNew,
      });
      setSecretMission({
        ...response.data,
        is_completed: false,
        evidence: null,
      });
      setMissionEvidence('');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Could not draw your mission.');
    } finally {
      setLoadingMission(false);
    }
  };

  const drawAnotherSecretMission = () => {
    setSecretMission(null);
    setMissionEvidence('');
    setTimeout(() => drawSecretMission(true), 0);
  };

  const completeSecretMission = async () => {
    if (!secretMission) return;
    const memberName = session?.member_name || session?.owner_name;
    const evidence = missionEvidence.trim();

    if (!evidence) {
      Alert.alert('Evidence Needed', 'Add a quick note about how you completed the mission.');
      return;
    }

    if (session?.is_preview) {
      setSecretMission((current) => ({ ...current, is_completed: true, evidence }));
      setMissionCompletions((current) => [
        {
          id: secretMission.id,
          event_id: session?.event_id || 'preview',
          member_name: memberName || 'Preview Guest',
          mission_text: secretMission.mission_text,
          evidence,
          is_completed: true,
          completed_at: new Date().toISOString(),
        },
        ...current,
      ]);
      return;
    }

    setCompletingMission(true);
    try {
      const response = await daresApi.completeSecretMission(secretMission.id, memberName, evidence);
      setSecretMission(response.data);
      setMissionEvidence('');
      await loadMissionCompletions();
      Alert.alert('Mission Complete', 'Your mission and evidence have been logged.');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Could not complete your mission.');
    } finally {
      setCompletingMission(false);
    }
  };

  const deleteCompletedMission = (mission) => {
    if (!isOwner || !session?.owner_pin) return;

    Alert.alert('Delete Mission', `Remove ${mission.member_name}'s completed mission?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await daresApi.deleteSecretMission(mission.id, session.owner_pin);
            await loadMissionCompletions();
          } catch (error) {
            Alert.alert('Error', error?.response?.data?.detail || 'Could not delete this mission.');
          }
        },
      },
    ]);
  };

  const uploadVideoMessage = async (asset) => {
    const memberName = session?.member_name || session?.owner_name;
    if (session?.is_preview) {
      Alert.alert('Preview Mode', 'Create an event to save real video messages.');
      return;
    }
    if (!session?.event_id || !memberName) {
      Alert.alert('Event Needed', 'Join an event before adding a video message.');
      return;
    }

    setUploadingMessage(true);
    try {
      const fileName = asset.fileName || asset.uri.split('/').pop() || `video-message-${Date.now()}.mp4`;
      const mimeType = asset.mimeType || 'video/mp4';
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      });

      const uploadResponse = await fetch(`${api.defaults.baseURL}/media/upload-file`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(uploadData.detail || 'Upload failed');
      }

      await api.post('/media/', {
        event_id: session.event_id,
        uploaded_by: memberName,
        file_url: uploadData.file_url,
        media_type: 'video',
        caption: `Video Message: ${selectedMessagePrompt}`,
        thumbnail_url: null,
      });

      Alert.alert('Message Saved', 'Your video message has been added to the event gallery.');
    } catch (error) {
      Alert.alert('Upload Failed', error.message || 'Could not upload this video message.');
    } finally {
      setUploadingMessage(false);
    }
  };

  const recordVideoMessage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to record a video message.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      videoMaxDuration: 60,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      await uploadVideoMessage(result.assets[0]);
    }
  };

  const chooseVideoMessage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      await uploadVideoMessage(result.assets[0]);
    }
  };

  const completeDare = () => {
    setCompleted((current) => [currentDare.text, ...current.filter((dare) => dare !== currentDare.text)].slice(0, 5));
    Alert.alert('Dare Complete', 'Nice. Add photo proof to the gallery if it deserves to live forever.');
  };

  const togglePurseItem = (itemName) => {
    setPurseChecked((current) => ({
      ...current,
      [itemName]: !current[itemName],
    }));
  };

  const resetPurseScore = () => {
    setPurseChecked({});
  };

  const submitPurseScore = async () => {
    const memberName = session?.member_name || session?.owner_name;
    const itemCount = Object.values(purseChecked).filter(Boolean).length;

    if (!memberName) {
      Alert.alert('Name Needed', 'Join the event with your name first.');
      return;
    }
    if (purseScore <= 0) {
      Alert.alert('No Bag Score', 'Tick the items found in the bag before sending the score.');
      return;
    }
    if (session?.is_preview) {
      const previewScore = {
        id: `preview-bag-${Date.now()}`,
        event_id: 'preview',
        member_name: memberName,
        score: purseScore,
        item_count: itemCount,
        created_at: new Date().toISOString(),
      };
      setPurseScores((current) => [previewScore, ...current].slice(0, 30));
      Alert.alert('Score Sent', 'Preview bag score added to the board.');
      return;
    }

    setSubmittingPurseScore(true);
    try {
      const response = await daresApi.createPurseScore({
        event_id: session.event_id,
        member_name: memberName,
        score: purseScore,
        item_count: itemCount,
      });
      const savedScore = response.data;
      setPurseScores((current) => [savedScore, ...current.filter((item) => item.id !== savedScore.id)].slice(0, 30));
      Alert.alert('Score Sent', 'Your bag score has been shared with the organiser.');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Could not send your bag score.');
    } finally {
      setSubmittingPurseScore(false);
    }
  };

  const canAwardPointsTo = (name, label) => Boolean(isOwner && name && label !== 'Owner');

  const openPointAward = ({ memberName, reason, defaultPoints = '10' }) => {
    if (session?.is_preview) {
      Alert.alert('Preview Mode', 'Create an event to award real points.');
      return;
    }
    if (!session?.event_id || !session?.owner_pin) {
      Alert.alert('Owner Access Needed', 'Only the organiser can award points.');
      return;
    }
    setAwardTarget(memberName);
    setAwardReason(reason);
    setAwardPoints(defaultPoints);
    setAwardVisible(true);
  };

  const awardGamePoints = async () => {
    const parsedPoints = Number.parseInt(awardPoints, 10);
    if (!awardTarget || !Number.isFinite(parsedPoints) || parsedPoints <= 0) {
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
          member_name: awardTarget,
          points: parsedPoints,
          reason: awardReason.trim(),
        },
        session.owner_pin
      );
      setAwardVisible(false);
      Alert.alert('Points Awarded', `${awardTarget} received ${parsedPoints} points.`);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Could not award points.');
    } finally {
      setAwardingPoints(false);
    }
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

        <View style={styles.modeGrid}>
          {visibleGameModes.map((mode) => {
            const active = selectedGameMode === mode.id;
            return (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.modeCard,
                  active && {
                    borderColor: theme.accent,
                    backgroundColor: `${theme.accent}18`,
                  },
                ]}
                onPress={() => selectGameMode(mode)}
              >
                <Ionicons name={mode.icon} size={22} color={active ? theme.accent : colors.textSecondary} />
                <Text style={[styles.modeTitle, active && { color: theme.accent }]}>{mode.title}</Text>
                <Text style={styles.modeSubtitle}>{mode.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedGameMode === 'spinner' && (
          <>
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
                {canAwardPointsTo(spinnerResult.target.name, spinnerResult.target.label) && (
                  <TouchableOpacity
                    style={[styles.inlineAwardButton, { borderColor: theme.accent }]}
                    onPress={() =>
                      openPointAward({
                        memberName: spinnerResult.target.name,
                        reason: `${spinnerResult.spinnerTitle}: ${spinnerResult.action}`,
                      })
                    }
                  >
                    <Ionicons name="trophy" size={16} color={theme.accent} />
                    <Text style={[styles.inlineAwardText, { color: theme.accent }]}>Award points</Text>
                  </TouchableOpacity>
                )}
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
              <View style={styles.sharedSpinActions}>
                <TouchableOpacity onPress={loadRecentSpinResults} style={styles.sharedSpinIconButton}>
                  <Ionicons name="refresh" size={20} color={theme.accent} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSpinResultsVisible((visible) => !visible)}
                  style={styles.sharedSpinToggle}
                >
                  <Text style={[styles.sharedSpinToggleText, { color: theme.accent }]}>
                    {spinResultsVisible ? 'Hide' : `Show ${recentSpinResults.length}`}
                  </Text>
                  <Ionicons
                    name={spinResultsVisible ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.accent}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {!spinResultsVisible ? (
              <Text style={styles.spinnerHint}>
                {recentSpinResults.length
                  ? `${recentSpinResults.length} shared spin${recentSpinResults.length === 1 ? '' : 's'} saved.`
                  : 'Spin results from the crew will show here.'}
              </Text>
            ) : (
              <>
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
                      {canAwardPointsTo(result.target_name, result.target_label) && (
                        <TouchableOpacity
                          style={[styles.rowAwardButton, { borderColor: theme.accent }]}
                          onPress={() =>
                            openPointAward({
                              memberName: result.target_name,
                              reason: `${result.spinner_title}: ${result.action}`,
                            })
                          }
                        >
                          <Ionicons name="trophy" size={16} color={theme.accent} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </>
            )}
            {!spinResultsVisible && recentSpinResults[0] ? (
              <View style={styles.sharedSpinRowCompact}>
                <Ionicons name="navigate" size={16} color={theme.accent} />
                <Text style={styles.sharedSpinCompactText} numberOfLines={1}>
                  Latest: {recentSpinResults[0].target_name} got {recentSpinResults[0].action}
                </Text>
              </View>
            ) : null}
          </Card.Content>
        </Card>
          </>
        )}

        {selectedGameMode === 'missions' && (
          <>
            <Card style={[styles.missionCard, { borderColor: `${theme.accent}66` }]}>
              <Card.Content style={styles.missionContent}>
                <View style={styles.missionHeader}>
                  <View>
                    <Text style={[styles.dareLabel, { color: theme.accent }]}>Complete the Mission</Text>
                    <Text style={styles.missionTitle}>Your Secret Mission</Text>
                  </View>
                  <Ionicons name="eye-off" size={24} color={theme.accent} />
                </View>

                {secretMission ? (
                  <View style={styles.secretMissionBox}>
                    <Text style={styles.secretMissionText}>{secretMission.mission_text}</Text>
                    <Text style={styles.secretMissionHint}>
                      Keep it quiet. The crew only sees that you completed a mission.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.secretMissionBox}>
                    <Text style={styles.secretMissionText}>Draw a private mission for this event.</Text>
                    <Text style={styles.secretMissionHint}>
                      Make someone say a word, get a funny selfie, or start a tiny bit of harmless chaos.
                    </Text>
                  </View>
                )}

                {secretMission?.is_completed ? (
                  <>
                    <View style={styles.missionCompleteBadge}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      <Text style={styles.missionCompleteText}>Mission completed</Text>
                    </View>
                    <Button
                      title="Draw Another Mission"
                      variant="primary"
                      color={theme.accent}
                      loading={loadingMission}
                      onPress={drawAnotherSecretMission}
                      style={styles.modalButton}
                    />
                  </>
                ) : (
                  <>
                    {secretMission && (
                      <TextInput
                        label="Evidence"
                        placeholder="e.g., Got Dave to say pineapple at the bar"
                        value={missionEvidence}
                        onChangeText={setMissionEvidence}
                        multiline
                        numberOfLines={3}
                      />
                    )}
                    <View style={styles.dareActions}>
                      <Button
                        title={secretMission ? 'Keep Mission' : 'Draw Mission'}
                        variant={secretMission ? 'outline' : 'primary'}
                        color={theme.accent}
                        loading={loadingMission}
                        onPress={() => drawSecretMission(false)}
                        style={styles.dareButton}
                      />
                      {secretMission && (
                        <Button
                          title="Completed"
                          variant="primary"
                          color={theme.accent}
                          loading={completingMission}
                          onPress={completeSecretMission}
                          style={styles.dareButton}
                        />
                      )}
                    </View>
                  </>
                )}
              </Card.Content>
            </Card>

            <Card style={styles.sharedSpinCard}>
              <Card.Content style={styles.sharedSpinContent}>
                <View style={styles.sharedSpinHeader}>
                  <View>
                    <Text style={[styles.dareLabel, { color: theme.accent }]}>Mission Board</Text>
                    <Text style={styles.sharedSpinTitle}>Completed Missions</Text>
                  </View>
                  <TouchableOpacity onPress={loadMissionCompletions} style={styles.sharedSpinIconButton}>
                    <Ionicons name="refresh" size={20} color={theme.accent} />
                  </TouchableOpacity>
                </View>
                {missionCompletions.length === 0 ? (
                  <Text style={styles.spinnerHint}>Completed missions will show here without revealing the secrets.</Text>
                ) : (
                  missionCompletions.slice(0, 6).map((mission) => (
                    <View key={mission.id} style={styles.missionBoardRow}>
                      <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
                      <View style={styles.missionBoardTextWrap}>
                        {isOwner ? (
                          <>
                            <Text style={styles.completedText}>{mission.member_name} completed:</Text>
                            <Text style={styles.missionBoardMission}>{mission.mission_text}</Text>
                            {mission.evidence ? (
                              <Text style={styles.missionBoardEvidence}>Evidence: {mission.evidence}</Text>
                            ) : null}
                          </>
                        ) : (
                          <Text style={styles.completedText}>{mission.member_name} completed a secret mission</Text>
                        )}
                      </View>
                      {isOwner && (
                        <View style={styles.missionRowActions}>
                          <TouchableOpacity
                            style={[styles.rowAwardButton, { borderColor: theme.accent }]}
                            onPress={() =>
                              openPointAward({
                                memberName: mission.member_name,
                                reason: `Secret mission: ${mission.mission_text}`,
                                defaultPoints: '20',
                              })
                            }
                          >
                            <Ionicons name="trophy" size={16} color={theme.accent} />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.rowDeleteButton} onPress={() => deleteCompletedMission(mission)}>
                            <Ionicons name="trash-outline" size={20} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </Card.Content>
            </Card>
          </>
        )}

        {selectedGameMode === 'messages' && (
          <Card style={[styles.missionCard, { borderColor: `${theme.accent}66` }]}>
            <Card.Content style={styles.missionContent}>
              <View style={styles.missionHeader}>
                <View>
                  <Text style={[styles.dareLabel, { color: theme.accent }]}>Messages & Advice</Text>
                  <Text style={styles.missionTitle}>Record a Keepsake</Text>
                </View>
                <Ionicons name="videocam" size={24} color={theme.accent} />
              </View>

              <Text style={styles.secretMissionHint}>
                Pick a prompt, then record a short video for the bride or groom. It saves into the event gallery.
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                {messagePrompts.map((prompt) => {
                  const active = selectedMessagePrompt === prompt;
                  return (
                    <TouchableOpacity
                      key={prompt}
                      style={[
                        styles.categoryChip,
                        active && {
                          borderColor: theme.accent,
                          backgroundColor: `${theme.accent}22`,
                        },
                      ]}
                      onPress={() => setSelectedMessagePrompt(prompt)}
                    >
                      <Text style={[styles.categoryText, active && { color: theme.accent }]}>
                        {prompt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.secretMissionBox}>
                <Text style={styles.secretMissionText}>{selectedMessagePrompt}</Text>
                <Text style={styles.secretMissionHint}>
                  Suggested length: 10-60 seconds. Funny, heartfelt, or both.
                </Text>
              </View>

              <View style={styles.dareActions}>
                <Button
                  title="Record"
                  variant="primary"
                  color={theme.accent}
                  loading={uploadingMessage}
                  onPress={recordVideoMessage}
                  style={styles.dareButton}
                />
                <Button
                  title="Choose Video"
                  variant="outline"
                  color={theme.accent}
                  loading={uploadingMessage}
                  onPress={chooseVideoMessage}
                  style={styles.dareButton}
                />
              </View>

              <TouchableOpacity
                style={[styles.photoProofButton, { borderColor: theme.accent, marginTop: spacing.lg }]}
                onPress={() => navigation.navigate('Gallery')}
              >
                <Ionicons name="images" size={20} color={theme.accent} />
                <Text style={[styles.photoProofText, { color: theme.accent }]}>View Gallery Messages</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}

        {selectedGameMode === 'purse' && (
          <Card style={[styles.missionCard, { borderColor: `${theme.accent}66` }]}>
            <Card.Content style={styles.missionContent}>
              <View style={styles.missionHeader}>
                <View>
                  <Text style={[styles.dareLabel, { color: theme.accent }]}>Hen Party Game</Text>
                  <Text style={styles.missionTitle}>What is in Your Bag?</Text>
                </View>
                <Ionicons name="bag-handle" size={24} color={theme.accent} />
              </View>

              <View style={[styles.purseScoreCard, { borderColor: theme.accent }]}>
                <Text style={styles.spinnerHint}>Tap every item found in the bag.</Text>
                <Text style={[styles.purseScoreValue, { color: theme.accent }]}>{purseScore} pts</Text>
              </View>

              {purseGroups.map((group) => (
                <View key={group.points} style={styles.purseGroup}>
                  <Text style={[styles.purseGroupTitle, { color: theme.accent }]}>{group.points} point{group.points === 1 ? '' : 's'}</Text>
                  <View style={styles.purseGrid}>
                    {group.items.map((item) => {
                      const checked = Boolean(purseChecked[item.name]);
                      return (
                        <TouchableOpacity
                          key={item.name}
                          style={[
                            styles.purseItem,
                            checked && {
                              borderColor: theme.accent,
                              backgroundColor: `${theme.accent}22`,
                            },
                          ]}
                          onPress={() => togglePurseItem(item.name)}
                        >
                          <Ionicons
                            name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                            size={18}
                            color={checked ? theme.accent : colors.textMuted}
                          />
                          <Text style={styles.purseItemText}>{item.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              <Button
                title="Reset Bag Score"
                variant="outline"
                color={theme.accent}
                onPress={resetPurseScore}
                style={styles.modalButton}
              />
              <Button
                title="Send Score to Organiser"
                variant="primary"
                color={theme.accent}
                loading={submittingPurseScore}
                onPress={submitPurseScore}
                style={styles.modalButton}
              />

              {isOwner && (
                <View style={styles.bagScoreBoard}>
                  <View style={styles.sharedSpinHeader}>
                    <View>
                      <Text style={[styles.dareLabel, { color: theme.accent }]}>Bag Scores</Text>
                      <Text style={styles.sharedSpinTitle}>Sent to Organiser</Text>
                    </View>
                    <TouchableOpacity onPress={loadPurseScores} style={styles.sharedSpinIconButton}>
                      <Ionicons name="refresh" size={20} color={theme.accent} />
                    </TouchableOpacity>
                  </View>
                  {purseScores.length === 0 ? (
                    <Text style={styles.spinnerHint}>Crew bag scores will show here when they send them.</Text>
                  ) : (
                    purseScores.slice(0, 8).map((score) => (
                      <View key={score.id} style={styles.bagScoreRow}>
                        <View style={styles.sharedSpinTextWrap}>
                          <Text style={styles.sharedSpinText}>{score.member_name}</Text>
                          <Text style={styles.sharedSpinMeta}>
                            {score.item_count} item{score.item_count === 1 ? '' : 's'} found
                          </Text>
                        </View>
                        <Text style={[styles.bagScorePoints, { color: theme.accent }]}>{score.score} pts</Text>
                        <TouchableOpacity
                          style={[styles.rowAwardButton, { borderColor: theme.accent }]}
                          onPress={() =>
                            openPointAward({
                              memberName: score.member_name,
                              reason: `Bag game score: ${score.score} pts`,
                              defaultPoints: String(score.score),
                            })
                          }
                        >
                          <Ionicons name="trophy" size={16} color={theme.accent} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              )}

              {isOwner && purseScore > 0 && (
                <View>
                  <Text style={styles.sectionTitle}>Award This Score</Text>
                  <View style={styles.targetAwardGrid}>
                    {pointAwardTargets.map((target) => (
                      <TouchableOpacity
                        key={target.id}
                        style={[styles.targetAwardButton, { borderColor: theme.accent }]}
                        onPress={() =>
                          openPointAward({
                            memberName: target.name,
                            reason: `Bag game score: ${purseScore} pts`,
                            defaultPoints: String(purseScore),
                          })
                        }
                      >
                        <Ionicons name="trophy" size={16} color={theme.accent} />
                        <Text style={[styles.targetAwardText, { color: theme.accent }]}>{target.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {selectedGameMode === 'brideQuiz' && (
          <Card style={[styles.missionCard, { borderColor: `${theme.accent}66` }]}>
            <Card.Content style={styles.missionContent}>
              <View style={styles.missionHeader}>
                <View>
                  <Text style={[styles.dareLabel, { color: theme.accent }]}>Hen Party Quiz</Text>
                  <Text style={styles.missionTitle}>How Well Do You Know The Bride?</Text>
                </View>
                <Ionicons name="heart" size={24} color={theme.accent} />
              </View>

              <Text style={styles.secretMissionHint}>
                Read the questions out, let everyone answer, then the organiser can award points for correct answers.
              </Text>

              <View style={styles.quizList}>
                {brideQuizQuestions.map((question, index) => (
                  <View key={question} style={styles.questionRow}>
                    <Text style={[styles.questionNumber, { color: theme.accent }]}>{index + 1}</Text>
                    <Text style={styles.completedText}>{question}</Text>
                  </View>
                ))}
              </View>

              {isOwner && (
                <View>
                  <Text style={styles.sectionTitle}>Award Quiz Points</Text>
                  <View style={styles.targetAwardGrid}>
                    {pointAwardTargets.map((target) => (
                      <TouchableOpacity
                        key={target.id}
                        style={[styles.targetAwardButton, { borderColor: theme.accent }]}
                        onPress={() =>
                          openPointAward({
                            memberName: target.name,
                            reason: 'How well do you know the bride quiz',
                            defaultPoints: '10',
                          })
                        }
                      >
                        <Ionicons name="trophy" size={16} color={theme.accent} />
                        <Text style={[styles.targetAwardText, { color: theme.accent }]}>{target.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {selectedGameMode === 'dares' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categories
            .filter((category) => category.id === 'warmup' || category.id === 'cheeky')
            .map((category) => {
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
        )}

        {(selectedGameMode === 'dares' || selectedGameMode === 'photo' || selectedGameMode === 'drinks') && (
          <>

        <Card style={[styles.dareCard, { borderColor: `${theme.accent}66` }]}>
          <Card.Content style={styles.dareContent}>
            <Text style={[styles.dareLabel, { color: theme.accent }]}>
              {selectedGameMode === 'photo'
                ? 'Photo Challenge'
                : selectedGameMode === 'drinks'
                ? 'Drinking Game'
                : categories.find((category) => category.id === selectedCategory)?.title}
            </Text>
            <Text style={styles.dareText}>{currentDare.text}</Text>
            <Text style={[styles.dareSource, { color: theme.accent }]}>
              {currentDare.source === 'owner'
                ? selectedGameMode === 'drinks' ? 'Owner card' : 'Owner dare'
                : currentDare.source === 'admin'
                ? selectedGameMode === 'drinks' ? 'Admin card' : 'Admin dare'
                : selectedGameMode === 'drinks' ? 'Built-in card' : 'Built-in dare'}
            </Text>
            <View style={styles.dareActions}>
              <Button
                title={selectedGameMode === 'photo' ? 'New Challenge' : selectedGameMode === 'drinks' ? 'New Round' : 'Spin Again'}
                variant="outline"
                color={theme.accent}
                onPress={() => spinDare(selectedGameMode === 'photo' ? 'photo' : selectedGameMode === 'drinks' ? 'drinks' : selectedCategory)}
                style={styles.dareButton}
              />
              <Button
                title={selectedGameMode === 'photo' ? 'Photo Done' : 'Completed'}
                variant="primary"
                color={theme.accent}
                onPress={completeDare}
                style={styles.dareButton}
              />
            </View>
          </Card.Content>
        </Card>
          </>
        )}

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
          {selectedGameMode !== 'spinner' && selectedGameMode !== 'missions' && selectedGameMode !== 'messages' && selectedGameMode !== 'purse' && selectedGameMode !== 'brideQuiz' && (
            <TouchableOpacity
              style={[styles.photoProofButton, { borderColor: theme.accent }]}
              onPress={() => navigation.navigate('Gallery')}
            >
              <Ionicons name="camera" size={20} color={theme.accent} />
              <Text style={[styles.photoProofText, { color: theme.accent }]}>Add Photo Proof</Text>
            </TouchableOpacity>
          )}
        </View>

        {selectedGameMode !== 'spinner' && selectedGameMode !== 'missions' && selectedGameMode !== 'messages' && selectedGameMode !== 'purse' && selectedGameMode !== 'brideQuiz' && (
          <>
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
          </>
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

      <Modal visible={awardVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          style={styles.awardModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.awardModalCard}>
            <Text style={styles.modalTitle}>Award Points</Text>
            <Text style={styles.awardTarget}>{awardTarget}</Text>
            <TextInput
              label="Points"
              value={awardPoints}
              onChangeText={setAwardPoints}
              keyboardType="number-pad"
              placeholder="10"
            />
            <TextInput
              label="Reason"
              value={awardReason}
              onChangeText={setAwardReason}
              multiline
              numberOfLines={3}
              placeholder="Mission completed, spinner win, best photo proof..."
            />
            <View style={styles.dareActions}>
              <Button
                title="Cancel"
                variant="outline"
                color={theme.accent}
                onPress={() => setAwardVisible(false)}
                style={styles.dareButton}
              />
              <Button
                title="Award"
                variant="primary"
                color={theme.accent}
                loading={awardingPoints}
                onPress={awardGamePoints}
                style={styles.dareButton}
              />
            </View>
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
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modeCard: {
    width: '48%',
    minHeight: 116,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  modeTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  modeSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
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
  inlineAwardButton: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 19,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  inlineAwardText: {
    ...typography.bodySmall,
    fontWeight: '800',
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
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sharedSpinActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sharedSpinIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  sharedSpinToggle: {
    minHeight: 36,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
  },
  sharedSpinToggleText: {
    ...typography.bodySmall,
    fontWeight: '700',
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
  rowAwardButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
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
  sharedSpinRowCompact: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sharedSpinCompactText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  missionCard: {
    marginBottom: spacing.lg,
  },
  missionContent: {
    padding: spacing.lg,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  missionTitle: {
    ...typography.h2,
    color: colors.text,
  },
  secretMissionBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  secretMissionText: {
    ...typography.h3,
    color: colors.text,
    lineHeight: 28,
  },
  secretMissionHint: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  missionCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  missionCompleteText: {
    ...typography.button,
    color: colors.success,
  },
  missionBoardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  missionBoardTextWrap: {
    flex: 1,
  },
  missionBoardMission: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  missionBoardEvidence: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  purseScoreCard: {
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: colors.background,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  purseScoreValue: {
    ...typography.h1,
    marginTop: spacing.xs,
  },
  purseGroup: {
    marginBottom: spacing.lg,
  },
  purseGroupTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  purseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  purseItem: {
    width: '48%',
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  purseItemText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  bagScoreBoard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.background,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bagScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  bagScorePoints: {
    ...typography.h3,
    minWidth: 72,
    textAlign: 'right',
  },
  quizList: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  questionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  questionNumber: {
    ...typography.bodySmall,
    fontWeight: '900',
    width: 24,
  },
  targetAwardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  targetAwardButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 21,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
  },
  targetAwardText: {
    ...typography.bodySmall,
    fontWeight: '800',
  },
  missionRowActions: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  rowDeleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
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
  awardModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.76)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  awardModalCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.lg,
  },
  awardTarget: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
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
