Task Manager Application - Rebuild Specification

OVERVIEW

This document provides complete specifications for rebuilding the AppSheet-based Task Manager as a coded application. The app is a task management system with date-based organization, priority levels, and automatic rollover functionality.

KEY FEATURES
Tasks grouped by due date in a vertical left sidebar
- Inline action buttons for priority and date management
- Automatic rollover of incomplete tasks to the next day
- Simple, clean interface focused on “Open Tasks” view
- No completed tasks tab needed for initial build
DATA MODEL

Table: Tasks

Core Fields:
Task ID (Text) - Primary key, unique identifier
2. Title (Text) - Required, shown as label in lists
3. Description (LongText) - Optional task details
4. Status (Enum) - Values: “Open”, “Completed”
   - Default: “Open”
   - Input mode: Buttons (toggle between states)
5. Due Date (Date)
   - Default: TODAY()
   - Main grouping field for the interface
6. Urgency (Enum) - Priority level
   - Values: “P1”, “P2”, “P3”, “P4” (in order from highest to lowest)
   - Default: “P3”
   - Display: P1 shows with red “!” icon, P2 with gold/yellow indicator, P3 in blue
7. Project ID (Ref) - References Projects table (optional)
8. Created Date (Date) - Timestamp of task creation
9. Completed Date (Date) - Populated when status changes to “Completed”
10. FollowUpItem (Yes/No) - Boolean flag
    - Default: “N” (No/False)
11. URL1, URL2, URL3 (Url) - Optional reference links
Computed/Display Fields (not stored):
12. _RowNumber (Number) - Auto-generated row number
13. ShowMoveToNextWeek (Text) - Controls visibility of “move to next Monday” button
14. ShowMoveToNextDay (Date) - Controls visibility of “move to tomorrow” button
15. ShowMoveToTwoDaysFromNow (DateTime) - Controls visibility of “move to +2 days” button
16. ShowMoveUpPriorityList (Text) - Controls visibility of “increase priority” button
17. ShowMoveDownPriorityList (Text) - Controls visibility of “decrease priority” button
18. ShowTaskTitleAndDescription (Show) - Computed column for display formatting

Table: Projects
Project ID (Text/Key)
- Project Name (Text)
- Other project-related fields as needed
USER INTERFACE

Main View: “Open Tasks”

Layout Structure:
LEFT SIDEBAR (Date Groups):
Vertical list showing dates with task counts
- Format: “MM/DD/YYYY” with count badge (e.g., “10/11/2025  60”)
- “All” option at top to show all tasks
- Automatically scrolls to show current/upcoming dates
- Each date group is clickable to filter tasks
MAIN CONTENT AREA:
Header Row:
“Open Tasks” title
- “+ Add” button (top right)
- Search bar (“Search Open Tasks”)
- View controls (list/card toggle icons)
Task List Columns:
Urgency - Priority indicator (P1/P2/P3 with colored icons)
2. Action Buttons (6 inline icons per row):
   - ⬆ Move up in priority
   - ⬇ Move down in priority  
   - → Move to next day (tomorrow)
   - ⏩ Move to two days from now
   - 📅 Move to start of next week (next Monday)
   - ✓ Mark complete
3. Due Date - MM/DD/YYYY format
4. Title - Task name
Row Interaction:
Clicking a task row opens detail panel on right side
- Detail panel shows all task fields in organized sections:
  * Task Title And Description (Title, Description)
  * Status And Due Date (Status buttons, Due Date picker)
  * FollowUpItem (Y/N toggle)
  * Other Task Elements (URL1, URL2, URL3)
  * Project ID dropdown (if projects exist)
Action Button Logic:

Move Up Priority:
   - P4 → P3, P3 → P2, P2 → P1
   - Hidden when already at P1
2. Move Down Priority:
P1 → P2, P2 → P3, P3 → P4
   - Hidden when already at P4
3. Move to Next Day:
Sets Due Date to TODAY() + 1 day
Move to Two Days:
   - Sets Due Date to TODAY() + 2 days
5. Move to Next Week:
Sets Due Date to next Monday
   - If today is Monday, sets to next Monday (7 days forward)
Mark Complete:
   - Changes Status to “Completed”
   - Sets Completed Date to TODAY()
   - Task disappears from Open Tasks view (since we’re not showing completed tab initially)
AUTOMATION

Rollover Bot:
Runs: Daily (scheduled every day)
- Trigger: Scheduled event
- Condition: Check if [Due Date] < TODAY() AND Status = “Open”
- Action: For each matching task, execute “Set row values”
  * Due Date = IF(TODAY() > [Due Date], TODAY(), [Due Date])
  * This automatically moves overdue tasks to today
Logic: If a task’s due date is in the past and it’s still open, the bot updates the due date to today. This ensures incomplete tasks automatically “roll over” and don’t get lost.

DEFAULT VALUES SUMMARY
Status: “Open”
- Due Date: TODAY()
- Urgency: “P3”
- FollowUpItem: “N” (No/False)
- Created Date: TODAY() (auto-set on creation)
VISUAL DESIGN NOTES

Color Coding:
P1 (Highest Priority): Red exclamation mark icon “❗P1”
- P2 (High Priority): Yellow/gold indicator “P2”
- P3 (Medium Priority): Blue text “P3”
- P4 (Lower Priority): Blue text “P4”
Date Sidebar:
Selected/current date: Light blue background highlight
- Count badges: Gray circles with count number
- Clean, minimal styling
Task Rows:
Hover state: Subtle background color change
- Action buttons: Icon buttons with tooltips
- Consistent spacing and alignment
- Mobile-responsive (though primary use is desktop)
Detail Panel:
Slides in from right
- Organized sections with clear headers
- Edit button (top right) or direct inline editing
- Close X button (top right)
- Save/Cancel actions as needed
TECHNICAL REQUIREMENTS

Frontend:
Responsive web application
- Date grouping with virtual scrolling for performance
- Real-time updates when multiple users editing
- Smooth transitions for UI actions
- Form validation for required fields
Backend:
RESTful API for CRUD operations
- Scheduled job for daily rollover automation
- Database with proper indexing on Due Date and Status
- User authentication/authorization (if multi-user)
Data Validation:
Title is required
- Due Date is required
- Status must be valid enum value
- Urgency must be valid P1/P2/P3/P4
Business Rules:
Cannot move P1 higher in priority
- Cannot move P4 lower in priority
- Completed tasks get Completed Date timestamp
- Overdue open tasks roll to today automatically each day
INITIAL BUILD SCOPE

Include:
✓ Open Tasks view with date sidebar
✓ All 6 action buttons per task row
✓ Task detail panel
✓ Add new task functionality
✓ Edit task functionality
✓ Search/filter tasks
✓ Daily rollover automation
✓ Priority indicators with colors

Exclude (for initial build):
✗ Completed tasks tab/view
✗ Advanced filtering beyond date groups
✗ Bulk operations
✗ Export functionality
✗ Mobile app (web-only initially)
✗ Notifications/reminders
✗ Task templates

IMPLEMENTATION NOTES

The date-based sidebar is a critical UX element. Tasks should be grouped by due date in chronological order, with the ability to click any date to filter to just those tasks. The “All” option shows every open task regardless of date.

Action buttons should provide immediate visual feedback (disable/fade after click) and execute quickly without full page reload.

The rollover automation should run during off-peak hours (e.g., 2 AM) to avoid impacting active users.

Consider adding optimistic UI updates - when a user clicks an action button, update the UI immediately and sync with backend asynchronously to ensure responsive feel.

For the Projects dropdown, if no projects exist yet, the field can be hidden or shown as optional text input until projects are properly configured.
