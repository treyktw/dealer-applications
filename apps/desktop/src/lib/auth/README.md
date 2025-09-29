# Session Management System

This directory contains a comprehensive session management system for the desktop application that provides automatic session timeout, activity monitoring, and user-friendly session warnings.

## Features

### 🔐 Session Management
- **Automatic Session Timeout**: Sessions expire after 30 minutes of inactivity (configurable)
- **Activity Monitoring**: Tracks user activity (mouse, keyboard, touch) to extend sessions
- **Remember Me**: Option to extend sessions to 7 days for trusted devices
- **Session Persistence**: Sessions survive browser refreshes and app restarts

### ⚠️ User Experience
- **Warning System**: Shows countdown modal 5 minutes before session expiry
- **Automatic Logout**: Gracefully logs out users when sessions expire
- **Session Status**: Real-time session status display in the header
- **Activity Extension**: Sessions automatically extend on user activity

### 🛡️ Security
- **Secure Storage**: Session data stored in localStorage with proper cleanup
- **Token Management**: Automatic token refresh and validation
- **Rate Limiting**: Built-in protection against brute force attacks
- **Session Validation**: Continuous session state validation

## Components

### SessionManager Class
The core session management logic with the following capabilities:

```typescript
// Configuration options
interface SessionConfig {
  sessionTimeout: number        // Default: 30 minutes
  warningTime: number          // Default: 5 minutes  
  activityTimeout: number      // Default: 15 minutes
  showWarning: boolean         // Default: true
  extendOnActivity: boolean    // Default: true
  rememberMeDuration: number   // Default: 7 days
}

// Session state
interface SessionState {
  isActive: boolean
  timeRemaining: number
  isWarning: boolean
  lastActivity: number
  sessionStart: number
  rememberMe: boolean
}
```

### React Hooks

#### `useSessionManager()`
Main hook for session management:

```typescript
const {
  sessionState,     // Current session state
  startSession,      // Start new session
  extendSession,     // Extend current session
  endSession,        // End current session
  isInitialized      // Session manager initialization status
} = useSessionManager()
```

### UI Components

#### `SessionWarningModal`
Modal that appears when session is about to expire:

```typescript
<SessionWarningModal
  isOpen={showWarning}
  onExtend={handleExtendSession}
  onLogout={handleLogout}
  timeRemaining={sessionState.timeRemaining}
/>
```

#### `SessionStatus`
Header component showing current session status:

```typescript
<SessionStatus 
  className="custom-class"
  showDetails={true}  // Show additional session info
/>
```

## Usage

### 1. Basic Setup
The session manager is automatically initialized when a user signs in. No additional setup required.

### 2. Starting Sessions
Sessions are automatically started on login with the "Remember Me" preference:

```typescript
// In login form
const { startSession } = useSessionManager()

const handleLogin = async () => {
  // ... login logic
  startSession(rememberMe) // rememberMe from checkbox
}
```

### 3. Session Monitoring
The system automatically monitors user activity and extends sessions:

```typescript
// Activity is tracked automatically for:
// - Mouse movements and clicks
// - Keyboard input
// - Touch events
// - Scroll events
```

### 4. Using Clerk's Built-in Session Management

The app now uses Clerk's built-in session management instead of custom session handling:

```typescript
import { useAuth, useSession } from '@clerk/clerk-react'

// Check if user is signed in
const { isSignedIn } = useAuth()

// Get session information
const { session } = useSession()
```

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `sessionTimeout` | 30 minutes | How long sessions last without activity |
| `warningTime` | 5 minutes | When to show warning before expiry |
| `activityTimeout` | 15 minutes | How long to wait for activity before timing out |
| `showWarning` | true | Whether to show warning modal |
| `extendOnActivity` | true | Whether to extend sessions on user activity |
| `rememberMeDuration` | 7 days | How long "Remember Me" sessions last |

## Security Considerations

### Session Storage
- Session data is stored in `localStorage` (not `sessionStorage`)
- Data is automatically cleaned up on logout
- No sensitive information is stored (only session metadata)

### Token Management
- Tokens are managed by Clerk (not stored locally)
- Automatic token refresh on activity
- Proper cleanup on session expiry

### Activity Tracking
- Only tracks basic user interactions
- No keystroke logging or sensitive data collection
- Activity data is not stored or transmitted

## Troubleshooting

### Session Not Starting
- Ensure user is properly signed in with Clerk
- Check that `useSessionManager` is called within the app
- Verify session manager is initialized

### Sessions Expiring Too Quickly
- Check activity timeout configuration
- Ensure user activity is being detected
- Verify browser allows event listeners

### Warning Modal Not Showing
- Check `showWarning` configuration
- Ensure warning time is properly set
- Verify modal component is rendered

### Session Status Not Updating
- Check that session manager is subscribed to state changes
- Verify component is using `useSessionManager` hook
- Ensure proper cleanup of event listeners

## Best Practices

1. **Always use the provided hooks** instead of accessing session manager directly
2. **Handle session expiry gracefully** with proper user feedback
3. **Test session behavior** across different browsers and devices
4. **Monitor session metrics** to optimize timeout values
5. **Provide clear user feedback** about session status and warnings

## Integration with Clerk

The session management system integrates seamlessly with Clerk authentication:

- **Automatic initialization** when user signs in
- **Proper cleanup** when user signs out
- **Token synchronization** with Clerk's token management
- **Session validation** using Clerk's session state

## Future Enhancements

Potential improvements for the session management system:

- **Multi-device session management**
- **Session analytics and reporting**
- **Custom session policies per user role**
- **Integration with external session stores**
- **Advanced activity detection (idle time vs active time)**
