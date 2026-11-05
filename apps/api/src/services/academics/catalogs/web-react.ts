import type { SubjectCurriculumPackage } from '../types.js';

export const webReactPackage: SubjectCurriculumPackage = {
  "id": "web-react",
  "aliases": [
    "react",
    "web",
    "web dev",
    "frontend",
    "fullstack",
    "javascript",
    "typescript",
    "nextjs"
  ],
  "subject": {
    "name": "Fullstack Web Development & React",
    "description": "Modern JavaScript/TypeScript, React 19 architecture, Virtual DOM, state management, REST APIs, and fullstack deployment.",
    "color": "#06B6D4",
    "icon": "globe"
  },
  "assignments": [
    {
      "title": "Week 1 Project: Interactive Responsive Kanban Board in TypeScript",
      "description": "Build a drag-and-drop Kanban task board using native DOM events, strict TypeScript interfaces, and LocalStorage persistence.",
      "daysDue": 7
    },
    {
      "title": "Week 2 Project: Real-Time Weather & Air Quality Dashboard in React",
      "description": "Implement a responsive React application with custom hooks, debounce search, live OpenWeather API integration, and skeleton loading states.",
      "daysDue": 14
    },
    {
      "title": "Week 3 Project: Production E-Commerce Cart with Context API & React Query",
      "description": "Architect shopping cart state management, checkout simulation, optimistic UI mutations, and server caching using TanStack React Query.",
      "daysDue": 21
    },
    {
      "title": "Week 4 Capstone: Fullstack Collaborative Study App with Auth & WebSockets",
      "description": "Deliver a fullstack application with JWT authentication, REST endpoints, real-time WebSocket messaging, and cloud deployment.",
      "daysDue": 28
    }
  ],
  "resources": [
    {
      "type": "youtube",
      "title": "React Course - Beginner's Tutorial for React (freeCodeCamp)",
      "url": "https://www.youtube.com/watch?v=bMknfKXIFA8",
      "providerItemId": "bMknfKXIFA8"
    },
    {
      "type": "youtube",
      "title": "React Tutorial for Beginners (Web Dev Simplified)",
      "url": "https://www.youtube.com/watch?v=SqcY0GlETPk",
      "providerItemId": "SqcY0GlETPk"
    },
    {
      "type": "youtube",
      "title": "React JS Crash Course (Traversy Media)",
      "url": "https://www.youtube.com/watch?v=w7ejDZ8SWv8",
      "providerItemId": "w7ejDZ8SWv8"
    },
    {
      "type": "web",
      "title": "React Official Documentation - Learn React",
      "url": "https://react.dev/learn",
      "providerItemId": null
    },
    {
      "type": "web",
      "title": "MDN Web Docs - JavaScript Guide",
      "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
      "providerItemId": null
    }
  ],
  "lectureDecks": [
    {
      "title": "Lecture 1: Modern JavaScript & TypeScript Foundations for React",
      "body": "## [SLIDE 1] 🎯 Course Objectives & The Modern Web Ecosystem\nWelcome to Fullstack Web Development & React! The modern web relies on asynchronous event-driven JavaScript/TypeScript powering reactive user interfaces.\n\n### 🎯 Key Learning Objectives\n* Master the JavaScript Event Loop, Microtask Queue, and Promises.\n* Utilize ES6+ features: Destructuring, Spread/Rest, Modules, and Closures.\n* Implement strict TypeScript interfaces, generics, and union types.\n\n💡 **Professor's Tip:** React does not replace JavaScript—it **leverages** JavaScript closures and pure functions to manage UI state declaratively!\n\n---\n\n## [SLIDE 2] 🧠 The JavaScript Event Loop Visualizer\n```text\nCall Stack (Synchronous Code)\n      │\n      ▼\nWeb APIs (setTimeout, fetch, DOM events)\n      │\n      ├──► Microtask Queue (Promise callbacks, queueMicrotask) [Highest Priority!]\n      │\n      └──► Macrotask Queue (setTimeout, setInterval, I/O)\n```\nThe Event Loop continuously checks: if the Call Stack is empty, flush the entire Microtask Queue before processing the next Macrotask!\n\n---\n\n## [SLIDE 3] 🏗️ TypeScript Type Safety Spectrum\n| Concept | JavaScript | TypeScript |\n| :--- | :--- | :--- |\n| **Type Checking** | Runtime only (Bugs hit users in production!) | Compile-time static analysis (Caught in IDE) |\n| **Interfaces & Types** | Not supported | Full structural typing contracts |\n| **Generics** | Implicit dynamic objects | Type-safe reusable pipelines (`T`) |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Type-Safe Async API Client\n```typescript\ninterface ApiResponse<T> {\n  data: T;\n  status: number;\n  message: string;\n}\n\ninterface UserProfile {\n  id: string;\n  name: string;\n  email: string;\n  role: \"student\" | \"instructor\" | \"admin\";\n}\n\nasync function fetchUserProfile(userId: string): Promise<UserProfile> {\n  const response = await fetch(`/api/users/${encodeURIComponent(userId)}`);\n  if (!response.ok) {\n    throw new Error(`HTTP Error ${response.status}: Failed to fetch user.`);\n  }\n  const payload: ApiResponse<UserProfile> = await response.json();\n  return payload.data;\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Mutating State In-Place:** Writing `arr.push(item)` mutates the existing array reference. React will NOT re-render because `oldArr === newArr`! Always return a new reference: `[...arr, item]`.\n2. **Double Render in Strict Mode:** In development, React renders components twice to detect side-effects in render loops. Never perform network calls or mutations directly in the component body!\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the difference between `==` and `===` in JavaScript?\n  * *Answer:* `==` performs loose equality with implicit type coercion; `===` performs strict equality checking both value and type without coercion.\n* **Q2:** Why are React component state variables immutable?\n  * *Answer:* Immutability allows React to perform shallow reference comparisons ($O(1)$) to quickly determine whether a re-render is required."
    },
    {
      "title": "Lecture 2: The Virtual DOM, React 19 Fiber Architecture & Reconciliation",
      "body": "## [SLIDE 1] 🎯 Reconciliation & The Virtual DOM\nDirect DOM manipulations (`document.createElement`, `appendChild`) are expensive operations that trigger browser layout recalibration and repainting.\n\n### 🎯 Key Learning Objectives\n* Understand the Virtual DOM tree and diffing algorithm.\n* Master the React 19 Fiber architecture and concurrent rendering.\n* Explain why `key` props are mandatory in lists for element stability.\n\n---\n\n## [SLIDE 2] 🧠 The Reconciliation Diffing Pipeline\n```text\nState Change (setCount)\n      │\n      ▼\nNew Virtual DOM Tree Generated\n      │\n      ▼ Diffing with Previous VDOM Tree ($O(N)$ heuristic)\nCompute Minimal Set of DOM Mutations (Fiber Work Loop)\n      │\n      ▼ Commit Phase\nBatch Update Real Browser DOM (Single Reflow / Repaint!)\n```\n\n---\n\n## [SLIDE 3] 🏗️ The Heuristic $O(N)$ Diffing Rules\n1. **Different Element Types:** If `<div>` changes to `<span>`, React destroys the old subtree entirely and builds a new one from scratch.\n2. **Keys on Lists:** Unique keys allow React to match children across renders, enabling efficient reordering without re-creating DOM nodes.\n\n---\n\n## [SLIDE 4] 💻 Production Code: Clean Declarative Component\n```tsx\nimport React, { useState } from \"react\";\n\ninterface CounterProps {\n  initialCount?: number;\n  label: string;\n}\n\nexport const ModernCounter: React.FC<CounterProps> = ({ initialCount = 0, label }) => {\n  const [count, setCount] = useState(initialCount);\n\n  return (\n    <div className=\"p-4 rounded-xl border bg-card text-card-foreground shadow-sm\">\n      <h3 className=\"text-sm font-medium text-muted-foreground\">{label}</h3>\n      <p className=\"text-3xl font-bold tracking-tight my-2\">{count}</p>\n      <div className=\"flex gap-2\">\n        <button \n          onClick={() => setCount((prev) => prev + 1)}\n          className=\"px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium\"\n        >\n          Increment\n        </button>\n        <button \n          onClick={() => setCount(0)}\n          className=\"px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm font-medium\"\n        >\n          Reset\n        </button>\n      </div>\n    </div>\n  );\n};\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Using Array Index as Key:** Using `key={index}` on dynamically changing lists corrupts form inputs and animation states when items are inserted or deleted. Always use unique identifiers (`key={item.id}`).\n2. **Stale Closures:** Updating state based on current value using `setCount(count + 1)` multiple times inside an async function only increments once. Always use functional updates: `setCount(prev => prev + 1)`.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the primary purpose of the Virtual DOM?\n  * *Answer:* To batch and minimize expensive direct manipulations of the browser's real DOM by calculating differences in memory.\n* **Q2:** Why should `key` attributes be unique among sibling elements?\n  * *Answer:* Keys provide identity to elements, allowing React to preserve component state and DOM nodes during list reordering."
    },
    {
      "title": "Lecture 3: React Hooks Deep Dive: useState, useEffect & useRef",
      "body": "## [SLIDE 1] 🎯 State & Lifecycle with Hooks\nHooks allow functional components to maintain private state, synchronize with external systems, and persist references across renders.\n\n### 🎯 Key Learning Objectives\n* Understand how `useState` triggers re-render cycles.\n* Master `useEffect` dependencies and cleanup functions.\n* Persist mutable values without re-renders using `useRef`.\n\n---\n\n## [SLIDE 2] 🧠 The useEffect Synchronization Lifecycle\n```text\nComponent Renders ──► Browser Paints Screen ──► useEffect Runs\n                              │\nWhen Dependencies Change:      │\n1. Run Cleanup Function of Previous Effect ──► 2. Run New Effect\n                              │\nWhen Component Unmounts:      │\nRun Final Cleanup Function (Cancel subscriptions, clear timers, abort fetch)\n```\n\n---\n\n## [SLIDE 3] 🏗️ useState vs useRef Comparison\n| Feature | `useState` | `useRef` |\n| :--- | :--- | :--- |\n| **Triggers Re-render?** | YES | NO |\n| **Access Method** | Read directly: `count` | Read through `.current`: `timerRef.current` |\n| **Primary Purpose** | UI State displayed on screen | Persistent mutable references (DOM elements, timer IDs) |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Debounced Search Hook\n```typescript\nimport { useState, useEffect } from \"react\";\n\nexport function useDebounce<T>(value: T, delayMs: number = 300): T {\n  const [debouncedValue, setDebouncedValue] = useState<T>(value);\n\n  useEffect(() => {\n    // Schedule timer to update debounced value\n    const timer = setTimeout(() => {\n      setDebouncedValue(value);\n    }, delayMs);\n\n    // Cleanup: cancel timer if value changes before delay expires\n    return () => {\n      clearTimeout(timer);\n    };\n  }, [value, delayMs]);\n\n  return debouncedValue;\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Missing Dependency in `useEffect`:** Omitting values used inside the effect from the dependency array produces stale closure bugs where the effect reads outdated state.\n2. **Infinite Re-render Loop:** Calling `setState` inside `useEffect` without a dependency array (or with an unstable object reference in dependencies) causes an endless re-render cycle.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** When does the cleanup function in `useEffect` execute?\n  * *Answer:* Right before the effect runs again due to dependency changes, and when the component unmounts.\n* **Q2:** Does mutating `myRef.current` trigger a re-render?\n  * *Answer:* No, `useRef` persists mutable values silently across renders without triggering a re-render."
    },
    {
      "title": "Lecture 4: Performance Optimization: useMemo, useCallback & memo",
      "body": "## [SLIDE 1] 🎯 Eliminating Redundant Re-Renders\nPremature optimization is a trap, but high-performance React applications require strategic memoization for expensive computations and stable callbacks.\n\n### 🎯 Key Learning Objectives\n* Understand React's default re-rendering behavior (parent render triggers children).\n* Cache expensive calculations with `useMemo`.\n* Preserve function reference equality with `useCallback`.\n* Wrap pure presentation components in `React.memo`.\n\n---\n\n## [SLIDE 2] 🧠 Reference Equality Visualizer\n```text\nParent Renders:\nconst handleClick = () => { ... }   <-- Creates NEW function memory reference in RAM!\nChildComponent receives props:\n<ChildComponent onClick={handleClick} />  <-- Prop reference changed -> CHILD RE-RENDERS!\n\nWith useCallback:\nconst handleClick = useCallback(() => { ... }, []) <-- REUSES IDENTICAL REFERENCE!\nChildComponent sees identical prop reference -> RE-RENDER SKIPPED!\n```\n\n---\n\n## [SLIDE 3] 🏗️ Memoization Cost-Benefit Rule\n* Use `useMemo` when:\n  1. Performing computationally expensive calculations (sorting 10,000 items, complex regex).\n  2. Passing an object/array as a dependency to another hook (`useEffect`).\n* Do NOT use `useMemo` for:\n  1. Primitive arithmetic (`a + b`)—the memoization overhead exceeds the calculation cost!\n\n---\n\n## [SLIDE 4] 💻 Production Code: Memoized Filter Component\n```tsx\nimport React, { useMemo, useCallback } from \"react\";\n\ninterface ItemListProps {\n  items: Array<{ id: string; name: string; category: string }>;\n  selectedCategory: string;\n  onItemSelect: (id: string) => void;\n}\n\nexport const FilteredItemList: React.FC<ItemListProps> = React.memo(({\n  items,\n  selectedCategory,\n  onItemSelect\n}) => {\n  // Memoize filtered results to avoid re-filtering unless items or category changes\n  const filteredItems = useMemo(() => {\n    return items.filter(\n      (item) => selectedCategory === \"all\" || item.category === selectedCategory\n    );\n  }, [items, selectedCategory]);\n\n  return (\n    <ul className=\"space-y-1\">\n      {filteredItems.map((item) => (\n        <li \n          key={item.id} \n          onClick={() => onItemSelect(item.id)}\n          className=\"p-2 hover:bg-accent rounded cursor-pointer text-sm\"\n        >\n          {item.name}\n        </li>\n      ))}\n    </ul>\n  );\n});\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Wrapping everything in `useCallback`:** Adding `useCallback` to simple inline handlers without passing them to a memoized child (`React.memo`) is completely useless and adds memory overhead.\n2. **Missing Dependencies in `useCallback`:** A callback that captures state without including it in the dependency array will forever execute with initial state values!\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the difference between `useMemo` and `useCallback`?\n  * *Answer:* `useMemo` caches the calculated result of invoking a function; `useCallback` caches the function definition itself.\n* **Q2:** What does `React.memo` do?\n  * *Answer:* It performs shallow comparisons of incoming props; if props haven't changed, it skips rendering that component."
    },
    {
      "title": "Lecture 5: Global State Management: Context API & TanStack React Query",
      "body": "## [SLIDE 1] 🎯 Server State vs Client State\nManaging data in web apps requires separating ephemeral client UI state (modals, active tabs) from asynchronous server cache state (data fetched from databases).\n\n### 🎯 Key Learning Objectives\n* Understand Prop Drilling and how Context API resolves it.\n* Contrast Client State vs Server Cache State.\n* Master TanStack React Query: Stale-While-Revalidate, caching, and optimistic updates.\n\n---\n\n## [SLIDE 2] 🧠 Server State Lifecycle (React Query)\n```text\nUser loads page:\n1. Return cached data immediately from memory (Instant UI, no loader!)\n2. Background fetch to server: GET /api/notes\n3. Compare responses: If server has newer data, re-render with fresh data!\n4. Mark data as \"stale\" after staleTime (e.g. 60 seconds).\n```\n\n---\n\n## [SLIDE 3] 🏗️ Client State vs Server State Architecture\n| Dimension | Client State (Context / Zustand) | Server State (React Query / SWR) |\n| :--- | :--- | :--- |\n| **Ownership** | Purely local to user's browser | Remote source of truth in database |\n| **Challenges** | Component hierarchy propagation | Network latency, cache invalidation, polling, deduplication |\n| **Examples** | Dark mode toggle, sidebar collapsed | User list, academic grades, notifications |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Type-Safe React Query Hook\n```typescript\nimport { useQuery, useMutation, useQueryClient } from \"@tanstack/react-query\";\n\ninterface Task {\n  id: string;\n  title: string;\n  completed: boolean;\n}\n\nexport function useTasks() {\n  const queryClient = useQueryClient();\n\n  const tasksQuery = useQuery<Task[]>({\n    queryKey: [\"tasks\"],\n    queryFn: async () => {\n      const res = await fetch(\"/api/tasks\");\n      if (!res.ok) throw new Error(\"Failed to load tasks\");\n      return res.json();\n    },\n    staleTime: 1000 * 60 * 2, // Fresh for 2 minutes\n  });\n\n  const toggleTask = useMutation({\n    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {\n      await fetch(`/api/tasks/${id}`, {\n        method: \"PATCH\",\n        headers: { \"Content-Type\": \"application/json\" },\n        body: JSON.stringify({ completed }),\n      });\n    },\n    onSuccess: () => {\n      // Invalidate and refetch fresh tasks immediately\n      queryClient.invalidateQueries({ queryKey: [\"tasks\"] });\n    },\n  });\n\n  return { ...tasksQuery, toggleTask };\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Using Context for Rapidly Changing Data:** Context triggers re-renders on ALL consumer components whenever its value changes. Rapidly changing values (e.g. cursor coordinates) cause severe lag in Context. Use Zustand or signals instead.\n2. **Missing Query Keys:** TanStack Query caches data based on the query key array. Reusing generic keys across different filters causes conflicting cache collisions.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What does Stale-While-Revalidate mean?\n  * *Answer:* The client immediately renders existing cached data while simultaneously initiating a background network request to revalidate and update stale content.\n* **Q2:** Why should you separate server state from client state?\n  * *Answer:* Server state involves network latency, multiple users modifying data, and requires caching and retries, whereas client state is synchronous and ephemeral."
    },
    {
      "title": "Lecture 6: Fullstack Architecture: REST APIs, Hono, Express & Middlewares",
      "body": "## [SLIDE 1] 🎯 Backend Architecture for Frontend Engineers\nA fullstack engineer understands both sides of the wire: how HTTP requests are routed, validated, and secured on the server.\n\n### 🎯 Key Learning Objectives\n* Understand the HTTP/1.1 and HTTP/2 protocol (Headers, Status Codes, Methods).\n* Master RESTful API design principles and idempotent operations.\n* Build fast middleware pipelines using modern frameworks like Hono or Express.\n\n---\n\n## [SLIDE 2] 🧠 The Middleware Pipeline Architecture\n```text\nClient Request: POST /api/tasks\n      │\n      ▼\nMiddleware 1: CORS & Security Headers\n      │\n      ▼\nMiddleware 2: JWT Authentication (Verify Bearer Token & extract userId)\n      │\n      ▼\nMiddleware 3: Zod Schema Validation (Ensure payload structure is valid)\n      │\n      ▼\nRoute Handler: Business Logic & Database Operation (PostgreSQL via Drizzle)\n      │\n      ▼\nClient Response: JSON { success: true, data: { ... } } (HTTP 201 Created)\n```\n\n---\n\n## [SLIDE 3] 🏗️ HTTP Method Idempotence Matrix\n| Method | Idempotent? | Safe? | Typical Purpose |\n| :--- | :--- | :--- | :--- |\n| **GET** | YES | YES | Read data (Zero side effects) |\n| **POST** | NO | NO | Create a new record |\n| **PUT** | YES | NO | Replace existing record entirely |\n| **PATCH**| NO | NO | Partially update specific fields |\n| **DELETE**| YES | NO | Remove record |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Hono REST API Route with Zod\n```typescript\nimport { Hono } from \"hono\";\nimport { zValidator } from \"@hono/zod-validator\";\nimport { z } from \"zod\";\n\nconst taskSchema = z.object({\n  title: z.string().min(1).max(200),\n  priority: z.enum([\"P1\", \"P2\", \"P3\"]).default(\"P2\"),\n  estimatedMins: z.number().int().positive().optional(),\n});\n\nexport const taskApi = new Hono()\n  .post(\"/\", zValidator(\"json\", taskSchema), async (c) => {\n    const validatedData = c.req.valid(\"json\");\n    // Insert into database...\n    return c.json({ success: true, task: { id: \"task_1\", ...validatedData } }, 201);\n  })\n  .get(\"/:id\", async (c) => {\n    const taskId = c.req.param(\"id\");\n    return c.json({ success: true, task: { id: taskId, title: \"StudyOS Task\" } });\n  });\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Returning HTTP 200 on Errors:** Returning `{ error: \"Not found\" }` with HTTP 200 OK breaks client-side error handling in Axios and React Query. Always return accurate HTTP status codes (400, 401, 403, 404, 500).\n2. **CORS Misunderstandings:** CORS is enforced by the **browser**, not the server! Server-to-server or curl requests bypass CORS entirely.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What does idempotence mean in REST APIs?\n  * *Answer:* An operation is idempotent if making multiple identical requests has the exact same side-effect on the server as making a single request (e.g., DELETE, PUT).\n* **Q2:** What is the difference between HTTP 401 Unauthorized and HTTP 403 Forbidden?\n  * *Answer:* 401 means the client is unauthenticated (missing or invalid credentials); 403 means the identity is known, but lacks permission to access the resource."
    },
    {
      "title": "Lecture 7: WebSockets & Real-Time Bidirectional Communication",
      "body": "## [SLIDE 1] 🎯 Beyond HTTP: Full-Duplex Real-Time Sockets\nTraditional HTTP request-response architecture requires polling to receive new data. WebSockets provide persistent, low-latency, bidirectional communication.\n\n### 🎯 Key Learning Objectives\n* Understand the HTTP-to-WebSocket Upgrade Handshake.\n* Compare Short Polling, Long Polling, Server-Sent Events (SSE), and WebSockets.\n* Implement robust client reconnection with exponential backoff and heartbeat pings.\n\n---\n\n## [SLIDE 2] 🧠 The WebSocket Handshake Pipeline\n```text\nClient                                                   Server\n  │                                                        │\n  │─── HTTP GET /ws (Upgrade: websocket, Sec-WebSocket-Key)──►\n  │                                                        │\n  │◄── HTTP 101 Switching Protocols (Connection Upgraded) ─│\n  │                                                        │\n  ══════════════════════════════════════════════════════════\n               Persistent TCP Full-Duplex Stream\n  │─── JSON Frame: {\"action\": \"join_room\"} ───────────────►│\n  │◄── Binary/JSON Frame: {\"event\": \"new_message\"} ────────│\n  │─── Ping Frame ────────────────────────────────────────►│\n  │◄── Pong Frame ─────────────────────────────────────────│\n```\n\n---\n\n## [SLIDE 3] 🏗️ Real-Time Technology Comparison\n| Technology | Direction | Transport | Overhead per message | Best Use Case |\n| :--- | :--- | :--- | :--- | :--- |\n| **Short Polling** | Unidirectional | HTTP | High (Full HTTP headers every interval) | Infrequent updates |\n| **SSE (Server-Sent Events)** | Server to Client | HTTP | Low | Live stock feeds, AI token streaming |\n| **WebSockets** | Full-Duplex | Persistent TCP | Minimal (2 to 10 bytes framing header) | Collaborative apps, multiplayer games |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Resilient WebSocket Client\n```typescript\nexport class StudyOSSocketClient {\n  private ws: WebSocket | null = null;\n  private reconnectAttempts = 0;\n  private url: string;\n\n  constructor(url: string) {\n    this.url = url;\n    this.connect();\n  }\n\n  private connect() {\n    this.ws = new WebSocket(this.url);\n\n    this.ws.onopen = () => {\n      console.log(\"[WS] Connected to real-time server.\");\n      this.reconnectAttempts = 0;\n    };\n\n    this.ws.onclose = () => {\n      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);\n      console.warn(`[WS] Disconnected. Reconnecting in ${delay}ms...`);\n      this.reconnectAttempts++;\n      setTimeout(() => this.connect(), delay);\n    };\n\n    this.ws.onerror = (err) => console.error(\"[WS] Socket error:\", err);\n  }\n\n  public send(payload: Record<string, unknown>) {\n    if (this.ws?.readyState === WebSocket.OPEN) {\n      this.ws.send(JSON.stringify(payload));\n    }\n  }\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Zombie Connections (Silent Socket Drops):** Cellular networks or sleep states can sever a TCP connection without firing an `onclose` event. Always implement heartbeat ping/pong signals to detect and prune dead connections.\n2. **Missing State Buffering:** Attempting to call `ws.send()` before the `onopen` event fires throws an `INVALID_STATE_ERR` exception. Always buffer messages until the connection is established.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What HTTP status code is returned during a successful WebSocket handshake?\n  * *Answer:* HTTP 101 Switching Protocols.\n* **Q2:** Why are WebSockets more efficient than HTTP polling for high-frequency updates?\n  * *Answer:* Once established, WebSocket frames carry only 2 to 10 bytes of header overhead, avoiding repetitive HTTP header exchanges and connection re-establishment."
    },
    {
      "title": "Lecture 8: Production Security, Authentication (JWT/Cookies) & Deployment",
      "body": "## [SLIDE 1] 🎯 Production Hardening & Fullstack Delivery\nWriting functional code is only half the battle; deploying software to production requires defensive security, CSRF/XSS mitigations, and CI/CD pipelines.\n\n### 🎯 Key Learning Objectives\n* Understand JWT tokens vs Session Cookies and their security implications.\n* Defend against OWASP Top 10 vulnerabilities (XSS, CSRF, SQL Injection).\n* Master Production Build optimization: Code splitting, tree shaking, and CDN caching.\n\n---\n\n## [SLIDE 2] 🧠 Secure Authentication Token Flow\n```text\nClient (Browser)                                    Server (API)\n  │ 1. POST /api/auth/login (email, password)           │\n  │────────────────────────────────────────────────────►│ Validate credentials\n  │                                                     │ Generate Access & Refresh Tokens\n  │ 2. Response: Set-Cookie: refreshToken (HttpOnly, Secure, SameSite=Strict)\n  │              Body: { accessToken: \"eyJhbGci...\" }   │\n  │◄────────────────────────────────────────────────────│\n  │\n  │ 3. Subsequent Request:\n  │    Headers: Authorization: Bearer <accessToken>\n  │    Cookies: refreshToken automatically attached\n  │────────────────────────────────────────────────────►│ Verify JWT signature\n```\n\n---\n\n## [SLIDE 3] 🏗️ OWASP Web Vulnerability Defenses\n| Threat | Attack Vector | Production Defense |\n| :--- | :--- | :--- |\n| **XSS (Cross-Site Scripting)** | Attacker injects malicious `<script>` into HTML | Sanitize inputs, avoid `dangerouslySetInnerHTML`, enforce strict CSP |\n| **CSRF (Cross-Site Request Forgery)**| Malicious site triggers authenticated action | Use `SameSite=Lax` or `Strict` cookies, require CSRF tokens |\n| **SQL Injection** | Attacker injects raw SQL strings | Use parameterized queries and ORMs (Drizzle / Prisma) |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Secure JWT Verification Middleware\n```typescript\nimport { Context, Next } from \"hono\";\nimport { verify } from \"hono/jwt\";\n\nexport async function requireAuth(c: Context, next: Next) {\n  const authHeader = c.req.header(\"Authorization\");\n  if (!authHeader?.startsWith(\"Bearer \")) {\n    return c.json({ success: false, error: \"Missing or invalid authorization header\" }, 401);\n  }\n\n  const token = authHeader.substring(7);\n  try {\n    const payload = await verify(token, process.env.JWT_SECRET!);\n    c.set(\"jwtPayload\", payload);\n    await next();\n  } catch (err) {\n    return c.json({ success: false, error: \"Token expired or invalid\" }, 401);\n  }\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Storing JWT in `localStorage`:** Tokens in `localStorage` are accessible to ANY JavaScript code running on the page, making them vulnerable to XSS token theft! Store refresh tokens in `HttpOnly`, `Secure`, `SameSite=Strict` cookies.\n2. **Missing Rate Limiting:** Exposing unauthenticated login endpoints without rate limiting allows attackers to brute-force user passwords.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What does the `HttpOnly` flag on a cookie do?\n  * *Answer:* Prevents client-side JavaScript (`document.cookie`) from reading the cookie, protecting it from theft via Cross-Site Scripting (XSS).\n* **Q2:** What is tree-shaking in modern bundlers (Vite, Webpack)?\n  * *Answer:* The process of statically analyzing ES module imports and exports to remove unused dead code from the final production bundle."
    }
  ],
  "dailyLessons": [
    {
      "dayNumber": 1,
      "title": "Modern JS: ES6+, Arrow Functions, Destructuring & Modules",
      "subtasks": [
        "Practice array and object destructuring with default fallback values",
        "Use spread (...) and rest operators for immutable state updates",
        "Configure modern ES modules (import/export) in package.json",
        "Explain this binding differences between regular functions and arrow functions"
      ],
      "notes": "# Modern JavaScript Foundations\\n\\nES6+ provides concise syntax and structural immutability patterns."
    },
    {
      "dayNumber": 2,
      "title": "TypeScript Essentials: Types, Interfaces, Generics & Unions",
      "subtasks": [
        "Define strict interfaces for domain models",
        "Implement discriminated union types for finite state representation",
        "Write generic functions with type parameter constraints (T extends object)",
        "Configure strict mode in tsconfig.json"
      ],
      "notes": "# TypeScript in Modern Frontend\\n\\nStatic typing catches syntax and runtime bugs at compile time."
    },
    {
      "dayNumber": 3,
      "title": "Asynchronous JS: Event Loop, Promises & async/await",
      "subtasks": [
        "Trace synchronous call stack vs microtask and macrotask queues",
        "Execute parallel promises using Promise.all() and Promise.allSettled()",
        "Handle asynchronous errors gracefully with try-catch and custom error types",
        "Construct abortable network requests using AbortController"
      ],
      "notes": "# Asynchronous JavaScript\\n\\nThe Event Loop prioritizes microtasks over macrotasks when flushing the call stack."
    },
    {
      "dayNumber": 4,
      "title": "DOM Manipulation & Native Event Architecture",
      "subtasks": [
        "Traverse and mutate the DOM tree using querySelector and classList",
        "Implement event delegation on parent container for dynamic lists",
        "Explain event bubbling vs event capturing phases",
        "Prevent default behaviors and stop event propagation idiomatically"
      ],
      "notes": "# The Browser DOM\\n\\nEvent delegation captures events from dynamically generated child nodes."
    },
    {
      "dayNumber": 5,
      "title": "Toolchain: Vite, NPM Scripts & Modern Bundling",
      "subtasks": [
        "Scaffold a high-speed React app using Vite",
        "Configure environment variables with VITE_ prefixes",
        "Inspect Hot Module Replacement (HMR) in development",
        "Build production bundle and inspect dist/ output asset sizes"
      ],
      "notes": "# Modern Tooling\\n\\nVite leverages native ES modules in development for sub-second hot reload."
    },
    {
      "dayNumber": 6,
      "title": "TypeScript Drag-and-Drop Kanban Board Milestone",
      "subtasks": [
        "Implement dragstart, dragover, and drop native HTML5 event handlers",
        "Persist board column state in localStorage",
        "Enforce strict TypeScript types on task cards and columns",
        "Complete Week 1 Project: Interactive Responsive Kanban Board"
      ],
      "notes": "# DOM Project Review\\n\\nMastering native DOM events establishes core instincts for React state abstractions."
    },
    {
      "dayNumber": 7,
      "title": "React Fundamentals: JSX, Components, Props & Composition",
      "subtasks": [
        "Explain why JSX compiles to React.createElement function calls",
        "Pass typed props and render conditional components cleanly",
        "Compose modular layouts using children props",
        "Deconstruct complex UI into single-responsibility presentational components"
      ],
      "notes": "# React Architecture\\n\\nReact components are pure functions of props and state."
    },
    {
      "dayNumber": 8,
      "title": "React State: useState & Immutable Updates",
      "subtasks": [
        "Declare primitive and complex state using useState hook",
        "Update state immutably using array filter/map and object spread",
        "Use functional state updates (prev => prev + 1) to eliminate stale closures",
        "Lift state up to common ancestor components when sharing state"
      ],
      "notes": "# State & Immutability\\n\\nNever mutate state directly; always pass new references to trigger reconciliation."
    },
    {
      "dayNumber": 9,
      "title": "React Side Effects: useEffect Lifecycle & Cleanup",
      "subtasks": [
        "Fetch data from REST API inside useEffect",
        "Implement cleanup function to abort network requests when unmounting",
        "Manage dependency arrays accurately to prevent infinite re-render loops",
        "Differentiate between component mount, update, and unmount lifecycles"
      ],
      "notes": "# Side Effects\\n\\n`useEffect` synchronizes React components with external browser APIs."
    },
    {
      "dayNumber": 10,
      "title": "React References & Forms: useRef & Controlled Components",
      "subtasks": [
        "Persist mutable instance variables without triggering re-renders via useRef",
        "Focus input elements and access direct DOM nodes using ref callbacks",
        "Build controlled form inputs with two-way value/onChange bindings",
        "Validate form submission with custom validation errors"
      ],
      "notes": "# Refs & Forms\\n\\nControlled components maintain form input state inside React component memory."
    },
    {
      "dayNumber": 11,
      "title": "Custom React Hooks: Reusable State Abstractions",
      "subtasks": [
        "Extract reusable logic into useLocalStorage custom hook",
        "Implement useWindowSize hook for responsive dynamic layouts",
        "Build useDebounce hook to throttle expensive search queries",
        "Write unit tests for custom hooks using React Testing Library"
      ],
      "notes": "# Custom Hooks\\n\\nCustom hooks package stateful logic for reuse across multiple components."
    },
    {
      "dayNumber": 12,
      "title": "React Weather Dashboard Milestone",
      "subtasks": [
        "Connect to live OpenWeather API with debounced search input",
        "Render animated weather icons and hourly temperature graphs",
        "Display skeleton loading states and network error banners",
        "Complete Week 2 Project: Real-Time Weather & Air Quality Dashboard"
      ],
      "notes": "# Component Integration\\n\\nCombining custom hooks, debouncing, and skeleton loaders creates a polished user experience."
    },
    {
      "dayNumber": 13,
      "title": "React Optimization: useMemo, useCallback & React.memo",
      "subtasks": [
        "Profile component renders using React DevTools Profiler",
        "Cache expensive calculations using useMemo",
        "Preserve callback function reference identity using useCallback",
        "Prevent child re-renders using React.memo on pure presentation components"
      ],
      "notes": "# Performance Tuning\\n\\nMemoize expensive computations and callbacks passed to memoized children."
    },
    {
      "dayNumber": 14,
      "title": "Global State: Context API & useReducer",
      "subtasks": [
        "Create typed React Context for application theme and user sessions",
        "Manage complex state transitions using useReducer dispatch actions",
        "Combine Context with useReducer for lightweight global state",
        "Avoid context performance pitfalls by splitting state and dispatch contexts"
      ],
      "notes": "# Context API\\n\\nContext provides component tree-wide data access without prop drilling."
    },
    {
      "dayNumber": 15,
      "title": "Server State: TanStack React Query (useQuery & useMutation)",
      "subtasks": [
        "Install and configure QueryClientProvider with cache settings",
        "Fetch and cache server data with useQuery using staleTime and gcTime",
        "Execute mutations with useMutation and invalidate cache on success",
        "Implement optimistic UI updates that roll back on network failure"
      ],
      "notes": "# TanStack React Query\\n\\nSeparates remote server caching from local UI state."
    },
    {
      "dayNumber": 16,
      "title": "Client-Side Routing: React Router & Dynamic Nested Routes",
      "subtasks": [
        "Configure browser routing with createBrowserRouter and RouterProvider",
        "Define dynamic URL parameters (/courses/:id) and read via useParams",
        "Implement nested layout routes with <Outlet />",
        "Protect authenticated routes with redirect guards"
      ],
      "notes": "# Routing Architecture\\n\\nClient-side routers render appropriate component trees based on browser URL changes."
    },
    {
      "dayNumber": 17,
      "title": "Styling: Tailwind CSS, CSS Modules & Design Systems",
      "subtasks": [
        "Build mobile-first responsive layouts using Tailwind utility classes",
        "Configure custom design system tokens in tailwind.config.js",
        "Compose reusable UI components using Class Variance Authority (CVA)",
        "Implement dark mode switching with CSS custom variables"
      ],
      "notes": "# Design Systems\\n\\nTailwind CSS enables rapid, utility-first design without leaving JSX."
    },
    {
      "dayNumber": 18,
      "title": "Production E-Commerce Cart Milestone",
      "subtasks": [
        "Build cart state management with persistent LocalStorage and Context",
        "Add optimistic item quantity increment/decrement with instant feedback",
        "Simulate checkout payment step with validation",
        "Complete Week 3 Project: Production E-Commerce Cart with Context API"
      ],
      "notes": "# E-Commerce Architecture\\n\\nOptimistic updates provide instant perceived responsiveness."
    },
    {
      "dayNumber": 19,
      "title": "Backend Foundations: Node.js, Bun & RESTful API Design",
      "subtasks": [
        "Compare Node.js and Bun runtime performance and package managers",
        "Design standard RESTful endpoints following HTTP verb semantics",
        "Return structured JSON envelopes with consistent error formats",
        "Implement request logging and CORS configuration"
      ],
      "notes": "# Backend API Design\\n\\nUse correct HTTP methods and return standardized error envelopes."
    },
    {
      "dayNumber": 20,
      "title": "Hono Web Framework: Routing, Zod Validation & Middleware",
      "subtasks": [
        "Create an edge-ready web server using Hono",
        "Validate JSON request bodies strictly using zValidator and Zod",
        "Write custom timing and authentication middleware",
        "Organize route modules cleanly with app.route()"
      ],
      "notes": "# Modern API Frameworks\\n\\nHono provides lightweight, TypeScript-first routing across Node, Bun, and edge runtimes."
    },
    {
      "dayNumber": 21,
      "title": "WebSockets: Real-Time Bidirectional Communication",
      "subtasks": [
        "Implement WebSocket server endpoint and handle client connections",
        "Broadcast messages to rooms and channels",
        "Build frontend React socket hook with automatic reconnection",
        "Handle heartbeat ping/pong frames to detect dead connections"
      ],
      "notes": "# Real-Time WebSockets\\n\\nWebSockets enable persistent full-duplex communication for live collaboration."
    },
    {
      "dayNumber": 22,
      "title": "Authentication: JWTs, Passwords & HttpOnly Cookies",
      "subtasks": [
        "Hash user passwords securely with bcrypt / argon2",
        "Generate signed JSON Web Tokens (JWT) with expiration times",
        "Store refresh tokens in HttpOnly, Secure, SameSite cookies",
        "Protect backend endpoints with JWT verification middleware"
      ],
      "notes": "# Authentication & Security\\n\\nAlways hash passwords and store refresh tokens in secure HttpOnly cookies."
    },
    {
      "dayNumber": 23,
      "title": "Web Security: OWASP Hardening (CORS, CSRF, XSS & CSP)",
      "subtasks": [
        "Configure Content Security Policy (CSP) headers",
        "Sanitize untrusted user input to prevent XSS attacks",
        "Mitigate CSRF by configuring SameSite cookie policies",
        "Implement rate limiting on authentication routes"
      ],
      "notes": "# Production Security\\n\\nDefense-in-depth requires CSP headers, input sanitization, and rate limiting."
    },
    {
      "dayNumber": 24,
      "title": "Fullstack Capstone: Collaborative Study App & Cloud Deployment",
      "subtasks": [
        "Connect React frontend with authenticated Hono backend",
        "Deploy frontend to Vercel/Render and backend to Render/Fly.io",
        "Verify HTTPS certificates, CORS origins, and environment variables",
        "Complete Week 4 Capstone: Fullstack Collaborative Study App with Auth"
      ],
      "notes": "# Fullstack Mastery\\n\\nCongratulations! You have mastered fullstack development with modern React, TypeScript, and APIs."
    }
  ]
};
