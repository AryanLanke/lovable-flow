# Kanban Board with AI Assistant

## What you'll get
A dark, glowing Kanban board styled after your reference: near-black canvas, slim icon sidebar, and richly tinted cards (rust, navy, plum, forest, teal) with a rounded colored icon tile, white title, muted time line, and small "pill" chips.

### Board
- Three columns: **To Do**, **In Progress**, **Complete** (column header shows count).
- Drag and drop cards between and within columns, with smooth lift/settle animation.
- Each card shows: title, short description preview, due date (e.g. "Oct 12 > 5 PM"), time estimate pill (e.g. "2h"), and category tag pills. Card tint comes from its first category.
- Overdue cards get a subtle red "Left / Overdue" indicator, echoing the "Left 48m" line in the reference.
- Click a card to open a detail panel: edit title, description, due date, estimate, tags; delete.
- "+ Add task" at the bottom of each column. Search and filter-by-tag in the top bar.

### Sidebar
- Left icon rail like the reference: app mark, category list with colored icons and counts, button to open the AI assistant.

### AI assistant
- Slide-out chat panel available from anywhere on the board.
- Full task assistant: answers questions ("what's due this week?", "how many hours are in progress?") and can create, edit, move, and delete cards. Changes appear on the board immediately; actions it took are shown as small collapsible cards in the chat.
- Multiple saved conversations: thread list, "New chat" button, each thread has its own link and survives reloads.

### Saving
- Everything (tasks, chats) is saved with Lovable Cloud, so you can come back anytime.
- No sign-in: one shared board — anyone with the link can view and edit it.
- Starts with a handful of example tasks so the board isn't empty.

## Technical details
- Lovable Cloud tables: `tasks` (title, description, status, position, due_at, estimate_minutes, tags text[]), `chat_threads`, `chat_messages` (UIMessage JSON). Public anon read/write policies (per no-auth choice), with GRANTs; seed tasks in migration.
- Server functions for task CRUD; streaming chat route `/api/chat` using AI SDK + Lovable AI Gateway (`openai/gpt-6-astra`, Responses API) with tools: listTasks, createTask, updateTask, moveTask, deleteTask. Board refetches via TanStack Query after tool calls.
- Routes: `/` board, `/chat/$threadId` board with chat panel open on that thread.
- Drag and drop with `@dnd-kit`; animations with Motion; chat UI with AI Elements.
- Design tokens in `src/styles.css` (oklch dark palette, per-category tint tokens); a rounded geometric sans (e.g. Manrope) via `<link>`.
