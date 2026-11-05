import type { SubjectCurriculumPackage } from '../types.js';

export const pythonPackage: SubjectCurriculumPackage = {
  "id": "python",
  "aliases": [
    "python",
    "python3",
    "py",
    "python programming",
    "data science"
  ],
  "subject": {
    "name": "Python & Data Science Fundamentals",
    "description": "Master modern Python: language idioms, OOP, functional patterns, NumPy, Pandas, and data science workflows.",
    "color": "#38BDF8",
    "icon": "code"
  },
  "assignments": [
    {
      "title": "Week 1 Project: Interactive CLI Financial Budget & Expense Tracker",
      "description": "Build a Python CLI application that ingests financial transactions, calculates running averages, and provides categorization using lists, dictionaries, and string formatting.",
      "daysDue": 7
    },
    {
      "title": "Week 2 Project: Object-Oriented Inventory & Order Management Engine",
      "description": "Design an OOP system with classes, dunder methods (__repr__, __len__, __iter__), inheritance, and CSV persistence for retail inventory.",
      "daysDue": 14
    },
    {
      "title": "Week 3 Project: Resilient Web Scraper & Multi-threaded API Harvester",
      "description": "Implement a robust data pipeline utilizing requests, beautifulsoup4, custom context managers, and exception logging to crawl and structure datasets.",
      "daysDue": 21
    },
    {
      "title": "Week 4 Capstone: Exploratory Data Analysis & Visualization Dashboard",
      "description": "Analyze a real-world dataset (100k+ rows) using NumPy and Pandas; generate statistical summaries, correlation heatmaps, and Matplotlib/Seaborn visualizations.",
      "daysDue": 28
    }
  ],
  "resources": [
    {
      "type": "youtube",
      "title": "Python for Beginners - Full Course (freeCodeCamp)",
      "url": "https://www.youtube.com/watch?v=eWRfhZUzrAc",
      "providerItemId": "eWRfhZUzrAc"
    },
    {
      "type": "youtube",
      "title": "Python Full Course for Beginners [2024] (Programming with Mosh)",
      "url": "https://www.youtube.com/watch?v=_uQrJ0TkZlc",
      "providerItemId": "_uQrJ0TkZlc"
    },
    {
      "type": "youtube",
      "title": "Python Tutorial for Beginners - Full Python Course (Corey Schafer)",
      "url": "https://www.youtube.com/watch?v=YYXdXT2l-Gg",
      "providerItemId": "YYXdXT2l-Gg"
    },
    {
      "type": "youtube",
      "title": "Learn Python - Full Course for Beginners (freeCodeCamp Classic)",
      "url": "https://www.youtube.com/watch?v=rfscVS0vtbw",
      "providerItemId": "rfscVS0vtbw"
    },
    {
      "type": "web",
      "title": "Python 3 Official Documentation & Tutorial",
      "url": "https://docs.python.org/3/tutorial/",
      "providerItemId": null
    },
    {
      "type": "web",
      "title": "Real Python - Production Python Guides & Tutorials",
      "url": "https://realpython.com/",
      "providerItemId": null
    }
  ],
  "lectureDecks": [
    {
      "title": "Lecture 1: Python Architecture, Bytecode Compilation & Memory Model",
      "body": "## [SLIDE 1] 🎯 Course Objectives & The CPython Execution Engine\nWelcome to Python & Data Science! Python is the world's most popular language for scientific computing, automation, and AI.\n\n### 🎯 Key Learning Objectives\n* Understand CPython bytecode compilation (`.pyc`) and the Python Virtual Machine (PVM).\n* Master memory management, reference counting, and the Global Interpreter Lock (GIL).\n* Establish strict virtual environments using `venv` or `uv`.\n\n💡 **Professor's Tip:** In Python, **everything is an object**—including functions, classes, and primitive numbers. Variables are lightweight pointers bound to memory references!\n\n---\n\n## [SLIDE 2] 🧠 CPython Compilation Pipeline\nUnlike pure interpreters, Python compiles source code to bytecode before runtime:\n\n```text\nSource Code (.py)\n      │ 1. Tokenizer & Parser\n      ▼\nAbstract Syntax Tree (AST)\n      │ 2. Bytecode Compiler\n      ▼\nCPython Bytecode (.pyc in __pycache__)\n      │ 3. Python Virtual Machine (PVM) Execution Loop\n      ▼\nHost CPU Machine Instructions\n```\n\n---\n\n## [SLIDE 3] 🏗️ Object Memory Model & Identity vs Equality\nPython objects consist of a type pointer, reference count, and payload value:\n\n| Concept | Operator | What It Compares | Example |\n| :--- | :--- | :--- | :--- |\n| **Value Equality** | `==` | Checks if data contents match (`__eq__`) | `[1, 2] == [1, 2]` → `True` |\n| **Object Identity** | `is` | Checks if pointers refer to the exact same memory address (`id()`) | `a is b` |\n\n⚠️ **Teacher's Warning:** Small integers (-5 to 256) and short strings are interned by CPython in static memory pools. Never rely on `is` for numerical comparisons!\n\n---\n\n## [SLIDE 4] 💻 Production Code Walkthrough & Typing\nHere is a typed, production-ready Python starter:\n\n```python\nfrom typing import List, Optional\nimport sys\n\ndef calculate_running_stats(values: List[float]) -> dict[str, float]:\n    \"\"\"Computes arithmetic mean and range safely.\"\"\"\n    if not values:\n        raise ValueError(\"Cannot calculate stats on empty dataset.\")\n    \n    total = sum(values)\n    count = len(values)\n    return {\n        \"mean\": total / count,\n        \"min\": min(values),\n        \"max\": max(values),\n        \"count\": float(count)\n    }\n\nif __name__ == \"__main__\":\n    data = [12.5, 45.0, 68.2, 91.4]\n    stats = calculate_running_stats(data)\n    print(f\"StudyOS Python Runtime: {sys.version.split()[0]}\")\n    for k, v in stats.items():\n        print(f\"  {k.capitalize()}: {v:.2f}\")\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Mutable Default Arguments:** Writing `def append_to(item, target=[])` reuses the same list across all function invocations! Always write `target: Optional[List] = None` and initialize inside the body.\n2. **Shallow vs Deep Copy:** `b = a.copy()` duplicates the outer list, but inner mutable objects remain shared pointers! Use `copy.deepcopy()` for nested structures.\n3. **Variable Shadowing:** Defining a local variable with the name `list`, `dict`, or `str` destroys access to standard built-in constructors.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What happens when an object's reference count drops to 0?\n  * *Answer:* CPython immediately deallocates the object memory and returns it to the arena allocator.\n* **Q2:** Why should you use `if __name__ == \"__main__\":`?\n  * *Answer:* Prevents executable code from running when the file is imported as a module in another script."
    },
    {
      "title": "Lecture 2: Core Data Structures (Lists, Tuples, Dictionaries & Sets)",
      "body": "## [SLIDE 1] 🎯 Data Structures & Algorithmic Complexities\nChoosing the correct data structure is the difference between an $O(1)$ constant time lookup and an $O(N)$ linear scan.\n\n### 🎯 Key Learning Objectives\n* Compare mutable vs immutable sequences (Lists vs Tuples).\n* Understand Hash Tables behind Python Dictionaries and Sets.\n* Master dictionary comprehensions and set operations.\n\n---\n\n## [SLIDE 2] 🧠 Hash Table Visualizer (Dictionaries & Sets)\nPython dictionaries use compact hash tables with open addressing:\n\n```text\nKey: \"user:101\" ──> hash() % Capacity ──> Hash Index [4]\n                                            │\n                                            ▼\n                                   [ Hash | Key | Value ]\n```\n\n* **Average Lookup:** $O(1)$\n* **Worst-Case Collision:** $O(N)$\n\n---\n\n## [SLIDE 3] 🏗️ Time Complexity Matrix\n| Operation | List | Tuple | Set | Dict |\n| :--- | :--- | :--- | :--- | :--- |\n| **Access by index** | $O(1)$ | $O(1)$ | N/A | N/A |\n| **Lookup by key/value** | $O(N)$ | $O(N)$ | $O(1)$ avg | $O(1)$ avg |\n| **Append / Insert** | $O(1)$ amortized | N/A | $O(1)$ avg | $O(1)$ avg |\n| **Delete element** | $O(N)$ | N/A | $O(1)$ avg | $O(1)$ avg |\n\n---\n\n## [SLIDE 4] 💻 Idiomatic Python Code Walkthrough\n```python\nfrom collections import defaultdict, Counter\n\ndef analyze_student_records(submissions: list[tuple[str, str, int]]) -> dict:\n    # submissions: (student_id, course_code, score)\n    scores_by_course = defaultdict(list)\n    student_counter = Counter()\n\n    for student_id, course, score in submissions:\n        scores_by_course[course].append(score)\n        student_counter[student_id] += 1\n\n    course_averages = {\n        course: sum(scores) / len(scores)\n        for course, scores in scores_by_course.items()\n    }\n    return {\"averages\": course_averages, \"top_students\": student_counter.most_common(3)}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Modifying a collection while iterating over it:** Deleting items from a list inside a `for item in my_list:` loop skips every other element due to index shifting.\n2. **Unhashable Type in Sets/Dicts:** Attempting to use a list or dictionary as a set element or dict key raises `TypeError: unhashable type`. Use a `tuple` instead.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** Why is `item in my_set` much faster than `item in my_list`?\n  * *Answer:* Sets use hash tables ($O(1)$ lookup), whereas lists perform sequential scans ($O(N)$ lookup).\n* **Q2:** When should you use a tuple instead of a list?\n  * *Answer:* When the data is fixed/immutable, needs to serve as a dictionary key, or needs memory protection."
    },
    {
      "title": "Lecture 3: Functions, Closures, Decorators & Scope (LEGB Rule)",
      "body": "## [SLIDE 1] 🎯 Advanced Functional Concepts in Python\nIn Python, functions are first-class citizens: they can be passed as arguments, returned from other functions, and bound dynamically.\n\n### 🎯 Key Learning Objectives\n* Master the LEGB (Local, Enclosing, Global, Built-in) scope resolution rule.\n* Understand closures and how inner functions retain lexical scope.\n* Build custom decorators with `functools.wraps` for performance timing and caching.\n\n---\n\n## [SLIDE 2] 🧠 The LEGB Scope Resolution Hierarchy\nWhen resolving a variable name, Python searches strictly from inside out:\n\n```text\n1. [L] Local Scope (Inside the executing function)\n        │ If not found\n        ▼\n2. [E] Enclosing Scope (Inside any enclosing enclosing functions)\n        │ If not found\n        ▼\n3. [G] Global Scope (Module level variables)\n        │ If not found\n        ▼\n4. [B] Built-in Scope (Python builtins: len, sum, Exception)\n```\n\n---\n\n## [SLIDE 3] 🏗️ Decorator Execution Flow\nDecorators wrap a target function, intercepting inputs and outputs:\n\n```text\n@timing_decorator\ndef query_db(): ...\n\nis executed as:\n\nquery_db = timing_decorator(query_db)\n```\n\n---\n\n## [SLIDE 4] 💻 Production Code: Timing & Retry Decorator\n```python\nimport time\nfrom functools import wraps\nfrom typing import Callable, Any\n\ndef retry(attempts: int = 3, delay: float = 0.5):\n    \"\"\"Retries an operation if transient exceptions occur.\"\"\"\n    def decorator(func: Callable) -> Callable:\n        @wraps(func)\n        def wrapper(*args, **kwargs) -> Any:\n            last_err = None\n            for i in range(attempts):\n                try:\n                    return func(*args, **kwargs)\n                except Exception as err:\n                    last_err = err\n                    time.sleep(delay * (2 ** i)) # Exponential backoff\n            raise RuntimeError(f\"Failed after {attempts} attempts: {last_err}\")\n        return wrapper\n    return decorator\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **UnboundLocalError:** Writing `x += 1` inside a function where `x` is global causes Python to mark `x` as local during compilation, triggering an error before assignment. Use the `global` or `nonlocal` keyword.\n2. **Forgetting `@wraps(func)`:** Omitting `@wraps` strips the original function's `__name__` and docstrings, breaking debuggers and test runners.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is a closure?\n  * *Answer:* A function object that retains bindings to variables in its lexical enclosing scope, even after the outer function has completed execution.\n* **Q2:** What does the `*args` and `**kwargs` syntax allow?\n  * *Answer:* `*args` collects positional arguments into a tuple, while `**kwargs` collects named keyword arguments into a dictionary."
    },
    {
      "title": "Lecture 4: Object-Oriented Architecture, Dunder Methods & Inheritance",
      "body": "## [SLIDE 1] 🎯 Object-Oriented Programming (OOP) in Python\nPython balances dynamic elegance with robust object-oriented architecture.\n\n### 🎯 Key Learning Objectives\n* Understand class vs instance attributes.\n* Implement Pythonic Dunder (Double Underscore) magic methods.\n* Master Multiple Inheritance and Method Resolution Order (MRO).\n\n---\n\n## [SLIDE 2] 🧠 Dunder Method Protocol Pipeline\n```text\nlen(my_obj)        ──> calls ──> my_obj.__len__()\nprint(my_obj)      ──> calls ──> my_obj.__str__()\nrepr(my_obj)       ──> calls ──> my_obj.__repr__()\nmy_obj[key]        ──> calls ──> my_obj.__getitem__(key)\nfor item in my_obj ──> calls ──> my_obj.__iter__()\n```\n\n---\n\n## [SLIDE 3] 🏗️ Method Resolution Order (C3 Linearization)\nWhen multiple inheritance is used (`class C(A, B)`), Python resolves attributes using the C3 Linearization algorithm accessible via `C.mro()`.\n\n---\n\n## [SLIDE 4] 💻 Production Code: Custom Vector Class\n```python\nclass Vector2D:\n    \"\"\"An immutable, mathematically sound 2D Vector.\"\"\"\n    __slots__ = (\"_x\", \"_y\")  # Drastically reduces memory footprint\n\n    def __init__(self, x: float, y: float):\n        self._x = float(x)\n        self._y = float(y)\n\n    @property\n    def x(self) -> float:\n        return self._x\n\n    @property\n    def y(self) -> float:\n        return self._y\n\n    def __repr__(self) -> str:\n        return f\"Vector2D(x={self._x}, y={self._y})\"\n\n    def __add__(self, other: \"Vector2D\") -> \"Vector2D\":\n        if not isinstance(other, Vector2D):\n            return NotImplemented\n        return Vector2D(self._x + other._x, self._y + other._y)\n\n    def __eq__(self, other: object) -> bool:\n        if not isinstance(other, Vector2D):\n            return False\n        return self._x == other._x and self._y == other._y\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Class Attribute Mutation Trap:** Defining `class Bank: accounts = []` shares that exact single list across all bank instances! Always declare instance variables in `__init__` with `self.accounts = []`.\n2. **`__str__` vs `__repr__`:** `__str__` is for end-user readable formatting; `__repr__` should be an unambiguous string that could recreate the object.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the purpose of `__slots__` in a Python class?\n  * *Answer:* Prevents the creation of the dynamic `__dict__` per instance, drastically saving RAM and accelerating attribute access.\n* **Q2:** How does `super()` know which parent method to invoke?\n  * *Answer:* It looks up the class's Method Resolution Order (MRO) dynamically at runtime."
    },
    {
      "title": "Lecture 5: Iterators, Generators, Context Managers & Memory Optimization",
      "body": "## [SLIDE 1] 🎯 Lazy Evaluation & Memory Efficiency\nGenerators produce values on-demand using `yield`, enabling Python to process multi-gigabyte datasets with only a few megabytes of RAM.\n\n### 🎯 Key Learning Objectives\n* Understand the Iterator Protocol (`__iter__` and `__next__`).\n* Write memory-efficient Generator functions and expressions.\n* Create Context Managers with `__enter__` and `__exit__` (`with` statements).\n\n---\n\n## [SLIDE 2] 🧠 Generator Stream vs Eager List Loading\n```text\nEager List:      [ Record 1, Record 2, ... Record 1,000,000 ]  (4.2 GB RAM Used!)\nLazy Generator:  Record ──yield──> Process ──> Discard ──> Next (12 KB RAM Used!)\n```\n\n---\n\n## [SLIDE 3] 🏗️ Context Manager Lifecycle\n```text\nwith open(\"data.csv\") as f:\n      │ 1. Calls f.__enter__()\n      │ 2. Yields control to code block\n      ▼\nExecute block statements...\n      │ 3. Always calls f.__exit__(exc_type, exc_val, exc_tb)\n      ▼\nResources (File descriptor, Socket, Lock) safely closed even on crash!\n```\n\n---\n\n## [SLIDE 4] 💻 Production Code: Streaming Log Parser\n```python\nfrom typing import Generator, TextIO\nfrom contextlib import contextmanager\nimport time\n\ndef stream_error_logs(file_path: str) -> Generator[str, None, None]:\n    \"\"\"Yields only ERROR lines from a large log file without loading entire file.\"\"\"\n    with open(file_path, \"r\", encoding=\"utf-8\") as f:\n        for line in f:\n            if \"ERROR\" in line:\n                yield line.strip()\n\n@contextmanager\ndef execution_timer(label: str):\n    start = time.perf_counter()\n    try:\n        yield\n    finally:\n        elapsed = time.perf_counter() - start\n        print(f\"[{label}] Execution finished in {elapsed:.4f}s\")\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Exhausting a Generator:** Once a generator has yielded all elements, attempting to loop over it again yields 0 elements! Generators are single-use streams.\n2. **Swallowing Exceptions in Context Managers:** In `__exit__`, returning `True` suppresses any exception that occurred inside the `with` block, potentially hiding fatal errors.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What exception is raised when a generator reaches the end of its iteration?\n  * *Answer:* The `StopIteration` exception.\n* **Q2:** What is the difference between a list comprehension and a generator expression?\n  * *Answer:* List comprehensions use square brackets `[x for x in data]` and allocate memory immediately; generator expressions use parentheses `(x for x in data)` and compute lazily."
    },
    {
      "title": "Lecture 6: Resilient Error Handling, Logging & Defensive Programming",
      "body": "## [SLIDE 1] 🎯 Enterprise Error Handling & Logging\nProduction code must fail gracefully with actionable diagnostics rather than crashing abruptly.\n\n### 🎯 Key Learning Objectives\n* Master Python's exception hierarchy and custom exception modeling.\n* Use `try-except-else-finally` correctly.\n* Implement structured logging using Python's standard `logging` module.\n\n---\n\n## [SLIDE 2] 🧠 Exception Resolution Tree\n```text\nBaseException\n ├── KeyboardInterrupt (Ctrl+C)\n ├── SystemExit\n └── Exception (Standard Application Errors)\n      ├── ValueError\n      ├── TypeError\n      ├── LookupError (KeyError, IndexError)\n      └── OSError (FileNotFoundError, PermissionError)\n```\n\n⚠️ **Teacher's Warning:** Never write bare `except:`! It catches `KeyboardInterrupt` and `SystemExit`, making your script impossible to terminate from the terminal!\n\n---\n\n## [SLIDE 3] 🏗️ The try-except-else-finally State Flow\n* **`try`**: Protected block where exceptions may arise.\n* **`except`**: Handles designated error types.\n* **`else`**: Executes ONLY when NO exception occurred in `try`.\n* **`finally`**: ALWAYS executes regardless of errors or return statements.\n\n---\n\n## [SLIDE 4] 💻 Production Code: Custom Exception Hierarchy\n```python\nimport logging\n\nlogging.basicConfig(level=logging.INFO, format=\"%(asctime)s [%(levelname)s] %(message)s\")\n\nclass BankingError(Exception):\n    \"\"\"Base exception for banking domain errors.\"\"\"\n\nclass InsufficientFundsError(BankingError):\n    def __init__(self, balance: float, requested: float):\n        super().__init__(f\"Insufficient funds: Balance ${balance:.2f} < Requested ${requested:.2f}\")\n        self.balance = balance\n        self.requested = requested\n\ndef withdraw(balance: float, amount: float) -> float:\n    if amount <= 0:\n        raise ValueError(\"Withdrawal amount must be positive.\")\n    if amount > balance:\n        raise InsufficientFundsError(balance, amount)\n    \n    new_balance = balance - amount\n    logging.info(\"Successfully withdrew $%.2f. Remaining: $%.2f\", amount, new_balance)\n    return new_balance\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Masking Tracebacks:** Writing `except Exception as e: raise Exception(\"Failed\")` wipes the original stack trace. Always use chained exceptions: `raise CustomError(\"Failed\") from e`.\n2. **Using `print()` instead of `logging`:** Print statements cannot be redirected to rotating log files, filtered by severity level, or disabled in production.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** When does the `else` block in a `try-except-else` statement execute?\n  * *Answer:* Only if the `try` block completes successfully without raising any exceptions.\n* **Q2:** Why should you inherit custom application exceptions from `Exception` instead of `BaseException`?\n  * *Answer:* `BaseException` bypasses standard application error handling and interferes with system-level control signals."
    },
    {
      "title": "Lecture 7: NumPy Foundations: Vectorization, N-D Arrays & Broadcasting",
      "body": "## [SLIDE 1] 🎯 High-Performance Scientific Computing with NumPy\nNumPy (Numerical Python) powers nearly all modern AI and scientific data science packages by providing C-speed array operations in Python.\n\n### 🎯 Key Learning Objectives\n* Understand Contiguous C-Arrays vs Python Pointer Arrays.\n* Master Vectorization: Eliminating slow Python `for` loops.\n* Master NumPy Broadcasting rules for arrays of different shapes.\n\n---\n\n## [SLIDE 2] 🧠 Contiguous C-Buffer vs Python List of Pointers\n```text\nPython List:  [ *ptr1, *ptr2, *ptr3 ] ──> Scattered Heap Objects (Cache Misses!)\nNumPy ndarray: [ 1.0 | 2.0 | 3.0 | 4.0 ] ──> Dense Contiguous Memory (SIMD Accelerated!)\n```\n\nVectorized operations run **50x to 200x faster** than pure Python loops!\n\n---\n\n## [SLIDE 3] 🏗️ NumPy Broadcasting Rules\nTwo dimensions are compatible when:\n1. They are equal, or\n2. One of them is 1.\n\n```text\nArray A:  (4, 3)\nArray B:     (3) ──> Broadcasts to (1, 3) ──> Stretches to (4, 3)\nResult:   (4, 3)\n```\n\n---\n\n## [SLIDE 4] 💻 Production Code: Vectorized Linear Algebra\n```python\nimport numpy as np\n\ndef compute_euclidean_distance_matrix(X: np.ndarray, Y: np.ndarray) -> np.ndarray:\n    \"\"\"\n    Computes pairwise Euclidean distance between rows in X (N, D) and Y (M, D)\n    using vectorized broadcasting with zero Python loops!\n    \"\"\"\n    # Formula: ||x - y||^2 = ||x||^2 + ||y||^2 - 2(x . y)\n    X_sq = np.sum(X ** 2, axis=1, keepdims=True)  # (N, 1)\n    Y_sq = np.sum(Y ** 2, axis=1, keepdims=True)  # (M, 1)\n    \n    # Pairwise dot products via matrix multiplication\n    dot_products = np.dot(X, Y.T)                 # (N, M)\n    \n    dist_sq = X_sq + Y_sq.T - 2 * dot_products\n    return np.sqrt(np.maximum(dist_sq, 0.0))\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Views vs Copies in Slicing:** A basic slice `b = a[1:5]` is a **view** into the original array's memory! Mutating `b` alters `a`! Use `b = a[1:5].copy()` to prevent side-effects.\n2. **Boolean Indexing with `and` / `or`:** You cannot use Python's `and` or `or` on NumPy arrays. You MUST use bitwise operators: `(arr > 0) & (arr < 10)`.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What does NumPy vectorization mean?\n  * *Answer:* Executing batch mathematical operations across contiguous memory buffers using pre-compiled C code and SIMD instructions without explicit Python loops.\n* **Q2:** What is the difference between `np.dot(A, B)` and `A * B`?\n  * *Answer:* `A * B` is element-wise multiplication, whereas `np.dot(A, B)` performs matrix dot multiplication."
    },
    {
      "title": "Lecture 8: Pandas for Data Science: DataFrames, GroupBy & Time Series",
      "body": "## [SLIDE 1] 🎯 Data Wrangling & Analytics with Pandas\nPandas is the premier data science library for tabular data, SQL-like aggregations, and exploratory data analysis.\n\n### 🎯 Key Learning Objectives\n* Understand Series and DataFrames, Index alignment, and memory optimization.\n* Master SQL-style filtering, joins, merges, and `groupby` aggregations.\n* Handle missing values and detect statistical outliers.\n\n---\n\n## [SLIDE 2] 🧠 The Pandas Architecture\n```text\nDataFrame\n ├── Index (Row Identifiers)\n ├── Columns (Feature Names)\n └── Series (Individual 1D Typed Arrays, backed by NumPy ndarrays)\n```\n\n---\n\n## [SLIDE 3] 🏗️ Split-Apply-Combine Pattern (GroupBy)\n```text\nRaw DataFrame ──> Split by Category ──> Apply Aggregation ──> Combine into Summary\n [ Dept | Salary ]    [ Engineering ]      mean() = 120k           [ Dept | AvgSalary ]\n                      [ Marketing   ]      mean() = 95k    ──>     [ Eng  | 120k      ]\n                      [ Operations  ]      mean() = 80k            [ Mkt  | 95k       ]\n```\n\n---\n\n## [SLIDE 4] 💻 Production Code: Real-World Data Pipeline\n```python\nimport pandas as pd\nimport numpy as np\n\ndef clean_and_aggregate_sales(df: pd.DataFrame) -> pd.DataFrame:\n    # 1. Handle missing values\n    df = df.copy()\n    df[\"sales\"] = pd.to_numeric(df[\"sales\"], errors=\"coerce\").fillna(0.0)\n    df[\"order_date\"] = pd.to_datetime(df[\"order_date\"])\n\n    # 2. Add derived temporal features\n    df[\"year_month\"] = df[\"order_date\"].dt.to_period(\"M\")\n\n    # 3. GroupBy aggregation\n    summary = (\n        df.groupby([\"region\", \"year_month\"])\n        .agg(\n            total_revenue=(\"sales\", \"sum\"),\n            avg_order_value=(\"sales\", \"mean\"),\n            order_count=(\"sales\", \"count\")\n        )\n        .reset_index()\n    )\n    return summary\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **SettingWithCopyWarning:** Writing `df[df['age'] > 18]['status'] = 'Adult'` fails because the slice may return a temporary copy. Always write `df.loc[df['age'] > 18, 'status'] = 'Adult'`.\n2. **Iterating with `iterrows()`:** Using `iterrows()` is excruciatingly slow! Always use vectorized operations, `apply()`, or NumPy methods.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What does `df.loc` vs `df.iloc` do?\n  * *Answer:* `df.loc` selects data by label/name and boolean masks; `df.iloc` selects strictly by integer position.\n* **Q2:** Why is `dropna()` used cautiously in production data pipelines?\n  * *Answer:* Dropping rows blindly can introduce severe sampling bias and discard valuable records; imputation (`fillna`) is often preferred."
    }
  ],
  "dailyLessons": [
    {
      "dayNumber": 1,
      "title": "Python Setup: Virtual Environments, Interpreters & Hello World",
      "subtasks": [
        "Create an isolated virtual environment using python -m venv .venv",
        "Activate the environment and verify interpreter path with which python",
        "Write a typed script main.py and execute with python main.py",
        "Inspect installed site-packages using pip list and freeze"
      ],
      "notes": "# Python Setup & Virtual Environments\\n\\nVirtual environments isolate project dependencies to prevent global namespace pollution."
    },
    {
      "dayNumber": 2,
      "title": "Python Primitives: Integers, Floats, Strings & f-Strings",
      "subtasks": [
        "Experiment with dynamic typing and inspect types with type() and isinstance()",
        "Format output strings using modern Python 3.8+ f-strings (e.g. f'{val:.2f}')",
        "Test precision limits of IEEE 754 floating point arithmetic",
        "Practice string slicing with start, stop, and step parameters"
      ],
      "notes": "# Primitives & String Formatting\\n\\nPython strings are immutable sequences of Unicode code points."
    },
    {
      "dayNumber": 3,
      "title": "Python Control: if-elif-else & Structural Pattern Matching",
      "subtasks": [
        "Implement multi-way branching with if-elif-else logic",
        "Explore Python 3.10+ match-case structural pattern matching",
        "Combine boolean operators (and, or, not) with short-circuit evaluation",
        "Validate user input using defensive guard clauses"
      ],
      "notes": "# Control Flow & Pattern Matching\\n\\nStructural pattern matching (`match-case`) enables pattern matching against literal values, sequences, and class structures."
    },
    {
      "dayNumber": 4,
      "title": "Python Loops: for, while, enumerate & zip",
      "subtasks": [
        "Iterate over sequences using for-in loops and range() generator",
        "Track indices idiomatically using enumerate() rather than range(len(items))",
        "Pair parallel lists simultaneously using zip() and zip(strict=True)",
        "Implement while loop with break, continue, and loop-else constructs"
      ],
      "notes": "# Idiomatic Looping\\n\\nAlways prefer `enumerate(items)` and `zip(a, b)` over manual index counters."
    },
    {
      "dayNumber": 5,
      "title": "Python Lists & Tuples: Slicing, Sorting & Immutability",
      "subtasks": [
        "Demonstrate list mutation (append, extend, pop, insert, sort)",
        "Compare in-place sorting list.sort() vs built-in sorted(iterable)",
        "Unpack tuples with asterisk syntax (head, *tail = items)",
        "Verify why tuples can be used as dictionary keys while lists cannot"
      ],
      "notes": "# Sequences: Lists vs Tuples\\n\\nLists are mutable arrays of pointers; tuples are immutable and memory-efficient."
    },
    {
      "dayNumber": 6,
      "title": "Python Dictionaries & Sets: Hash Tables & O(1) Lookups",
      "subtasks": [
        "Create dictionaries and master safe retrieval with dict.get(key, default)",
        "Perform set mathematical operations (union |, intersection &, difference -)",
        "Benchmark lookup performance: item in my_set vs item in my_list",
        "Complete Week 1 Project: Interactive CLI Financial Budget Tracker"
      ],
      "notes": "# Hash Maps: Dictionaries & Sets\\n\\nDictionaries and sets provide amortized $O(1)$ key lookup via internal hash tables."
    },
    {
      "dayNumber": 7,
      "title": "Python Functions: Default Arguments, *args & **kwargs",
      "subtasks": [
        "Define functions with positional-only, keyword-only, and default arguments",
        "Demonstrate why mutable default arguments (e.g. arg=[]) cause bugs",
        "Accept arbitrary arguments with *args tuple and **kwargs dict",
        "Add type hints and inspect function annotations via __annotations__"
      ],
      "notes": "# Functions & Argument Binding\\n\\nAvoid mutable default arguments! Use `None` as sentinel."
    },
    {
      "dayNumber": 8,
      "title": "Python Scope: LEGB Rule, Closures & nonlocal",
      "subtasks": [
        "Trace variable scope through Local, Enclosing, Global, and Built-in namespaces",
        "Construct a closure that preserves state across calls",
        "Use nonlocal to mutate enclosing variables in nested functions",
        "Avoid polluting global scope with unnecessary global declarations"
      ],
      "notes": "# Scope Resolution (LEGB)\\n\\nClosures remember values in enclosing scopes even after the outer function has returned."
    },
    {
      "dayNumber": 9,
      "title": "Python Decorators: Function Wrappers & functools.wraps",
      "subtasks": [
        "Write a basic execution timer decorator using time.perf_counter()",
        "Preserve function metadata and docstrings using @functools.wraps",
        "Construct parameterized decorators accepting configuration arguments",
        "Stack multiple decorators and trace their order of execution"
      ],
      "notes": "# Decorators\\n\\nDecorators provide clean metaprogramming by wrapping function execution."
    },
    {
      "dayNumber": 10,
      "title": "Python OOP: Classes, Instances & __init__ vs __new__",
      "subtasks": [
        "Define a class with instance attributes initialized inside __init__",
        "Distinguish between class attributes and instance attributes",
        "Create properties with @property getter and @setter decorators",
        "Optimize memory using __slots__ on performance-critical models"
      ],
      "notes": "# Object-Oriented Foundations\\n\\nUse `@property` for encapsulated access and `__slots__` for memory savings."
    },
    {
      "dayNumber": 11,
      "title": "Python Dunder Methods: __repr__, __len__, __eq__ & __add__",
      "subtasks": [
        "Implement __repr__ and __str__ for clean debugging output",
        "Enable mathematical operator overloading via __add__ and __mul__",
        "Support collection length with __len__ and indexing with __getitem__",
        "Implement equality checks with __eq__ and hashing with __hash__"
      ],
      "notes": "# Magic Dunder Methods\\n\\nDunder methods integrate your custom classes natively with Python built-ins."
    },
    {
      "dayNumber": 12,
      "title": "Python OOP: Inheritance, Abstract Classes & MRO",
      "subtasks": [
        "Inherit from base classes and invoke parent logic via super()",
        "Define abstract base classes (ABC) using the abc module and @abstractmethod",
        "Inspect Method Resolution Order using ClassName.mro()",
        "Complete Week 2 Project: Object-Oriented Inventory & Order Management Engine"
      ],
      "notes": "# Inheritance & Polymorphism\\n\\nAbstract base classes define strict interface contracts across domain models."
    },
    {
      "dayNumber": 13,
      "title": "Python Generators: yield, Iterables & Lazy Streams",
      "subtasks": [
        "Write a generator function that yields items one at a time",
        "Create generator expressions using (x for x in stream) syntax",
        "Process large files line-by-line without loading entire file into RAM",
        "Inspect generator state and advance manually using next()"
      ],
      "notes": "# Generators & Lazy Evaluation\\n\\n`yield` returns control to caller while preserving the function's local execution state."
    },
    {
      "dayNumber": 14,
      "title": "Python Context Managers: with Statement & contextlib",
      "subtasks": [
        "Implement custom context manager using __enter__ and __exit__ methods",
        "Handle exception suppression and cleanup in __exit__",
        "Build lightweight context managers using @contextlib.contextmanager",
        "Manage multiple context managers simultaneously with compound with statements"
      ],
      "notes": "# Resource Management\\n\\nThe `with` statement guarantees cleanup of sockets, locks, and file descriptors."
    },
    {
      "dayNumber": 15,
      "title": "Python Error Handling: try-except-else-finally & Custom Exceptions",
      "subtasks": [
        "Catch specific exceptions and avoid anti-pattern bare except:",
        "Execute code conditionally using the else block when no errors occur",
        "Guarantee cleanup operations using the finally block",
        "Create domain-specific custom exception classes derived from Exception"
      ],
      "notes": "# Exception Architecture\\n\\nUse specific exception classes and chain errors using `raise ... from err`."
    },
    {
      "dayNumber": 16,
      "title": "Python Logging: Structured Logging over Print Statements",
      "subtasks": [
        "Configure logging levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)",
        "Set up rotating file handlers to log events with timestamps",
        "Format log output with structured metadata and module names",
        "Capture full exception tracebacks using logger.exception()"
      ],
      "notes": "# Production Logging\\n\\nNever use print() for application diagnostics; configure structured loggers."
    },
    {
      "dayNumber": 17,
      "title": "Python I/O: JSON Parsing, CSV Manipulation & Pathlib",
      "subtasks": [
        "Manipulate filesystem paths cross-platform using pathlib.Path",
        "Serialize and deserialize complex objects using json.dump() and json.load()",
        "Parse CSV records using csv.DictReader and csv.DictWriter",
        "Manage file encoding explicitly (encoding='utf-8') to avoid corruptions"
      ],
      "notes": "# File & Data Serialization\\n\\nAlways use `pathlib.Path` for path manipulations and specify `encoding='utf-8'`."
    },
    {
      "dayNumber": 18,
      "title": "Python HTTP & APIs: Requests, Async & Data Harvesting",
      "subtasks": [
        "Make GET and POST requests using requests with custom timeouts",
        "Inspect HTTP status codes, headers, and parsed JSON responses",
        "Parse HTML structures safely using BeautifulSoup",
        "Complete Week 3 Project: Resilient Web Scraper & Multi-threaded API Harvester"
      ],
      "notes": "# HTTP Requests & Scraping\\n\\nAlways specify timeouts on outbound requests to prevent worker thread hangs."
    },
    {
      "dayNumber": 19,
      "title": "NumPy Arrays: Creation, dtypes, Slicing & Views",
      "subtasks": [
        "Create 1D and 2D arrays from lists and built-in generators (zeros, ones, arange)",
        "Inspect array attributes: shape, dtype, ndim, itemsize, and size",
        "Slice multi-dimensional arrays and demonstrate views vs copies",
        "Reshape arrays using reshape() and flatten with ravel()"
      ],
      "notes": "# NumPy Array Basics\\n\\nNumPy ndarrays store homogeneous primitives in continuous memory."
    },
    {
      "dayNumber": 20,
      "title": "NumPy Vectorization: Mathematical Operations & Universal Functions",
      "subtasks": [
        "Perform element-wise arithmetic without Python for loops",
        "Apply mathematical universal functions (np.sin, np.exp, np.log)",
        "Benchmark vector math speed against standard Python lists",
        "Calculate matrix dot products using the @ operator and np.matmul()"
      ],
      "notes": "# Vectorized Arithmetic\\n\\nVectorized calculations execute at compiled C speeds via SIMD CPU instructions."
    },
    {
      "dayNumber": 21,
      "title": "NumPy Broadcasting & Masking: Boolean Indexing & Where",
      "subtasks": [
        "Apply broadcasting rules to compute operations across differing array shapes",
        "Filter data using boolean mask arrays: data[data > threshold]",
        "Combine conditional filters using bitwise & and | operators",
        "Use np.where() for conditional element selection"
      ],
      "notes": "# Broadcasting & Boolean Masks\\n\\nBroadcasting stretches dimensions of size 1 to match compatible target shapes."
    },
    {
      "dayNumber": 22,
      "title": "Pandas DataFrames: Series, Selection, Filtering & Indexing",
      "subtasks": [
        "Load datasets from CSV into Pandas DataFrames using read_csv()",
        "Select rows and columns using .loc[] (by label) and .iloc[] (by integer position)",
        "Inspect DataFrame statistics with info(), describe(), and head()",
        "Handle missing data with isna(), dropna(), and fillna()"
      ],
      "notes": "# Pandas Core Selection\\n\\nUse `.loc` for label-based indexing and `.iloc` for integer position indexing."
    },
    {
      "dayNumber": 23,
      "title": "Pandas Aggregations: GroupBy, Merge, Concat & Pivot Tables",
      "subtasks": [
        "Group records by category using df.groupby() and apply multiple aggregations",
        "Merge DataFrames on common keys (inner, left, outer joins)",
        "Construct multidimensional summary reports using pd.pivot_table()",
        "Export cleaned analytical datasets to Parquet and CSV"
      ],
      "notes": "# Split-Apply-Combine Analytics\\n\\n`groupby()` aggregates data efficiently across dimensional categories."
    },
    {
      "dayNumber": 24,
      "title": "Python Data Science Capstone: Complete EDA Pipeline",
      "subtasks": [
        "Execute end-to-end cleaning and feature derivation on real-world dataset",
        "Generate correlation heatmaps and distribution plots",
        "Export final presentation slide deck and printable analytical report",
        "Complete Week 4 Capstone: Exploratory Data Analysis & Visualization Dashboard"
      ],
      "notes": "# Data Science Mastery\\n\\nCongratulations! You have mastered production Python, OOP, and data analytics with NumPy & Pandas."
    }
  ]
};
