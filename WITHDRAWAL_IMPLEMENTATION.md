# Withdrawal Functionality Implementation Summary

## Overview
This document summarizes the implementation of the withdrawal functionality for lab booking requests. Users can now withdraw their booking requests before they are approved, with intelligent email notifications sent only to relevant parties.

## Changes Made

### 1. Backend API Endpoints

#### Student Withdrawal Endpoint
- **File**: `app/api/student/booking-requests/route.ts`
- **Method**: DELETE
- **URL**: `/api/student/booking-requests?id=<booking_id>`
- **Features**:
  - Authorization check (only requester can withdraw)
  - Status validation (cannot withdraw approved/rejected/already withdrawn bookings)
  - Smart email notifications based on booking status
  - Multi-lab support with all lab names in emails
  - Activity logging for each lab

#### Faculty Withdrawal Endpoint
- **File**: `app/api/faculty/booking-requests/route.ts`
- **Method**: DELETE
- **URL**: `/api/faculty/booking-requests?id=<booking_id>`
- **Features**: Same as student endpoint

#### Others Withdrawal Endpoint
- **File**: `app/api/others/booking-requests/route.ts`
- **Method**: DELETE
- **URL**: `/api/others/booking-requests?id=<booking_id>`
- **Features**: Same as student endpoint

### 2. Multi-Lab Rejection Fix

#### Lab Staff Action Endpoint
- **File**: `app/api/lab-staff/requests/[id]/action/route.ts`
- **Change**: Modified rejection logic to be per-lab instead of all-or-nothing
- **Previous Behavior**: When one lab staff rejected, entire multi-lab booking was rejected
- **New Behavior**:
  - Only the specific lab is rejected in `multi_lab_approvals` table
  - System tracks counts: rejected, approved, and total labs
  - Entire booking marked as rejected ONLY when ALL labs are rejected
  - Booking moves to `pending_hod` when all remaining labs are approved
  - Stays `pending_lab_staff` if some labs still pending

### 3. Email Notification Logic

Smart email notifications ensure only relevant parties are notified:

#### Who Gets Notified on Withdrawal:
1. **Always**: Requester (confirmation email)
2. **Faculty**: Only if status is NOT `pending_faculty` (they've already seen it)
3. **Lab Staff**: Only if status is `pending_lab_staff` or `pending_hod` (it's in their queue)
4. **HOD/Lab Coordinator**: Only if status is `pending_hod` (it has reached them)

#### Email Template Features:
- Professional HTML template with LNMIIT branding
- Proper salutation formatting
- Complete booking details (labs, date, time, purpose)
- Clear withdrawal notice
- No action required message

### 4. Database Changes

#### Migration File Created
- **File**: `scripts/migration-add-withdrawal.sql`
- **Changes**:
  1. Added `'withdrawn'` to status enum
  2. Added `withdrawn_at` TIMESTAMP column
  3. Added index on `withdrawn_at` for performance

#### To Apply Migration:
```bash
mysql -u root -p lnmiit_lab_management < scripts/migration-add-withdrawal.sql
```

## Validation Rules

### Cannot Withdraw If:
- Booking status is `approved` (contact admin instead)
- Booking status is `rejected` (already rejected)
- Booking status is `withdrawn` (already withdrawn)
- User is not the requester (authorization check)

### Can Withdraw If:
- Status is `pending_faculty`
- Status is `pending_lab_staff`
- Status is `pending_hod`

## Multi-Lab Rejection Logic

### Status Tracking
The system now tracks three counts for multi-lab bookings:
- `rejected`: Number of labs that rejected
- `approved`: Number of labs that approved
- `total`: Total number of labs in the booking

### Decision Rules
1. **All labs rejected** (`rejected === total`):
   - Set booking status to `rejected`
   - Set rejection reason
   - Store rejector info

2. **All labs approved** (`approved === total`):
   - Move to next stage (`pending_hod`)

3. **Partial approvals/rejections**:
   - Keep status as `pending_lab_staff`
   - Individual lab statuses tracked in `multi_lab_approvals`

## Testing Checklist

### Withdrawal Testing
- [ ] Student can withdraw own booking
- [ ] Faculty can withdraw own booking
- [ ] Others can withdraw own booking
- [ ] Cannot withdraw someone else's booking
- [ ] Cannot withdraw approved booking
- [ ] Cannot withdraw rejected booking
- [ ] Cannot withdraw already withdrawn booking
- [ ] Correct emails sent based on status
- [ ] Multi-lab bookings include all lab names in email
- [ ] Activity logs created for each lab

### Multi-Lab Rejection Testing
- [ ] Single lab rejection doesn't kill entire booking
- [ ] Partial rejections tracked correctly
- [ ] All labs rejected marks booking as rejected
- [ ] All labs approved moves to pending_hod
- [ ] Mixed approvals/rejections keeps pending_lab_staff
- [ ] Lab staff only sees their lab's status

## Next Steps

### Required Database Migration
Run the migration script to add the `withdrawn_at` column:
```bash
mysql -u root -p lnmiit_lab_management < scripts/migration-add-withdrawal.sql
```

### Frontend Integration Needed
Add withdrawal buttons in the following dashboard pages:
1. Student dashboard booking list
2. Faculty dashboard booking list
3. Others dashboard booking list

Example API call:
```typescript
const response = await fetch(`/api/student/booking-requests?id=${bookingId}`, {
  method: 'DELETE'
})
```

### UI Considerations
- Show "Withdraw" button only for pending bookings
- Disable withdraw for approved/rejected bookings
- Show confirmation dialog before withdrawal
- Display success/error messages
- Refresh booking list after withdrawal

## Files Modified

1. `app/api/student/booking-requests/route.ts` - Added DELETE endpoint
2. `app/api/faculty/booking-requests/route.ts` - Added DELETE endpoint
3. `app/api/others/booking-requests/route.ts` - Added DELETE endpoint
4. `app/api/lab-staff/requests/[id]/action/route.ts` - Fixed rejection logic
5. `scripts/migration-add-withdrawal.sql` - Created (new file)

## Security Features

- Authorization: Only requester can withdraw their own bookings
- Validation: Cannot withdraw approved bookings (protects system integrity)
- Activity Logging: All withdrawals logged with user info, IP, and user agent
- Email Notifications: Only sent to people who have already seen the request

## Performance Considerations

- Indexed `withdrawn_at` column for efficient queries
- Batch email sending with error handling (continues on email failure)
- Single database transaction for status update
- Efficient lab name fetching with IN clause for multi-lab bookings
