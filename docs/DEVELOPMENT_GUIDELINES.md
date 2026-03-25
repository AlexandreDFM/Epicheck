# Development Guidelines

## Working with EpiCheck

This guide covers best practices for developing EpiCheck features.

## Table of Contents

- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Running the Project](#running-the-project)
- [Code Organization](#code-organization)
- [State Management](#state-management)
- [Styling](#styling)
- [API Integration](#api-integration)
- [Error Handling](#error-handling)
- [Performance](#performance)
- [Debugging](#debugging)

---

## Project Structure

```
EpiCheck/
├── components/          # Shared UI components
├── screens/             # Screen/page components
├── services/            # API calls and business logic
├── hooks/               # Custom React hooks
├── contexts/            # React Context setup
├── types/               # TypeScript type definitions
├── utils/               # Helper functions
├── assets/
│   ├── fonts/
│   ├── img/
│   └── sounds/
├── android/             # Android native code
├── ios/                 # iOS native code
├── docs/                # Documentation
└── kubernetes/          # K8s deployment configs
```

---

## Development Setup

### Prerequisites

- Node.js 22+ (use `.nvmrc`)
- pnpm 9+
- Git 2.30+
- For iOS: Xcode 15+, CocoaPods 1.14+
- For Android: JDK 17+, Android Studio

### Initial Setup

```bash
# Clone and navigate
git clone git@github.com:YOUR_USERNAME/Epicheck.git
cd Epicheck

# Set up Node version
nvm install && nvm use

# Install pnpm globally (if not already)
corepack enable && corepack prepare pnpm@latest

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration
```

---

## Running the Project

### Web Development

```bash
# Start Metro bundler and web server
pnpm run web

# Your app will be available at http://localhost:8081
```

### Android Development

```bash
# Start Metro bundler (required for React Native)
pnpm run start

# In another terminal, build and run on Android
pnpm run android

# Or with an emulator
emulator -avd YourEmulatorName

# Clean build if issues occur
pnpm run android:clean
```

### iOS Development

```bash
# Install Pods
cd ios && pod install && cd ..

# Start Metro
pnpm run start

# In another terminal
pnpm run ios

# Or use Xcode
open ios/EpiCheck.xcworkspace
```

### Useful Scripts

```bash
pnpm run lint              # Run ESLint
pnpm run format            # Format with Prettier
pnpm run test:watch        # Run tests in watch mode
pnpm run build:web         # Build for web
pnpm run build:android     # Build APK
# For the full, up-to-date list of scripts, see the root package.json
```

---

## Code Organization

### Component Structure

```typescript
// MyComponent.tsx
import React from "react";
import { View, Text } from "react-native";
import styles from "./MyComponent.styles";

interface MyComponentProps {
  title: string;
  onPress?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  title,
  onPress,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

export default MyComponent;
```

### Import Organization

```typescript
// 1. React and React Native
import React from 'react';
import { View, Text } from 'react-native';

// 2. Third-party libraries
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';

// 3. Internal components
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';

// 4. Types
import type { User } from '@/types/User';

// 5. Styles
import styles from './MyComponent.styles';
```

---

## State Management

### Using React Context

```typescript
// AuthContext.tsx
import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  isLoggedIn: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const login = async (credentials: LoginCredentials) => {
    // Implementation
    setIsLoggedIn(true);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Using Custom Hooks

```typescript
// useUserData.ts
import { useState, useEffect } from 'react';
import { fetchUser } from '@/services/api';

export const useUserData = (userId: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await fetchUser(userId);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  return { data, loading, error };
};
```

---

## Styling

### Using NativeWind (Tailwind CSS)

```typescript
import { View, Text } from 'react-native';

export const MyComponent = () => {
  return (
    <View className="bg-white p-4 rounded-lg shadow">
      <Text className="text-xl font-bold text-gray-900">Title</Text>
      <Text className="text-base text-gray-600 mt-2">Description</Text>
    </View>
  );
};
```

### CSS Modules (for web)

```typescript
import styles from './MyComponent.module.css';

export const MyComponent = () => {
  return <div className={styles.container}>Content</div>;
};
```

```css
/* MyComponent.module.css */
.container {
  display: flex;
  padding: 1rem;
  background-color: white;
  border-radius: 0.5rem;
}
```

---

## API Integration

### Service Implementation

```typescript
// services/api.ts
import axios from 'axios';
import { API_BASE_URL } from '@/config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const fetchUsers = async () => {
  const { data } = await apiClient.get('/users');
  return data;
};

export const createUser = async (userData: UserData) => {
  const { data } = await apiClient.post('/users', userData);
  return data;
};
```

### Using in Components

```typescript
// UserList.tsx
import { useEffect, useState } from 'react';
import { fetchUsers } from '@/services/api';

export const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await fetchUsers();
        setUsers(data);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  return (
    <>
      {loading && <Text>Loading...</Text>}
      {/* Render users */}
    </>
  );
};
```

---

## Error Handling

### Try-Catch Patterns

```typescript
try {
  const data = await fetchData();
  // Handle success
} catch (error) {
  if (error instanceof AxiosError) {
    // Handle API errors
    console.error('API Error:', error.response?.status);
  } else if (error instanceof Error) {
    // Handle general errors
    console.error('Error:', error.message);
  } else {
    // Handle unknown errors
    console.error('Unknown error:', error);
  }
}
```

### Error Boundaries

```typescript
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <Text>Something went wrong</Text>;
    }

    return this.props.children;
  }
}
```

---

## Performance

### Memoization

```typescript
import React, { memo, useMemo, useCallback } from 'react';

// Memoize component to prevent unnecessary re-renders
const UserCard = memo(({ user }: { user: User }) => (
  <View>
    <Text>{user.name}</Text>
  </View>
));

// Memoize computed values
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize callbacks
const handlePress = useCallback(() => {
  onUserSelect(userId);
}, [userId, onUserSelect]);
```

### List Performance

```typescript
import { FlatList } from 'react-native';

export const UserList = ({ users }: { users: User[] }) => {
  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <UserCard user={item} />}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
    />
  );
};
```

---

## Debugging

### React DevTools

```bash
# Start the app and open React DevTools
# For web: Chrome DevTools React tab
# For mobile: Use React DevTools app
```

### Console Logging

```typescript
// Use descriptive logs
console.log('🔍 Fetching user:', userId);
console.error('❌ Error:', error);
console.warn('⚠️  Warning:', message);
console.info('ℹ️ Info:', info);
```

### React Native Debugger

```bash
# Install React Native Debugger
# Launch app with: react-native run-android --remote-debugger

# Or use Chrome DevTools
# Press 'd' in terminal running React Native
```

### TypeScript Type Checking

```bash
# Check for type errors
pnpm run type-check
```

---

## Best Practices Checklist

- [ ] Follow TypeScript strict mode
- [ ] Use functional components with hooks
- [ ] Keep components focused and small
- [ ] Extract business logic into custom hooks
- [ ] Memoize expensive computations
- [ ] Handle errors gracefully
- [ ] Add loading and empty states
- [ ] Test critical paths
- [ ] Document complex logic
- [ ] Keep dependencies updated
- [ ] Use absolute imports (`@/`)
- [ ] Run ESLint before committing
- [ ] Test on multiple devices
- [ ] Check performance with Profiler

---

Need more help? Check the [CONTRIBUTING.md](../CONTRIBUTING.md) guide or open a discussion!
