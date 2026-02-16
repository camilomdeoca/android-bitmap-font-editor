# Android Bitmap Font Editor

A mobile application for creating and editing bitmap fonts. Built with Expo and React Native, the app handles BDF (Glyph Bitmap Distribution Format) fonts with an intuitive touch-based editor.

![Screenshot](/screenshot.jpg)

## Features

- **Import/Export BDF Fonts**: Load and save BDF font files from your device
- **Touch-based Bitmap Editor**: Edit glyphs using intuitive touch gestures with drag-to-paint support
- **Character Preview**: Preview characters with an optional overlay
- **Grid & Bounding Box**: Toggle grid and bounding box visualization for precise editing
- **Undo/Redo**: Full undo/redo support with persistent storage
- **Dark/Light Theme**: Automatic theme support based on system settings

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Android Studio
- Expo CLI

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm expo start
```

### Running the App

```bash
# Run on Android
pnpm expo run:android
```

### Building the APK

```bash
cd android
./gradlew assembleRelease
```

The APK will be at `android/app/build/outputs/apk/release/app-release.apk`.

## Project Structure

```
├── app/                      # Expo Router file-based routing
│   ├── (tabs)/               # Tab navigation screens
│   │   ├── font-editor.tsx   # Main font editing interface
│   │   └── index.tsx         # Project/font list screen
│   └── _layout.tsx           # Root layout
├── components/               # Reusable UI components
│   ├── character-editor.tsx  # Bitmap editor component
│   ├── custom-status-bar.tsx # Custom tab bar
│   └── ui/                   # Basic UI components
├── hooks/                    # Custom React hooks
│   ├── use-font-store.ts     # Font state management (Zustand)
│   └── use-theme-color.ts    # Theme color hook
├── lib/                      # Utility libraries
│   └── bdfparser/            # BDF font format parser
└── constants/                # Theme configuration
```

## Technology Stack

- **Expo Router**: File-based routing
- **React Native**: Mobile framework
- **TypeScript**: Type-safe development
- **Zustand**: Lightweight state management
- **React Native MMKV**: Fast key-value storage
- **React Native Skia**: High-performance 2D graphics
