# Stag & Hen Watch Companion Prototype

This folder is a dormant prototype for the future Apple Watch companion app.
It is not wired into the current Expo/EAS iOS build, so it will not affect the
App Store review build until a native iOS/watchOS target is added later.

## First Watch Feature

Owner QR sharing:

- The iPhone app prepares the current event invite payload.
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
2. After the current app is approved, generate/prebuild the native iOS project.
3. Add a Watch App target in Xcode.
4. Add these Swift files to the Watch target.
5. Use WatchConnectivity from the iOS app to send the payload to the watch.
6. Add future notification actions for missions, points, countdowns, and chaos mode.

## Future Watch Features

- Secret mission alerts: discreet haptic mission cards with completion actions.
- Crew points glance: show the owner's leaderboard and recent awards.
- Party countdowns: next pub, taxi, game round, or upload-window reminders.
- Dare spinner: quick random dare by intensity.
- Chaos mode: owner-triggered group challenge notifications.

## Wear OS Note

The Android app is also Expo-managed, so the same approach applies there: keep
the first Wear OS work as a separate native companion project until the mobile
store build is settled. The shared payload should stay platform-neutral:
event name, access PIN, QR join string, and optional mission/points fields.

## Current Status

- SwiftUI watch UI prototype exists.
- QR code rendering is implemented using CoreImage.
- Mock payload exists for preview/development.
- iPhone-to-watch transport is not wired yet.
