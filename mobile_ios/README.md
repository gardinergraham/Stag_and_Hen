# Stag & Hen Mobile App

The ultimate party planning app for stag and hen parties!

## Features

- 🎉 **Event Management** - Create and manage stag/hen events
- 📸 **Media Sharing** - Share photos and videos with auto-delete options
- 🛍️ **Party Shop** - Browse party essentials with affiliate links
- 💰 **Group Kitty** - Pool money for drinks and activities
- 📲 **QR Access** - Easy crew joining via QR code scan

## Tech Stack

- **Framework**: Expo (React Native)
- **Navigation**: React Navigation
- **State**: React Context + AsyncStorage
- **API**: Axios

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- Android Studio (for Android) or Xcode (for iOS)

### Installation

```bash
# Navigate to mobile folder
cd mobile

# Install dependencies
npm install
# or
yarn install

# Start development server
npx expo start
```

### Running on Device

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

### Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## Configuration

Update the API URL in `/src/services/api.js`:

```javascript
// Replace with your Railway backend URL
const API_BASE_URL = 'https://your-backend.railway.app/api';
```

## Project Structure

```
mobile/
├── App.js                 # App entry point
├── app.json              # Expo config
├── assets/               # Images, fonts
└── src/
    ├── components/       # Reusable UI components
    ├── context/          # React Context providers
    ├── navigation/       # Navigation config
    ├── screens/          # App screens
    ├── services/         # API services
    └── theme.js          # Colors, typography, spacing
```

## Screens

1. **Splash** - Loading screen with logo
2. **Welcome** - Entry point with options
3. **CreateEvent** - Create new stag/hen event
4. **JoinManual** - Join via event name + PIN
5. **ScanQR** - Join via QR code scan
6. **OwnerLogin** - Owner access with owner PIN
7. **Home** - Event dashboard
8. **Gallery** - Media gallery
9. **Shop** - Party shop with affiliate products
10. **Kitty** - Group money pool
11. **ShareQR** - QR code for crew invite

## Deployment

### Play Store (Android)

1. Build APK/AAB: `eas build --platform android --profile production`
2. Download from Expo dashboard
3. Upload to Google Play Console

### App Store (iOS)

1. Build IPA: `eas build --platform ios --profile production`
2. Submit via EAS: `eas submit --platform ios`
