export const buildWatchInvitePayload = ({ session, qrData }) => {
  if (!session || !qrData?.qr_data) {
    return null;
  }

  return {
    eventName: qrData.event_name || session.event_name || '',
    accessPin: qrData.access_pin || session.access_pin || '',
    qrData: qrData.qr_data,
    updatedAt: new Date().toISOString(),
  };
};
