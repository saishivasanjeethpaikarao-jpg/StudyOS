import type { SubjectCurriculumPackage } from '../types.js';

export const dsaPackage: SubjectCurriculumPackage = {
  "id": "dsa",
  "aliases": [
    "dsa",
    "data structures",
    "algorithms",
    "data structures and algorithms",
    "leetcode",
    "competitive programming"
  ],
  "subject": {
    "name": "Data Structures & Algorithms (DSA)",
    "description": "Core algorithms, asymptotic time/space complexities, tree/graph traversals, dynamic programming, and interview patterns.",
    "color": "#10B981",
    "icon": "code"
  },
  "assignments": [
    {
      "title": "Week 1 Project: High-Throughput LRU Cache & Doubly-Linked List",
      "description": "Implement a production-grade Least Recently Used (LRU) Cache supporting O(1) get() and put() using a hash map combined with a doubly-linked list.",
      "daysDue": 7
    },
    {
      "title": "Week 2 Project: Expression Evaluator & Monotonic Stack Engine",
      "description": "Build an algebraic arithmetic expression parser supporting nested parentheses, operator precedence, and Daily Temperatures monotonic stack algorithms.",
      "daysDue": 14
    },
    {
      "title": "Week 3 Project: Trie Autocomplete Engine & Topological Sort Dependency Graph",
      "description": "Construct a Trie (Prefix Tree) for sub-millisecond search autocomplete and a Directed Acyclic Graph (DAG) topological sort package manager.",
      "daysDue": 21
    },
    {
      "title": "Week 4 Capstone: Real-Time Dijkstra Shortest Path & DP Optimizer",
      "description": "Implement Dijkstra's shortest path routing engine with a min-heap priority queue and 0/1 Knapsack dynamic programming optimizations.",
      "daysDue": 28
    }
  ],
  "resources": [
    {
      "type": "youtube",
      "title": "Algorithms and Data Structures Tutorial - Full Course (freeCodeCamp)",
      "url": "https://www.youtube.com/watch?v=8hly31xKli0",
      "providerItemId": "8hly31xKli0"
    },
    {
      "type": "youtube",
      "title": "Data Structures and Algorithms for Beginners (Bro Code)",
      "url": "https://www.youtube.com/watch?v=CBYHwZcbD-s",
      "providerItemId": "CBYHwZcbD-s"
    },
    {
      "type": "youtube",
      "title": "Introduction to Algorithms - Complete Masterclass (Abdul Bari)",
      "url": "https://www.youtube.com/watch?v=0IAPZzGSbME",
      "providerItemId": "0IAPZzGSbME"
    },
    {
      "type": "youtube",
      "title": "Two Sum - Hash Map & Array Mastery (NeetCode)",
      "url": "https://www.youtube.com/watch?v=KLlXCFG5TnA",
      "providerItemId": "KLlXCFG5TnA"
    },
    {
      "type": "web",
      "title": "GeeksforGeeks - Data Structures and Algorithms Reference",
      "url": "https://www.geeksforgeeks.org/data-structures/",
      "providerItemId": null
    },
    {
      "type": "web",
      "title": "VisuAlgo - Visualising Data Structures and Algorithms",
      "url": "https://visualgo.net/en",
      "providerItemId": null
    }
  ],
  "lectureDecks": [
    {
      "title": "Lecture 1: Asymptotic Analysis, Big-O Notation & Space-Time Tradeoffs",
      "body": "## [SLIDE 1] 🎯 Course Objectives & The Core Mindset of DSA\nData Structures and Algorithms form the foundation of software engineering, separating developers who write code from engineers who architect scalable systems.\n\n### 🎯 Key Learning Objectives\n* Understand Formal Asymptotic Notations: Big-$O$, Big-$\\Omega$, and Big-$\\Theta$.\n* Master Space vs Time Complexity tradeoffs.\n* Recognize common complexity curves from $O(1)$ to $O(2^N)$.\n\n💡 **Professor's Tip:** When optimizing code, **measure first**. Improving an algorithm from $O(N^2)$ to $O(N \\log N)$ beats any micro-level compiler optimization!\n\n---\n\n## [SLIDE 2] 🧠 Algorithmic Complexity Growth Curves\n```text\nExecution Time\n      ▲\n      │                                                * O(2^N) [Exponential]\n      │                                            *\n      │                                         *    * O(N^2) [Quadratic]\n      │                                       *    *\n      │                                     *    *   * O(N log N) [Linearithmic]\n      │                                   *    *   *\n      │                                 *    *   *   * O(N) [Linear]\n      │                               *    *   *   *\n      │   -------------------------------------------* O(log N) [Logarithmic]\n      │   -------------------------------------------* O(1) [Constant]\n      └─────────────────────────────────────────────────────► Input Size (N)\n```\n\n---\n\n## [SLIDE 3] 🏗️ The 3 Asymptotic Bounds\n| Notation | Definition | Practical Engineering Meaning |\n| :--- | :--- | :--- |\n| **Big-$O$ ($O$)** | $f(N) \\le c \\cdot g(N)$ | **Worst-Case Upper Bound** (Guaranteed upper limit) |\n| **Big-$\\Omega$ ($\\Omega$)** | $f(N) \\ge c \\cdot g(N)$ | **Best-Case Lower Bound** (Minimum possible operations) |\n| **Big-$\\Theta$ ($\\Theta$)** | $c_1 \\cdot g(N) \\le f(N) \\le c_2 \\cdot g(N)$ | **Tight Bound** (Exact asymptotic behavior) |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Two-Pointer Pair Sum\n```python\ndef two_sum_sorted(nums: list[int], target: int) -> tuple[int, int]:\n    \"\"\"\n    Finds pair with sum == target in a SORTED array.\n    Time Complexity: O(N) linear time\n    Space Complexity: O(1) constant auxiliary space\n    \"\"\"\n    left = 0\n    right = len(nums) - 1\n\n    while left < right:\n        current_sum = nums[left] + nums[right]\n        if current_sum == target:\n            return (left, right)\n        elif current_sum < target:\n            left += 1   # Need larger sum -> move left rightward\n        else:\n            right -= 1  # Need smaller sum -> move right leftward\n\n    raise ValueError(\"No two elements sum to target.\")\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Ignoring Auxiliary Space:** In recursive algorithms, stack frames consume $O(D)$ space where $D$ is the maximum recursion depth.\n2. **Assuming $O(N)$ for string concatenation in loops:** In many languages, `s += char` inside a loop of length $N$ takes $O(N^2)$ because strings are copied each time!\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the average and worst-case time complexity of QuickSort?\n  * *Answer:* Average: $O(N \\log N)$; Worst-case: $O(N^2)$ when pivot selection is poor on already sorted arrays.\n* **Q2:** Why is hash map lookup considered $O(1)$ amortized rather than strict $O(1)$?\n  * *Answer:* Hash collisions can cause worst-case degradation to $O(N)$ unless table resizing and uniform hashing maintain sparse bucket distribution."
    },
    {
      "title": "Lecture 2: Arrays, Two Pointers & Sliding Window Patterns",
      "body": "## [SLIDE 1] 🎯 Array Mastery & Windowing Techniques\nArrays provide $O(1)$ random access via contiguous memory indexing.\n\n### 🎯 Key Learning Objectives\n* Master the Two-Pointer convergence pattern.\n* Implement Fixed-size and Dynamic-size Sliding Window algorithms.\n* Eliminate nested $O(N^2)$ loops in sub-array problems.\n\n---\n\n## [SLIDE 2] 🧠 Dynamic Sliding Window Visualizer\n```text\nWindow: [Left ... Right] expands until condition breaks, then Left contracts.\nTarget: Sum >= K\n\nArray:  [ 2,  3,  1,  2,  4,  3 ]\nStep 1: [ 2,  3,  1,  2 ]           Sum = 8 (>= 7) -> MinLen = 4 -> Contract Left\nStep 2:     [ 3,  1,  2,  4 ]       Sum = 10 (>= 7) -> MinLen = 4 -> Contract Left\nStep 3:         [ 1,  2,  4 ]       Sum = 7  (>= 7) -> MinLen = 3 -> Contract Left\nStep 4:             [ 4,  3 ]       Sum = 7  (>= 7) -> MinLen = 2! (Optimal)\n```\n\n---\n\n## [SLIDE 3] 🏗️ Pattern Selector Matrix\n| Pattern | When to Use | Typical Complexity |\n| :--- | :--- | :--- |\n| **Converging Pointers** | Sorted array, finding pairs/triplets, reversing | $O(N)$ time, $O(1)$ space |\n| **Fast & Slow Pointers** | Cycle detection, finding linked list middle | $O(N)$ time, $O(1)$ space |\n| **Fixed Sliding Window** | Subarray of exact length $K$ (max sum, averages) | $O(N)$ time, $O(1)$ space |\n| **Dynamic Sliding Window** | Shortest/longest subarray satisfying condition | $O(N)$ time, $O(K)$ space |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Minimum Size Subarray Sum\n```python\ndef min_subarray_len(target: int, nums: list[int]) -> int:\n    \"\"\"Finds minimal length of contiguous subarray whose sum >= target.\"\"\"\n    left = 0\n    current_sum = 0\n    min_len = float(\"inf\")\n\n    for right in range(len(nums)):\n        current_sum += nums[right]\n\n        # Shrink window from the left as long as sum >= target\n        while current_sum >= target:\n            min_len = min(min_len, right - left + 1)\n            current_sum -= nums[left]\n            left += 1\n\n    return int(min_len) if min_len != float(\"inf\") else 0\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Off-by-One in Window Length:** Window length is `right - left + 1`, NOT `right - left`.\n2. **Negative Numbers in Sliding Window:** Standard sliding window assumes monotonic growth (positive numbers). If numbers can be negative, use Prefix Sums with Hash Maps instead!\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** Why does the sliding window technique run in $O(N)$ time when there is a nested `while` loop inside the `for` loop?\n  * *Answer:* Because each pointer (`left` and `right`) traverses each element at most once. Total pointer movements $\\le 2N$.\n* **Q2:** How do you find the middle of a linked list in a single pass?\n  * *Answer:* Use fast and slow pointers: slow advances by 1 step while fast advances by 2 steps. When fast reaches the end, slow is at the middle."
    },
    {
      "title": "Lecture 3: Linked Lists & The LRU Cache Architecture",
      "body": "## [SLIDE 1] 🎯 Linked Structures & Pointer Mechanics\nUnlike arrays, linked lists allow $O(1)$ node insertion and deletion without shifting elements in memory.\n\n### 🎯 Key Learning Objectives\n* Master Singly vs Doubly Linked Lists with Sentinel (Dummy) nodes.\n* Reverse a Linked List iteratively and recursively.\n* Combine Doubly Linked Lists with Hash Maps to build an LRU Cache.\n\n---\n\n## [SLIDE 2] 🧠 LRU Cache Architecture (Hash Map + Doubly-Linked List)\n```text\nHash Map:\n[ Key \"A\" ] ──► Node A\n[ Key \"B\" ] ──► Node B\n\nDoubly-Linked List:\n[ Dummy HEAD ] <──> [ Most Recently Used ] <──> ... <──> [ Least Recently Used ] <──> [ Dummy TAIL ]\n```\n* **`get(key)`**: Hash map finds node in $O(1)$ ──> Move node to HEAD in $O(1)$.\n* **`put(key, val)`**: Insert at HEAD in $O(1)$ ──> If capacity exceeded, remove TAIL.prev in $O(1)$.\n\n---\n\n## [SLIDE 3] 🏗️ Sentinel (Dummy) Head/Tail Pattern\nUsing dummy head and tail nodes eliminates annoying null checks for edge cases:\n* Inserting into an empty list.\n* Deleting the only remaining element.\n* Updating head or tail references.\n\n---\n\n## [SLIDE 4] 💻 Production Code: LRU Cache Implementation\n```python\nclass Node:\n    def __init__(self, key: int = 0, val: int = 0):\n        self.key, self.val = key, val\n        self.prev = self.next = None\n\nclass LRUCache:\n    def __init__(self, capacity: int):\n        self.cap = capacity\n        self.cache = {}  # key -> Node\n        self.head, self.tail = Node(), Node()\n        self.head.next, self.tail.prev = self.tail, self.head\n\n    def _remove(self, node: Node):\n        node.prev.next = node.next\n        node.next.prev = node.prev\n\n    def _insert(self, node: Node):\n        node.next = self.head.next\n        node.prev = self.head\n        self.head.next.prev = node\n        self.head.next = node\n\n    def get(self, key: int) -> int:\n        if key in self.cache:\n            node = self.cache[key]\n            self._remove(node)\n            self._insert(node)\n            return node.val\n        return -1\n\n    def put(self, key: int, value: int):\n        if key in self.cache:\n            self._remove(self.cache[key])\n        node = Node(key, value)\n        self.cache[key] = node\n        self._insert(node)\n        if len(self.cache) > self.cap:\n            lru = self.tail.prev\n            self._remove(lru)\n            del self.cache[lru.key]\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Losing Pointer References:** When reversing a linked list, saving `next_node = curr.next` BEFORE altering `curr.next = prev` is mandatory.\n2. **Memory Leaks in C/C++:** When deleting a node from a linked list, always preserve pointers before calling `free()`.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the primary disadvantage of a linked list compared to an array?\n  * *Answer:* Lack of $O(1)$ random access (requires $O(N)$ sequential traversal) and poor CPU cache locality due to non-contiguous node allocations.\n* **Q2:** Why does an LRU Cache use a Doubly-Linked List instead of a Singly-Linked List?\n  * *Answer:* Doubly-linked lists allow removing a node in $O(1)$ because each node has direct access to its `prev` pointer."
    },
    {
      "title": "Lecture 4: Stacks, Queues & Monotonic Stack Algorithms",
      "body": "## [SLIDE 1] 🎯 LIFO vs FIFO & Monotonic Sequences\nStacks (Last-In, First-Out) and Queues (First-In, First-Out) govern execution call stacks, breadth-first searches, and parsing engines.\n\n### 🎯 Key Learning Objectives\n* Implement stacks and circular queues.\n* Master the Monotonic Stack pattern for \"Next Greater Element\" problems.\n* Parse nested balanced parentheses and mathematical ASTs.\n\n---\n\n## [SLIDE 2] 🧠 Monotonic Stack Visualizer\n```text\nGoal: Find Next Greater Element for: [ 2, 1, 2, 4, 3 ]\nStack maintains strictly decreasing values.\n\nItem: 2 -> Stack: [2]\nItem: 1 -> Stack: [2, 1]\nItem: 2 -> Pops 1 (2 is greater than 1!) -> Stack: [2, 2]\nItem: 4 -> Pops 2, Pops 2 (4 is greater than both!) -> Stack: [4]\nItem: 3 -> Stack: [4, 3]\n```\n\n---\n\n## [SLIDE 3] 🏗️ Stack Complexity Guarantees\n| Operation | List (Stack) | deque (Queue) |\n| :--- | :--- | :--- |\n| **Push / Enqueue** | $O(1)$ amortized | $O(1)$ |\n| **Pop / Dequeue** | $O(1)$ at end | $O(1)$ at either end |\n| **Peek Top** | $O(1)$ | $O(1)$ |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Daily Temperatures (Monotonic Stack)\n```python\ndef daily_temperatures(temperatures: list[int]) -> list[int]:\n    \"\"\"Returns number of days until a warmer temperature occurs.\"\"\"\n    n = len(temperatures)\n    answer = [0] * n\n    stack = []  # Stores indices of temperatures\n\n    for curr_day, curr_temp in enumerate(temperatures):\n        # Pop previous days that are colder than today\n        while stack and temperatures[stack[-1]] < curr_temp:\n            prev_day = stack.pop()\n            answer[prev_day] = curr_day - prev_day\n        stack.append(curr_day)\n\n    return answer\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Using `list.pop(0)` for Queues:** In Python, `list.pop(0)` shifts all remaining elements in memory ($O(N)$). Always use `collections.deque` for $O(1)$ pops from the left!\n2. **Storing Values instead of Indices:** In monotonic stacks, storing indices allows you to calculate both the values and the distance between elements.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is a monotonic stack?\n  * *Answer:* A stack whose elements are always strictly increasing or strictly decreasing from bottom to top.\n* **Q2:** How can you implement a queue using two stacks?\n  * *Answer:* Push incoming items onto Stack 1. For dequeue, pop from Stack 2; if Stack 2 is empty, pop all items from Stack 1 into Stack 2 (reversing order) and then pop."
    },
    {
      "title": "Lecture 5: Recursion, Divide & Conquer & Binary Search",
      "body": "## [SLIDE 1] 🎯 Recursive Thinking & Logarithmic Search\nBinary search reduces search spaces by 50% at each step, operating in $O(\\log N)$ time.\n\n### 🎯 Key Learning Objectives\n* Understand Call Stack mechanics, Base Cases, and Recursion Trees.\n* Master the Master Theorem for Divide-and-Conquer analysis.\n* Implement bug-free Binary Search and search-on-answer patterns.\n\n---\n\n## [SLIDE 2] 🧠 Binary Search Decision Tree\n```text\nArray: [ 1,  3,  5,  7,  9,  11,  13,  15 ]  (Target = 11)\nStep 1: Mid = 7  (7 < 11) ──► Eliminate Left Half! Search: [ 9, 11, 13, 15 ]\nStep 2: Mid = 11 (11 == 11) ──► Target Found at Index 5!\n\nComparisons needed for 1,000,000 items: at most 20 comparisons!\n```\n\n---\n\n## [SLIDE 3] 🏗️ The Master Theorem\nFor recurrences of the form $T(N) = a T(N/b) + O(N^d)$:\n* If $d < \\log_b a$, then $T(N) = O(N^{\\log_b a})$.\n* If $d = \\log_b a$, then $T(N) = O(N^d \\log N)$ (e.g., MergeSort: $a=2, b=2, d=1 \\implies O(N \\log N)$).\n* If $d > \\log_b a$, then $T(N) = O(N^d)$.\n\n---\n\n## [SLIDE 4] 💻 Production Code: Binary Search on Answer\n```python\ndef min_eating_speed(piles: list[int], h: int) -> int:\n    \"\"\"\n    Koko Eating Bananas: Find minimum integer speed k to eat all bananas within h hours.\n    Search Space: [1, max(piles)]\n    \"\"\"\n    import math\n\n    def can_finish(speed: int) -> bool:\n        hours = sum(math.ceil(p / speed) for p in piles)\n        return hours <= h\n\n    left = 1\n    right = max(piles)\n    ans = right\n\n    while left <= right:\n        mid = (left + right) // 2\n        if can_finish(mid):\n            ans = mid\n            right = mid - 1  # Try slower speed\n        else:\n            left = mid + 1   # Must eat faster\n\n    return ans\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Integer Overflow in Mid Calculation:** In C/C++/Java, writing `(left + right) / 2` can overflow 32-bit integers if both are large! Write `left + (right - left) / 2` instead.\n2. **Infinite Loops on Boundaries:** Ensure loop condition `left <= right` aligns with `left = mid + 1` and `right = mid - 1`.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the base case in a recursive function?\n  * *Answer:* The terminating condition that produces an immediate result without making further recursive calls, preventing infinite recursion and stack overflow.\n* **Q2:** Can binary search be applied to an unsorted array?\n  * *Answer:* No, binary search requires the search space to be monotonic (sorted) or have a monotonic predicate function."
    },
    {
      "title": "Lecture 6: Binary Trees, Binary Search Trees (BST) & Traversals",
      "body": "## [SLIDE 1] 🎯 Hierarchical Structures & Tree Traversals\nTrees model hierarchical relationships: file systems, DOM trees, database indexes, and decision trees.\n\n### 🎯 Key Learning Objectives\n* Understand Depth-First Search (DFS): Pre-order, In-order, Post-order.\n* Implement Breadth-First Search (BFS) level-order traversal using queues.\n* Master Binary Search Tree (BST) invariants and balance validation.\n\n---\n\n## [SLIDE 2] 🧠 Tree Traversals Visualizer\n```text\n         (4)\n        /   \\\n      (2)   (6)\n     /  \\   /  \\\n   (1)  (3)(5) (7)\n\n* In-Order (Left, Root, Right):   [ 1, 2, 3, 4, 5, 6, 7 ]  <-- ALWAYS SORTED IN BST!\n* Pre-Order (Root, Left, Right):  [ 4, 2, 1, 3, 6, 5, 7 ]  <-- Serialization\n* Post-Order (Left, Right, Root): [ 1, 3, 2, 5, 7, 6, 4 ]  <-- Bottom-up cleanup / math AST\n* Level-Order (BFS):              [ 4, 2, 6, 1, 3, 5, 7 ]\n```\n\n---\n\n## [SLIDE 3] 🏗️ BST Invariant Validation\nA tree is a valid BST if and only if:\n$$\\forall \\text{ node}, \\quad \\text{low} < \\text{node.val} < \\text{high}$$\nChecking only immediate parent-child relationships is an exam trap!\n\n---\n\n## [SLIDE 4] 💻 Production Code: Validate Binary Search Tree\n```python\nclass TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef is_valid_bst(root: TreeNode | None) -> bool:\n    \"\"\"Validates BST using range boundary recursion.\"\"\"\n    def validate(node: TreeNode | None, low: float, high: float) -> bool:\n        if not node:\n            return True\n        if not (low < node.val < high):\n            return False\n        return validate(node.left, low, node.val) and validate(node.right, node.val, high)\n\n    return validate(root, float(\"-inf\"), float(\"inf\"))\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Local vs Global BST Invariant:** Verifying `node.left.val < node.val` is NOT enough! An element in the right subtree could be smaller than a grandparent node. Always pass `(min_allowed, max_allowed)` down the tree.\n2. **Unbalanced BST Worst-Case:** An unbalance BST (skewed list) degrades from $O(\\log N)$ to $O(N)$ operations! Self-balancing trees (AVL, Red-Black) maintain height $\\le 2 \\log N$.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** Which traversal of a BST produces elements in strictly ascending order?\n  * *Answer:* In-order traversal (Left $\\to$ Root $\\to$ Right).\n* **Q2:** What data structure is used to implement Level-Order (BFS) traversal of a tree?\n  * *Answer:* A Queue (FIFO)."
    },
    {
      "title": "Lecture 7: Graph Algorithms: BFS, DFS, Dijkstra & Topological Sort",
      "body": "## [SLIDE 1] 🎯 Networks, Graphs & Shortest Paths\nGraphs represent arbitrary interconnected networks: social connections, road maps, web link graphs, and task dependency pipelines.\n\n### 🎯 Key Learning Objectives\n* Model graphs using Adjacency Lists and Adjacency Matrices.\n* Implement Breadth-First Search (BFS) for unweighted shortest paths.\n* Master Dijkstra's Algorithm with Min-Heap for weighted graphs.\n* Implement Topological Sort (Kahn's Algorithm) for task dependencies.\n\n---\n\n## [SLIDE 2] 🧠 Dijkstra's Algorithm Pipeline\n```text\nPriority Queue (Min-Heap): Stores (current_distance, node)\nRelaxation Formula:\nif dist[u] + weight(u, v) < dist[v]:\n    dist[v] = dist[u] + weight(u, v)\n    heap.push( (dist[v], v) )\n```\nTime Complexity: $O((V + E) \\log V)$ using binary min-heap.\n\n---\n\n## [SLIDE 3] 🏗️ Graph Representation Comparison\n| Format | Storage Space | Check Edge $(u, v)$ | Iterate Neighbors of $u$ |\n| :--- | :--- | :--- | :--- |\n| **Adjacency Matrix** | $O(V^2)$ | $O(1)$ | $O(V)$ |\n| **Adjacency List** | $O(V + E)$ | $O(\\text{deg}(u))$ | $O(\\text{deg}(u))$ [Optimal!] |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Dijkstra Shortest Path\n```python\nimport heapq\n\ndef dijkstra(n: int, edges: list[tuple[int, int, int]], start: int) -> dict[int, int]:\n    \"\"\"Computes shortest path from start node to all reachable nodes.\"\"\"\n    # Build Adjacency List: node -> list of (neighbor, weight)\n    graph = {i: [] for i in range(n)}\n    for u, v, w in edges:\n        graph[u].append((v, w))\n        graph[v].append((u, w)) # Undirected graph\n\n    distances = {i: float(\"inf\") for i in range(n)}\n    distances[start] = 0\n    pq = [(0, start)]  # (distance, node)\n\n    while pq:\n        curr_dist, u = heapq.heappop(pq)\n        if curr_dist > distances[u]:\n            continue  # Outdated entry in heap\n\n        for v, weight in graph[u]:\n            new_dist = curr_dist + weight\n            if new_dist < distances[v]:\n                distances[v] = new_dist\n                heapq.heappush(pq, (new_dist, v))\n\n    return distances\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Negative Weights in Dijkstra:** Dijkstra fails on graphs with negative edge weights because it greedily finalizes nodes! Use the Bellman-Ford algorithm ($O(V \\cdot E)$) instead.\n2. **Cycles in Topological Sort:** If a graph contains a directed cycle, topological sort is impossible! Kahn's algorithm detects cycles if the count of sorted nodes $< V$.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** When is BFS preferred over DFS for finding the shortest path?\n  * *Answer:* When the graph is unweighted (all edges have identical cost 1).\n* **Q2:** What does a Topological Sort represent?\n  * *Answer:* A linear ordering of vertices in a Directed Acyclic Graph (DAG) such that for every directed edge $u \\to v$, vertex $u$ comes before vertex $v$."
    },
    {
      "title": "Lecture 8: Dynamic Programming: Memoization, Tabulation & Knapsack",
      "body": "## [SLIDE 1] 🎯 Dynamic Programming: Breaking Complexity Barriers\nDynamic Programming (DP) solves complex problems by breaking them into overlapping subproblems and storing intermediate answers to prevent redundant calculations.\n\n### 🎯 Key Learning Objectives\n* Identify Optimal Substructure and Overlapping Subproblems.\n* Compare Top-Down (Memoization) vs Bottom-Up (Tabulation).\n* Solve 0/1 Knapsack, Coin Change, and Longest Common Subsequence (LCS).\n\n---\n\n## [SLIDE 2] 🧠 Recursion Tree vs DP Cache\n```text\nFibonacci(5) without DP:\n                    fib(5)\n              /                \\\n          fib(4)              fib(3)        (Notice redundant calculations!)\n         /      \\            /      \\\n      fib(3)    fib(2)     fib(2)   fib(1)\n     /      \\\n   fib(2)  fib(1)\nTotal calls: O(2^N) [Exponential Explosion!]\n\nWith DP Memoization:\nCalculate fib(1), fib(2), fib(3), fib(4), fib(5) exactly ONCE!\nTotal calls: O(N) [Linear Time!]\n```\n\n---\n\n## [SLIDE 3] 🏗️ The 0/1 Knapsack State Recurrence\nGiven $N$ items with weights $w_i$ and values $v_i$, and knapsack capacity $W$:\n$$\\text{DP}[i][c] = \\max(\\text{DP}[i-1][c], \\, \\text{DP}[i-1][c - w_i] + v_i)$$\n\n---\n\n## [SLIDE 4] 💻 Production Code: Coin Change (Bottom-Up Tabulation)\n```python\ndef coin_change(coins: list[int], amount: int) -> int:\n    \"\"\"Finds fewest coins needed to make up amount. Returns -1 if impossible.\"\"\"\n    # dp[i] represents minimum coins to make amount i\n    dp = [float(\"inf\")] * (amount + 1)\n    dp[0] = 0\n\n    for coin in coins:\n        for a in range(coin, amount + 1):\n            dp[a] = min(dp[a], dp[a - coin] + 1)\n\n    return int(dp[amount]) if dp[amount] != float(\"inf\") else -1\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **0/1 Knapsack vs Unbounded Knapsack:** In 0/1 Knapsack (each item can be used at most once), the inner loop must traverse capacities **backwards** (`W` down to `w_i`) to avoid reusing the same item multiple times in 1D array optimization!\n2. **State Base Cases:** Forgetting to initialize `dp[0] = 0` or boundary conditions will produce incorrect answers or runtime errors.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What two properties must a problem have to be solvable using Dynamic Programming?\n  * *Answer:* Overlapping subproblems and optimal substructure.\n* **Q2:** How can you optimize space in a 2D DP table where $\\text{DP}[i]$ only depends on $\\text{DP}[i-1]$?\n  * *Answer:* Maintain only two 1D rows (previous and current) or a single 1D array, reducing space complexity from $O(N \\cdot W)$ to $O(W)$."
    }
  ],
  "dailyLessons": [
    {
      "dayNumber": 1,
      "title": "Asymptotic Analysis: Big-O, Big-Omega, Big-Theta",
      "subtasks": [
        "Calculate time complexity of nested and independent loops",
        "Plot complexity growth curves on Desmos (log N, N, N log N, N^2, 2^N)",
        "Differentiate worst-case Big-O from average-case Big-Theta",
        "Analyze space complexity and recursion stack memory overhead"
      ],
      "notes": "# Asymptotic Analysis\\n\\nBig-O represents the upper bound on worst-case execution time."
    },
    {
      "dayNumber": 2,
      "title": "Array Two-Pointers: Sorted Pair Sum & In-Place Removal",
      "subtasks": [
        "Implement two-sum on sorted array in O(N) using converging pointers",
        "Solve remove-duplicates from sorted array in-place in O(1) space",
        "Implement container with most water algorithm",
        "Trace pointer moves step-by-step with edge cases"
      ],
      "notes": "# Two Pointers Technique\\n\\nConverging pointers exploit sorted monotonic properties."
    },
    {
      "dayNumber": 3,
      "title": "Sliding Window: Fixed Size & Maximum Subarray of Size K",
      "subtasks": [
        "Implement maximum sum subarray of size K in O(N) time",
        "Maintain running sum by adding incoming element and subtracting outgoing element",
        "Avoid O(N*K) brute force recomputations",
        "Handle edge case where array length is less than K"
      ],
      "notes": "# Fixed Sliding Window\\n\\nUpdate running state incrementally instead of re-summing."
    },
    {
      "dayNumber": 4,
      "title": "Sliding Window: Dynamic Size & Longest Substring Without Repeating Characters",
      "subtasks": [
        "Implement dynamic sliding window using Hash Map character frequency counter",
        "Contract left boundary when duplicate character is encountered",
        "Update maximum window length dynamically at each step",
        "Benchmark O(N) sliding window against O(N^2) brute force"
      ],
      "notes": "# Dynamic Sliding Window\\n\\nExpand right boundary and shrink left boundary to satisfy invariant."
    },
    {
      "dayNumber": 5,
      "title": "Prefix Sums: Range Sum Query & 2D Matrix Sub-block Sums",
      "subtasks": [
        "Construct 1D prefix sum array for O(1) range sum queries",
        "Build 2D prefix sum table for instant submatrix queries",
        "Solve Subarray Sum Equals K using prefix sums and Hash Map in O(N)",
        "Validate zero-index boundary offsets"
      ],
      "notes": "# Prefix Sum Technique\\n\\nPrefix sums precompute cumulative values for instant range queries."
    },
    {
      "dayNumber": 6,
      "title": "Fast & Slow Pointers: Floyd's Cycle Detection Algorithm",
      "subtasks": [
        "Implement slow pointer (1 step) and fast pointer (2 steps)",
        "Prove mathematically why fast and slow pointers must meet if cycle exists",
        "Find entry node of linked list cycle",
        "Complete Week 1 Project: High-Throughput LRU Cache & Doubly-Linked List"
      ],
      "notes": "# Floyd's Tortoise and Hare\\n\\nDetects cycles in sequences without auxiliary memory allocation."
    },
    {
      "dayNumber": 7,
      "title": "Linked Lists: Sentinel Nodes, Insertion, Deletion & Traversal",
      "subtasks": [
        "Design ListNode class with pointer references",
        "Use dummy sentinel node to simplify head insertion and deletion logic",
        "Implement delete-node without previous pointer reference",
        "Traverse linked list and print values safely"
      ],
      "notes": "# Linked List Fundamentals\\n\\nSentinel dummy nodes eliminate null pointer boundary errors."
    },
    {
      "dayNumber": 8,
      "title": "Linked Lists: In-Place Reversal & Merge Two Sorted Lists",
      "subtasks": [
        "Reverse a singly linked list in-place iteratively in O(N) time and O(1) space",
        "Trace prev, curr, and next pointer reassignments",
        "Implement recursive reversal of linked list",
        "Merge two sorted linked lists using two pointers into single sorted chain"
      ],
      "notes": "# In-Place Reversal\\n\\nMaintain three pointers (`prev`, `curr`, `next`) to flip direction without losing rest of list."
    },
    {
      "dayNumber": 9,
      "title": "Stacks: Balanced Parentheses & Postfix Expression Evaluation",
      "subtasks": [
        "Validate balanced parentheses ((), [], {}) using stack",
        "Convert infix mathematical notation to Reverse Polish Notation (RPN)",
        "Evaluate RPN postfix expressions using stack in O(N) time",
        "Handle invalid expression edge cases and empty stack pops"
      ],
      "notes": "# Stacks & Parsing\\n\\nStacks naturally model nested hierarchical syntax and operator precedence."
    },
    {
      "dayNumber": 10,
      "title": "Monotonic Stack: Next Greater Element & Daily Temperatures",
      "subtasks": [
        "Understand monotonic stack invariant (strictly decreasing or increasing)",
        "Implement Next Greater Element in O(N) linear time",
        "Solve Daily Temperatures problem storing indices in stack",
        "Calculate element spans using stack index differences"
      ],
      "notes": "# Monotonic Stacks\\n\\nFinds nearest greater or smaller elements in linear time."
    },
    {
      "dayNumber": 11,
      "title": "Queues: Circular Queue & Breadth-First Traversal Pipeline",
      "subtasks": [
        "Implement fixed-size circular queue with array and modulo arithmetic",
        "Maintain front and rear pointers to support O(1) enqueue and dequeue",
        "Compare circular array queue vs linked list queue memory locality",
        "Implement queue-based task processing pipeline"
      ],
      "notes": "# Queue Systems\\n\\nCircular buffers use modulo indexing `(rear + 1) % capacity` for fixed-memory FIFOs."
    },
    {
      "dayNumber": 12,
      "title": "Monotonic Deque: Sliding Window Maximum",
      "subtasks": [
        "Understand double-ended queue (deque) operations",
        "Maintain monotonic decreasing deque of indices",
        "Evict elements outside current sliding window boundary in O(1)",
        "Complete Week 2 Project: Expression Evaluator & Monotonic Stack Engine"
      ],
      "notes": "# Monotonic Deque\\n\\nMaintains sliding window maximum/minimum in amortized $O(1)$ per step."
    },
    {
      "dayNumber": 13,
      "title": "Binary Search: Invariants, Boundary Conditions & Template",
      "subtasks": [
        "Implement standard binary search with left <= right loop condition",
        "Use left + (right - left) // 2 to prevent integer overflow",
        "Find first and last occurrence (leftmost and rightmost bounds)",
        "Search in rotated sorted array in O(log N) time"
      ],
      "notes": "# Binary Search Template\\n\\nAlways adhere strictly to boundary update rules to prevent infinite loops."
    },
    {
      "dayNumber": 14,
      "title": "Binary Search on Answer: Capacity to Ship Packages & Peak Elements",
      "subtasks": [
        "Identify monotonic search spaces for optimization problems",
        "Implement feasibility verification function can_ship(capacity)",
        "Solve Capacity to Ship Packages within D Days in O(N log(Sum - Max))",
        "Find peak element in mountain array using binary search"
      ],
      "notes": "# Binary Search on Answer\\n\\nIf feasibility is monotonic (`False, False, ..., True, True`), binary search finds the optimal boundary."
    },
    {
      "dayNumber": 15,
      "title": "Binary Trees: Tree Traversals (DFS: In-order, Pre-order, Post-order)",
      "subtasks": [
        "Implement recursive in-order, pre-order, and post-order traversals",
        "Implement iterative DFS using explicit stack",
        "Calculate maximum depth and diameter of binary tree",
        "Serialize and deserialize binary tree into string format"
      ],
      "notes": "# Depth-First Tree Traversals\\n\\nPre-order visits root first; in-order yields sorted order on BSTs; post-order cleans bottom-up."
    },
    {
      "dayNumber": 16,
      "title": "Binary Trees: Level-Order Traversal (BFS) & Lowest Common Ancestor",
      "subtasks": [
        "Implement level-order traversal using queue tracking level sizes",
        "Print zigzag level order traversal",
        "Find Lowest Common Ancestor (LCA) in binary tree using bottom-up recursion",
        "Check if tree is height-balanced (AVL condition)"
      ],
      "notes": "# Breadth-First Tree Traversals\\n\\nProcess trees level-by-level using a FIFO queue."
    },
    {
      "dayNumber": 17,
      "title": "Binary Search Trees (BST): Insertion, Deletion & Validation",
      "subtasks": [
        "Search for value in BST in O(h) time",
        "Insert new node while preserving BST invariant",
        "Delete node handling 0, 1, and 2 children (finding in-order successor)",
        "Validate BST using min/max range recursion"
      ],
      "notes": "# Binary Search Tree Operations\\n\\nDeletion of a node with two children requires replacing it with its in-order successor."
    },
    {
      "dayNumber": 18,
      "title": "Tries (Prefix Trees): Autocomplete & Word Dictionary",
      "subtasks": [
        "Design TrieNode with children hash map and is_end_of_word boolean",
        "Implement insert(word), search(word), and starts_with(prefix)",
        "Analyze Trie space complexity vs hash set",
        "Complete Week 3 Project: Trie Autocomplete Engine & Dependency Graph"
      ],
      "notes": "# Trie (Prefix Tree)\\n\\nTries provide $O(L)$ prefix lookups where $L$ is word length, independent of dictionary size."
    },
    {
      "dayNumber": 19,
      "title": "Heaps & Priority Queues: Binary Min-Heap & Top-K Elements",
      "subtasks": [
        "Understand complete binary tree array representation (parent = (i-1)//2)",
        "Implement heapify-up and heapify-down operations",
        "Find Kth largest element in array using min-heap of size K in O(N log K)",
        "Merge K sorted linked lists using priority queue"
      ],
      "notes": "# Heaps & Priority Queues\\n\\nMaintains dynamic min/max element with $O(1)$ peek and $O(\\log N)$ insertion/extraction."
    },
    {
      "dayNumber": 20,
      "title": "Graph Traversal: BFS & DFS on Adjacency Lists",
      "subtasks": [
        "Build adjacency list representation from edge list",
        "Implement graph BFS with visited set to prevent infinite cycle loops",
        "Implement graph DFS iteratively and recursively",
        "Count number of connected components and islands in 2D grid"
      ],
      "notes": "# Graph Traversals\\n\\nAlways maintain a `visited` set to avoid infinite loops in cyclic graphs."
    },
    {
      "dayNumber": 21,
      "title": "Graph Algorithms: Topological Sort (Kahn's Algorithm) & Cycle Detection",
      "subtasks": [
        "Calculate in-degrees for all nodes in Directed Graph",
        "Initialize queue with all nodes having in-degree 0",
        "Process nodes and decrement neighbors' in-degrees (Kahn's algorithm)",
        "Detect cycles in directed graph when processed node count < total vertices"
      ],
      "notes": "# Topological Sorting\\n\\nKahn's algorithm resolves task dependency orders in DAGs."
    },
    {
      "dayNumber": 22,
      "title": "Graph Algorithms: Dijkstra's Shortest Path with Min-Heap",
      "subtasks": [
        "Implement Dijkstra's algorithm using priority queue (min-heap)",
        "Perform edge relaxation: if d[u] + w < d[v] then update d[v]",
        "Track parent pointers to reconstruct exact shortest path coordinates",
        "Benchmark Dijkstra against unweighted BFS"
      ],
      "notes": "# Dijkstra's Algorithm\\n\\nComputes shortest path in non-negative weighted graphs in $O((V + E) \\log V)$."
    },
    {
      "dayNumber": 23,
      "title": "Dynamic Programming: 1D Problems (Climbing Stairs, House Robber, Coin Change)",
      "subtasks": [
        "Formulate state transition recurrence for House Robber: dp[i] = max(dp[i-1], dp[i-2] + nums[i])",
        "Optimize space complexity from O(N) array to two variables O(1)",
        "Solve Coin Change using bottom-up tabulation",
        "Solve Longest Increasing Subsequence (LIS) in O(N^2) and O(N log N) via Patience Sorting"
      ],
      "notes": "# 1D Dynamic Programming\\n\\nIdentify the state variable and formulate the recurrence relation."
    },
    {
      "dayNumber": 24,
      "title": "Dynamic Programming: 2D Grid Problems & Capstone Review",
      "subtasks": [
        "Solve Unique Paths in 2D grid with obstacles using tabulation",
        "Implement 0/1 Knapsack with 1D space optimization",
        "Solve Longest Common Subsequence (LCS) string alignment",
        "Complete Week 4 Capstone: Real-Time Dijkstra Shortest Path & DP Optimizer"
      ],
      "notes": "# Algorithmic Mastery\\n\\nCongratulations! You have mastered the core data structures and algorithm design paradigms."
    }
  ]
};
