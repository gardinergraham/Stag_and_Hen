# Stag & Hen Wear OS Companion Prototype

This folder is a dormant prototype for a future Android watch companion app.
It is not wired into the current Expo/EAS Android build, so it will not affect
the Play Store build until a native Wear OS module is added later.

## First Watch Feature

Owner QR sharing:

- The phone app prepares the current event invite payload.
- The watch displays the event name, crew PIN, and a scannable QR code.
- Crew members scan the watch QR from their phones to join the event.

## Payload Shape

```json
{
  "eventName": "Sarah's Hen Weekend",
  "accessPin": "123456",
  "qrData": "stagandhen://join?data=...",
  "updatedAt": "2026-05-28T10:00:00.000Z"
}
```

## Integration Plan

1. Keep this prototype folder out of the shipping build for now.
2. After the Android store build is stable, add a native Wear OS app module.
3. Add these Kotlin files to the Wear OS module.
4. Use the Wearable Data Layer API from the phone app to send the payload.
5. Add future watch cards for missions, points, countdowns, spinner, and chaos mode.

## Future Watch Features

- Secret mission alerts: discreet haptic mission cards with completion actions.
- Crew points glance: show the owner's leaderboard and recent awards.
- Party countdowns: next pub, taxi, game round, or upload-window reminders.
- Dare spinner: quick random dare by intensity.
- Chaos mode: owner-triggered group challenge notifications.

## Current Status

- Wear OS UI prototype exists.
- QR screen layout and payload model are sketched in Kotlin.
- Phone-to-watch transport is not wired yet.
