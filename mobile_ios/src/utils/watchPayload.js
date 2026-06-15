export const watchPartyCards = [
  {
    id: 'story-time',
    title: 'Story Time',
    prompt: 'Tell the funniest memory you have with the guest of honour.',
    points: 10,
  },
  {
    id: 'photo-proof',
    title: 'Photo Proof',
    prompt: 'Take a group selfie with everyone doing the same dramatic pose.',
    points: 15,
  },
  {
    id: 'mini-toast',
    title: 'Mini Toast',
    prompt: 'Give a short toast to the bride or groom.',
    points: 15,
  },
  {
    id: 'find-colour',
    title: 'Find the Colour',
    prompt: 'Find something that matches the party colour and get photo proof.',
    points: 10,
  },
];

export const watchSpinnerChoices = [
  {
    id: 'forfeit-pass',
    title: 'Forfeit or Free Pass',
    left: 'Forfeit',
    right: 'Free Pass',
  },
  {
    id: 'truth-photo',
    title: 'Truth or Photo',
    left: 'Truth',
    right: 'Photo',
  },
  {
    id: 'solo-group',
    title: 'Solo or Group',
    left: 'Solo',
    right: 'Group',
  },
];

export const watchMissionPrompts = [
  'Get someone to say a secret word.',
  'Take a selfie with the guest of honour.',
  'Start a group cheer without explaining why.',
  'Convince someone it is your birthday.',
];

export const buildWatchInvitePayload = ({ session, qrData }) => {
  if (!session || !qrData?.qr_data) {
    return null;
  }

  return {
    version: 1,
    eventName: qrData.event_name || session.event_name || '',
    accessPin: qrData.access_pin || session.access_pin || '',
    qrData: qrData.qr_data,
    eventType: session.event_type || 'stag',
    games: {
      partyCards: watchPartyCards,
      spinnerChoices: watchSpinnerChoices,
      missionPrompts: watchMissionPrompts,
    },
    updatedAt: new Date().toISOString(),
  };
};
