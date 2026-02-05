# Android Bitmap Font Editor - AGENTS.md

## Project Overview

Android bitmap font editor built with Expo and React Native, allowing users to create and edit bitmap fonts for Android applications. The app focuses on BDF (Glyph Bitmap Distribution Format) font handling with an intuitive editor interface.

## Key Technologies

- **Expo Router**: File-based routing system
- **React Native**: Cross-platform mobile development
- **TypeScript**: Type-safe JavaScript development
- **Zustand**: Lightweight state management
- **React Native MMKV**: Fast key-value storage for app data
- **Custom BDF Parser**: Internal library for parsing and handling BDF font format

## Target Platform

- **Primary**: Android (high priority)
- **Secondary**: Web (cross-platform support)

## Dev Environment Tips

- Use `pnpm` instead of `npm` when possible
- Install dependencies with `pnpm expo install` for Expo-compatible packages
- Path alias `@/*` points to project root

## Repository Guidelines

## Project Structure & Module Organization

- `/app/`: Expo Router file-based routing
  - `/app/(tabs)/`: Main application screens with tab navigation
    - `/app/(tabs)/font-editor.tsx`: Main font editing interface
    - `/app/(tabs)/project-list.tsx`: Project management screen
  - `/app/_layout.tsx`: Root layout configuration
  - `/app/modal.tsx`: Modal screens and overlays
- `/components/`: Reusable UI components
  - `/components/ui/`: Basic UI components (buttons, collapsible, icons)
  - `/components/themed-*.tsx`: Theme-aware components
  - `/components/character-editor.tsx`: Main font editing component
- `/lib/`: Utility libraries and parsers
  - `/lib/bdfparser/`: Custom BDF font format parser
- `/hooks/`: Custom React hooks
  - State management (Zustand stores)
  - Theme and color scheme handling
- `/constants/`: Theme configuration and app constants

## Test, and Development Commands

- Install dependencies: `pnpm expo install`
- Start development server: `pnpm expo start`
- Run on Android: `pnpm expo run:android`
- Run on Web: `pnpm expo start --web`
- Lint code: `pnpm lint`

**Note**: Tests are not yet implemented in this project.

## Coding Style & Naming Conventions

- **Style**: 2‑space indent, semicolons, double quotes, trailing commas, width 100
- **Files**: Use kebab‑case (`example-file.ts`)
- **TypeScript Conventions**:
  - Use interface for object shapes that might be extended
  - Use type for unions, primitives, and utility types
  - Prefer explicit return types for public functions
  - Use generic types where appropriate for reusability
  - Component props should be typed interfaces with clear property names

## Commit & Pull Request Guidelines

- **Commits**: Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`)
- Keep scope small and messages imperative
- Focus on Android platform improvements with cross-platform considerations

