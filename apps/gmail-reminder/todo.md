# Gmail Reminder App - TODO

## Core Features

### 1. Database Schema & Backend Setup
- [x] Create reminders table with fields: id, userId, subject, body, scheduledAt, sentAt, status, errorMessage, retryCount, scheduleCronTaskUid
- [x] Create gmailSettings table with fields: id, userId, email, appPassword (encrypted), createdAt, updatedAt
- [x] Create database migrations and apply them

### 2. Gmail SMTP Integration
- [x] Install nodemailer and dependencies
- [x] Create Gmail SMTP helper function to send emails
- [x] Implement secure app password storage and retrieval
- [x] Test Gmail SMTP connection and sending

### 3. Backend API - tRPC Procedures
- [x] Create procedure: `reminders.create` - compose and schedule a reminder
- [x] Create procedure: `reminders.list` - fetch all reminders with pagination and filters
- [x] Create procedure: `reminders.getById` - fetch a single reminder
- [x] Create procedure: `reminders.update` - edit a reminder (before sending)
- [x] Create procedure: `reminders.delete` - delete a reminder
- [x] Create procedure: `gmailSettings.get` - fetch current Gmail settings
- [x] Create procedure: `gmailSettings.update` - save/update Gmail credentials
- [x] Create procedure: `reminders.retry` - manually retry a failed reminder

### 4. Cron Job & Automatic Sending
- [x] Create `/api/scheduled/sendReminders` endpoint to handle cron triggers
- [x] Implement logic to find due reminders and send them
- [x] Implement retry mechanism with exponential backoff
- [x] Register cron job in server initialization
- [ ] Test cron execution and email sending

### 5. Frontend - Compose Form
- [x] Create ReminderCompose component with subject input
- [x] Add rich text editor for email body (using slate or simple textarea)
- [x] Add date/time picker for scheduling
- [x] Add form validation and error handling
- [x] Implement submit to create reminder via tRPC

### 6. Frontend - Reminders Dashboard
- [x] Create RemindersPage component with list view
- [x] Display reminders with status indicators (scheduled, sent, failed)
- [x] Add columns: subject, scheduled date, status, actions
- [x] Implement edit button (opens compose form with pre-filled data)
- [x] Implement delete button with confirmation
- [x] Implement retry button for failed reminders
- [x] Add pagination or infinite scroll
- [x] Add filters by status (all, scheduled, sent, failed)

### 7. Frontend - Gmail Settings Page
- [x] Create GmailSettingsPage component
- [x] Add form fields: Gmail email address, Google App Password
- [x] Add password input with show/hide toggle
- [x] Add save button with success/error feedback
- [x] Add test connection button
- [x] Display current settings (email only, not password)

### 8. Frontend - Navigation & Layout
- [x] Update App.tsx with routes for compose, dashboard, settings
- [x] Create navigation menu/header with links
- [ ] Use DashboardLayout for consistent styling
- [ ] Add logout functionality

### 9. Styling & Polish
- [x] Apply refined typography and spacing
- [x] Use consistent color palette and shadows
- [x] Ensure responsive design on mobile/tablet
- [x] Add micro-interactions and smooth transitions
- [x] Polish form inputs and buttons
- [x] Add loading states and skeleton loaders
- [x] Ensure accessibility (ARIA labels, keyboard nav)

### 10. Security & Encryption
- [x] Encrypt Gmail app passwords before storing
- [x] Decrypt passwords only when needed for SMTP
- [x] Use encryption utilities in all relevant procedures

### 11. Testing & Validation
- [x] Verify existing tests pass
- [ ] Test compose form submission (manual)
- [ ] Test reminder list display and filtering (manual)
- [ ] Test Gmail settings save and retrieval (manual)
- [ ] Test cron job execution and email sending (manual)

## Implementation Notes
- Use Manus Heartbeat API for cron job scheduling
- Store Gmail app password securely (consider encryption)
- Implement proper error messages for user feedback
- Ensure all timestamps are in UTC
- Use optimistic updates for better UX
