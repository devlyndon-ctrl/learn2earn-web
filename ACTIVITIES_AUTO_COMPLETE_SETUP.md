# Auto-Complete Activities at Quarter End - Implementation Guide

## Overview
This feature automatically completes unfinished activities when a quarter ends and awards points to students who submitted their work. Teachers can view completed activities filtered by school year and quarter.

---

## Features Implemented

### 1. **Auto-Complete Mechanism**
- Unfinished activities are automatically marked as "Completed" at quarter end
- Points are awarded to students who submitted (status = 'Submitted' or 'Completed')
- Activity log tracks the auto-completion with timestamp and admin name
- Separates points_log entries by school_year and quarter_id

### 2. **Completed Activities Filtering**
- Teachers can view completed activities separately from current activities
- Separate filter UI (doesn't clutter the Current Activities view)
- Filter options:
  - **School Year Dropdown** - Shows all historical years
  - **Quarter Dropdown** - Shows all quarters (grouped by school year)
  - **Search Box** - Search by activity name or description
- Both dropdowns update in real-time from database

### 3. **Admin Control Panel**
- Located in Settings → "Auto-Complete Quarter Activities" card
- Admin can manually trigger auto-complete for any quarter
- Features:
  - School year selection
  - Quarter selection (filtered by school year)
  - Confirmation dialog before execution
  - Shows count of activities that will be completed

---

## Database Schema Requirements

### New/Updated Fields in `task_assignments`
```sql
-- These fields must exist or be added via migration
ALTER TABLE task_assignments ADD COLUMN school_year VARCHAR(20);
ALTER TABLE task_assignments ADD COLUMN quarter_id INTEGER;
ALTER TABLE task_assignments ADD COLUMN assigned_at TIMESTAMP;
```

### Updated `points_log` Table
```sql
-- These fields help track where points came from
ALTER TABLE points_log ADD COLUMN school_year VARCHAR(20);
ALTER TABLE points_log ADD COLUMN quarter_id INTEGER;
```

---

## API Endpoints

### 1. POST `/api/admin/auto-complete-quarter-activities`
**Purpose**: Auto-complete all unfinished activities for a quarter

**Request**:
```json
{
  "school_year": "2026-2027",
  "quarter_id": 1
}
```

**Response**:
```json
{
  "success": true,
  "message": "Completed 45 activities and awarded points",
  "updated": 45
}
```

**Auth**: Admin only

---

### 2. GET `/api/completed-activities`
**Purpose**: Fetch completed activities with optional filtering

**Parameters**:
- `school_year` (optional) - Filter by school year
- `quarter_id` (optional) - Filter by quarter
- `search` (optional) - Search query

**Example**:
```
/api/completed-activities?school_year=2025-2026&quarter_id=1&search=math
```

**Response**:
```json
{
  "success": true,
  "activities": [...],
  "total": 12
}
```

**Auth**: Teacher (returns only their activities)

---

### 3. GET `/api/quarters-history`
**Purpose**: Get all historical quarters for filtering dropdowns

**Response**:
```json
{
  "success": true,
  "quarters": [...],
  "grouped_by_school_year": {
    "2025-2026": [...],
    "2026-2027": [...]
  }
}
```

---

## User Interface

### For Teachers: Activities Page

#### Current Activities Tab (Default)
- Existing filters: Sort, Classroom, Priority
- Shows only current school year active assignments
- No school year/quarter filters (focused view)

#### Completed Activities Tab
- **NEW**: School Year dropdown - Shows all historical years
- **NEW**: Quarter dropdown - Filtered by selected school year
- Search box for completed activities
- Lists all completed activities for selected period

**UI Behavior**:
- Clicking "Current Activities" tab → Shows current filters
- Clicking "Completed Activities" tab → Shows historical filters
- Filters don't interfere with each other

### For Admins: Settings Page

#### New Card: "Auto-Complete Quarter Activities"
- School year dropdown (populated from `api/quarters-history`)
- Quarter dropdown (filtered by selected school year)
- "Auto-Complete & Award Points" button
- Shows confirmation: "X unfinished activities will be completed"

**Flow**:
1. Admin selects school year
2. Quarter dropdown updates with quarters from that year
3. Admin clicks "Auto-Complete & Award Points"
4. Confirmation dialog appears
5. On confirm:
   - Endpoint processes: `/api/admin/auto-complete-quarter-activities`
   - Activities marked as 'Completed'
   - Points awarded to submitted students
   - Success toast shows count: "✓ Completed 45 activities and awarded points!"

---

## Data Flow

### When Activity is Created
```
Teacher assigns activity
  ↓
POST /api/assign-task
  ↓
Stores: school_year, quarter_id, assigned_at
  ↓
Activity created with metadata
```

### At Quarter End
```
Admin clicks "Auto-Complete & Award Points"
  ↓
POST /api/admin/auto-complete-quarter-activities
  ↓
Find activities: WHERE status != 'Completed' 
              AND quarter_id = X 
              AND school_year = 'Y'
  ↓
For each activity:
  - Update status = 'Completed'
  - If submitted: Add points to student
  - Log in points_log with school_year, quarter_id
  ↓
Return count + success
  ↓
Teacher refreshes → Sees "Completed Activities" with results
```

### Viewing Historical Activities
```
Teacher clicks "Completed Activities" tab
  ↓
UI shows school year + quarter filters
  ↓
Teacher selects: 2025-2026, 1st Quarter
  ↓
GET /api/completed-activities?school_year=2025-2026&quarter_id=1
  ↓
Returns all completed activities for that period
  ↓
Display in same card layout as current activities
```

---

## Migration Steps

### Step 1: Database Setup
If `task_assignments` doesn't have the new columns, run:
```sql
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS school_year VARCHAR(20);
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS quarter_id INTEGER;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;

ALTER TABLE points_log ADD COLUMN IF NOT EXISTS school_year VARCHAR(20);
ALTER TABLE points_log ADD COLUMN IF NOT EXISTS quarter_id INTEGER;
```

### Step 2: File Updates
✅ Already completed:
- `app.py` - 4 new/modified endpoints + backend logic
- `templates/teacher/activities.html` - UI + JavaScript filtering
- `templates/settings.html` - Admin control panel

### Step 3: Testing
1. Create activities in current quarter → Verify `school_year` and `quarter_id` stored
2. Switch to Completed tab → Verify filters appear
3. Select school year/quarter → Verify filtering works
4. In admin settings → Select quarter → Click auto-complete
5. Verify activities marked as Completed
6. Verify points awarded to students

---

## Important Notes

### Point Awarding Logic
- Only students with status = 'Submitted' or 'Completed' get points
- Points = activity.points field
- Current student points added to total
- Logged in points_log for audit trail

### Filtering Behavior
- Current Activities filters (sort, classroom, priority) remain separate
- Completed Activities filters (school year, quarter) only affect completed view
- No crosstalk between the two filter UIs

### Admin-Only Features
- Auto-complete button only visible to admins
- Wrapped in `{% if user_role == 'Admin' %}`
- Activity log records who triggered auto-complete and when

### Backward Compatibility
- Existing activities created before this feature won't have school_year/quarter_id
- API sets these fields to NULL for old activities
- Teachers can still view old activities but won't see them in new filters

---

## Troubleshooting

### Activities Not Appearing in Completed Tab
1. Check if activities have `school_year` and `quarter_id` set
2. Verify endpoint returns data: Visit `/api/completed-activities` directly
3. Check browser console for JS errors

### Points Not Being Awarded
1. Verify student status is 'Submitted' or 'Completed'
2. Check `points_log` table for entries
3. Verify student's `points` field was updated in `user_info`

### Dropdown Not Populating
1. Test `/api/quarters-history` endpoint in browser
2. Check if quarters exist in database
3. Verify response format matches expected structure

---

## Files Modified

1. **app.py** (~6390-6650)
   - Modified `/api/assign-task` to store metadata
   - Added `/api/admin/auto-complete-quarter-activities`
   - Added `/api/completed-activities`
   - Added `/api/quarters-history`

2. **templates/teacher/activities.html** (~30-350, ~3457-3600)
   - Added completed activities filter UI
   - Added dropdown toggle functionality
   - Added completed activities fetching logic

3. **templates/settings.html** (~290-350, ~2220-2310)
   - Added auto-complete admin card
   - Added auto-complete form logic
   - Added options loader

---

## Future Enhancements

1. **Automatic Triggers**
   - Schedule auto-complete at quarter end date
   - Send notifications to teachers before execution

2. **Batch Operations**
   - Complete activities for multiple quarters at once
   - Bulk activity archive instead of per-quarter

3. **Analytics**
   - Show completion rate by quarter
   - Track point awards over time

4. **Notifications**
   - Notify students when activities auto-complete
   - Notify teachers of successful auto-complete

