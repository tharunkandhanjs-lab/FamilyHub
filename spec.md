# FamilyHub

## Overview

A comprehensive family organization application that allows users to manage family member profiles, track daily mood check-ins, and coordinate calendar events with secure single-user authentication through Internet Identity. The application provides a centralized hub for family organization and emotional well-being tracking.

## Authentication System

- Users must authenticate using Internet Identity before accessing the main application
- Login panel is displayed first upon application load
- First user to authenticate becomes admin with full system privileges
- Single-user admin mode - only the admin can access and manage all family data
- No guest access - authentication is mandatory for all features

## User Access

- Admin has full control over all family data including members, moods, and events
- All operations require admin authentication
- Data is isolated to the authenticated admin user
- No multi-user collaboration - designed for single family unit management

## Core Features

### Authentication Flow

- Login panel displayed as the primary interface
- Main family management interface only accessible after successful Internet Identity authentication
- Logout functionality returns user to login panel
- Admin authentication check on all backend operations

### Family Member Management

- Create new family member profiles with name, avatar emoji, and color selection
- Avatar emoji options: 👨, 👩, 👧, 👦, 👴, 👵, 🧑, 👶
- Color palette includes 8 predefined colors for member identification
- First family member created automatically assigned "admin" role
- Subsequent members assigned "member" role
- Edit existing family member information (name, color, avatar)
- Delete family members with confirmation
- View all family members in grid layout with visual avatars

### Mood Tracking System

- Record daily mood check-ins for any family member
- Six mood options available:
  - 😊 Happy
  - 😢 Sad
  - 😡 Angry
  - 😴 Tired
  - 🤩 Excited
  - 😐 Neutral
- Optional text notes can be added to mood entries for context
- Mood entries include date timestamp for historical tracking
- View today's mood check-ins filtered by current date
- Browse recent mood history with member identification
- Filter mood entries by family member
- Filter mood entries by date range
- Delete mood entries
- Update existing mood entries (mood and note only)

### Calendar & Events Management

- Create calendar events with title, description, and dates
- Four event type categories:
  - Activity (⚽)
  - Appointment (🏥)
  - Birthday (🎂)
  - Reminder (🔔)
- Assign multiple family members to events
- Events display with visual icons based on type
- View upcoming events (future-dated)
- View past events (history)
- Filter events by date range
- Filter events by family member participation
- Delete calendar events
- Update existing events (all fields modifiable)

### Dashboard Overview

- Summary statistics showing:
  - Total family members count
  - Today's mood check-ins count
  - Upcoming events count
- Display today's moods with member avatars and names
- Show next 5 upcoming events with dates and types
- Real-time data updates from backend queries

### Settings & Data Management

- View data summary with counts:
  - Total family members
  - Total mood entries
  - Total calendar events
- Generate sample data feature for demo purposes:
  - Creates 4 sample family members (Dad, Mom, Emma, Jack)
  - Generates 20 sample mood entries with various dates
  - Creates 8 sample calendar events with different types
- Clear all data functionality with confirmation:
  - Removes all family members
  - Removes all mood entries
  - Removes all calendar events
  - Resets all ID counters
- Display admin status indicator

## Backend Data Storage

### Data Models

**Family Member:**

- ID (Nat)
- Name (Text)
- Color (Text - hex color code)
- Avatar Emoji (Text)
- Role (Text - "admin" or "member")
- Created timestamp (Time.Time)

**Mood Entry:**

- ID (Nat)
- Member ID (Nat - reference to family member)
- Mood (Text - emoji character)
- Note (Text - optional context)
- Date (Time.Time - date of mood entry)
- Created timestamp (Time.Time)

**Calendar Event:**

- ID (Nat)
- Title (Text)
- Description (Text)
- Start Date (Time.Time)
- End Date (Time.Time)
- Member IDs (Array of Nat - participants)
- Event Type (Text - "activity", "appointment", "birthday", "reminder")
- Created timestamp (Time.Time)

### Storage Implementation

- Uses OrderedMap for efficient data storage and retrieval
- Transient OrderedMap instance for map operations
- Persistent storage for all family members, mood entries, and events
- Auto-incrementing ID counters for each data type
- Admin principal stored as optional Principal value

## Backend Operations

### Authentication Operations

- `initializeAuth()`: Sets first authenticated user as admin
- `isAdmin()`: Query operation to check admin status
- `hasAdminPermission(caller)`: Private function to verify admin access
- All operations check admin permission before execution

### Family Member Operations

- `addFamilyMember(name, color, avatarEmoji)`: Create new family member, returns member ID
- `getAllFamilyMembers()`: Query operation returning array of all members
- `getFamilyMember(id)`: Query operation returning specific member or null
- `updateFamilyMember(id, name, color, avatarEmoji)`: Update member info, returns updated member
- `deleteFamilyMember(id)`: Remove member, returns boolean success

### Mood Entry Operations

- `addMoodEntry(memberId, mood, note, date)`: Create new mood entry, returns entry ID
- `getAllMoodEntries()`: Query operation returning array of all mood entries
- `getMoodEntriesByMember(memberId)`: Query operation filtering by member
- `getMoodEntriesByDateRange(startDate, endDate)`: Query operation filtering by date range
- `updateMoodEntry(id, mood, note)`: Update existing entry, returns updated entry
- `deleteMoodEntry(id)`: Remove mood entry, returns boolean success

