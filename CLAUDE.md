# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start Expo dev server
npm run ios        # Start on iOS simulator
npm run android    # Start on Android emulator
npm run web        # Start web version
npm run lint       # Run ESLint with Prettier
```

## Architecture

**Bambino** is an Expo React Native app using file-based routing (expo-router).

### Tech Stack
- **Expo SDK 54** with React Native 0.81 (new architecture enabled)
- **NativeWind 4** - Tailwind CSS for React Native via `className` props
- **Clerk** - Authentication (email/password + Google SSO)
- **expo-router** - File-based routing with typed routes

### Project Structure
- `app/` - Routes using expo-router file conventions
  - `_layout.tsx` - Root layout with ClerkProvider, ThemeProvider, fonts, and navigation
  - `(auth)/` - Auth route group (sign-in, sign-up) - redirects to `/` when signed in
  - `index.tsx` - Main screen (redirects to sign-in when signed out)
- `components/` - Reusable UI components (`ThemedText`, `ThemedView`)
- `constants/theme.ts` - Colors and platform-specific font definitions
- `hooks/` - Custom hooks for color scheme and theming

### Styling Pattern
NativeWind requires `cssInterop` to enable `className` on custom components. This is configured in `app/_layout.tsx` for `ThemedText`, `ThemedView`, `ExpoImage`, and `Animated.Text`.

### Path Aliases
`@/*` maps to the project root (e.g., `@/components/themed-text`).

### Environment Variables
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` - Required for Clerk authentication