### Calendar Event Operations

- `addCalendarEvent(title, description, startDate, endDate, memberIds, eventType)`: Create new event, returns event ID
- `getAllCalendarEvents()`: Query operation returning array of all events
- `getCalendarEventsByDateRange(startDate, endDate)`: Query operation filtering by date range
- `getCalendarEventsByMember(memberId)`: Query operation filtering by member participation
- `updateCalendarEvent(id, title, description, startDate, endDate, memberIds, eventType)`: Update event, returns updated event
- `deleteCalendarEvent(id)`: Remove event, returns boolean success

### Utility Operations

- `getDataCounts()`: Query operation returning counts of all data types
- `clearAllData()`: Reset all data and counters
- `generateSampleData()`: Create sample family data, returns created data

### Error Handling

- All operations use `Debug.trap()` for error conditions
- No Result types - errors cause immediate trap
- Validation checks before data operations
- Unauthorized access trapped with error message

## User Interface

### Layout Structure

- Header bar with app branding and sign-out button
- Horizontal tab navigation with 5 sections:
  - Home (🏠) - Dashboard
  - Family (👨‍👩‍👧‍👦) - Member management
  - Mood (😊) - Mood tracking
  - Calendar (📅) - Event management
  - Settings (⚙️) - Data management
- Content area displays selected tab view
- Full-width responsive layout

### Authentication Interface

- Login screen with Internet Identity button
- Centered card layout with app branding
- Family emoji (👨‍👩‍👧‍👦) as visual identifier
- Clean, welcoming design
- Powered by Internet Computer footer

### Dashboard View

- Three-column statistics grid:
  - Family members count
  - Today's moods count
  - Upcoming events count
- Today's moods display with member avatars
- Upcoming events list with icons and dates
- Welcome message for first-time users

### Family Management View

- Grid layout of family member cards
- Each card displays:
  - Large circular avatar with color background
  - Member name and role
  - Edit and Remove buttons
- Add Member button in header
- Modal form for creating/editing members:
  - Name input field
  - Avatar emoji selector (8 options)
  - Color selector (8 options)
  - Cancel and Save/Add buttons

### Mood Tracking View

- Multi-step mood entry interface:
  - Member selection with colored avatar buttons
  - Mood emoji selection (6 options)
  - Optional note input field
  - Save Mood button
- Today's Check-ins section displaying:
  - Member avatar and name
  - Mood emoji
  - Note text if provided
  - Delete button
- Recent Moods history list with dates

### Calendar View

- Upcoming Events section:
  - Event cards with type icons
  - Event title and description
  - Date display with full formatting
  - Member avatars for participants
  - Delete button
- Past Events section (collapsed view)
- Add Event button in header
- Modal form for creating events:
  - Title input
  - Date picker
  - Event type selector (4 options)
  - Description input
  - Member selection with avatars
  - Cancel and Add buttons

### Settings View

- Data Summary grid showing counts
- Data Management actions:
  - Generate Sample Data button
  - Clear All Data button (red styling)
- About section with app information
- Admin status display

### Interactive Elements

- Modal overlays for forms (backdrop dismissal)
- Loading states with disabled buttons
- Confirmation dialogs for destructive actions
- Real-time data updates using React Query
- Hover effects on interactive elements

## Design System

### Color Palette

- Primary: Orange (#F97316) for branding and CTAs
- Background: Warm gradient from orange-50 to amber-50
- Cards: White with orange-100 borders
- Text: Gray scale (gray-800 for primary, gray-500 for secondary)
- Member colors: 8 predefined colors for differentiation

### Typography

- Clean sans-serif font (system default)
- Multiple size scales for hierarchy
- Semibold weights for emphasis
- Gray color scheme for readability

### Component Styling

- Rounded corners (rounded-xl for cards, rounded-lg for buttons)
- Subtle borders (border-orange-100)
- Shadow-sm for card elevation
- Consistent spacing with gap and padding utilities
- Form inputs with focus rings (focus:ring-orange-500)

### Visual Identity

- Family emoji (👨‍👩‍👧‍👦) as app icon
- Emoji-based event type indicators
- Colored circular avatars for members
- Emoji mood indicators
- Clean, approachable aesthetic

## Mobile Responsive Design

- Full responsive layout using Tailwind breakpoints
- Grid layouts adapt to single column on mobile
- Tab navigation scrollable horizontally on small screens
- Modal dialogs adapt to mobile screen sizes
- Touch-friendly button sizes
- Readable text scaling
- Cards stack vertically on mobile
- Forms optimize for mobile input
- Adequate spacing for touch interaction

## State Management

- React hooks (useState) for local component state
- React Query (TanStack Query) for server state:
  - Automatic caching and refetching
  - Loading and error states
  - Mutation handling with optimistic updates
  - Query invalidation on mutations
- ic-use-internet-identity for authentication state
- No global state management needed

## Data Flow

- Frontend makes async calls to backend canister
- React Query manages loading, error, and success states
- Mutations trigger automatic refetch of affected queries
- Time conversions between JavaScript and Motoko timestamps
- BigInt handling for Motoko Nat types
- Array filtering and sorting in frontend components
