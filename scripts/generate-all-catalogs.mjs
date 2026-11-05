import fs from 'fs';
import path from 'path';

const outDir = path.resolve('apps/api/src/services/academics/catalogs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function writeCatalog(filename, pkg) {
  const code = `import type { SubjectCurriculumPackage } from '../types.js';\n\nexport const ${pkg.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Package: SubjectCurriculumPackage = ${JSON.stringify(pkg, null, 2)};\n`;
  fs.writeFileSync(path.join(outDir, filename), code);
  console.log(`Generated ${filename}`);
}

// 2. PYTHON & DATA SCIENCE
writeCatalog('python.ts', {
  id: "python",
  aliases: ["python", "python3", "py", "python programming", "data science"],
  subject: {
    name: "Python & Data Science Fundamentals",
    description: "Master modern Python: language idioms, OOP, functional patterns, NumPy, Pandas, and data science workflows.",
    color: "#38BDF8",
    icon: "code"
  },
  assignments: [
    {
      title: "Week 1 Project: Interactive CLI Financial Budget & Expense Tracker",
      description: "Build a Python CLI application that ingests financial transactions, calculates running averages, and provides categorization using lists, dictionaries, and string formatting.",
      daysDue: 7
    },
    {
      title: "Week 2 Project: Object-Oriented Inventory & Order Management Engine",
      description: "Design an OOP system with classes, dunder methods (__repr__, __len__, __iter__), inheritance, and CSV persistence for retail inventory.",
      daysDue: 14
    },
    {
      title: "Week 3 Project: Resilient Web Scraper & Multi-threaded API Harvester",
      description: "Implement a robust data pipeline utilizing requests, beautifulsoup4, custom context managers, and exception logging to crawl and structure datasets.",
      daysDue: 21
    },
    {
      title: "Week 4 Capstone: Exploratory Data Analysis & Visualization Dashboard",
      description: "Analyze a real-world dataset (100k+ rows) using NumPy and Pandas; generate statistical summaries, correlation heatmaps, and Matplotlib/Seaborn visualizations.",
      daysDue: 28
    }
  ],
  resources: [
    {
      type: "youtube",
      title: "Python for Beginners - Full Course (freeCodeCamp)",
      url: "https://www.youtube.com/watch?v=eWRfhZUzrAc",
      providerItemId: "eWRfhZUzrAc"
    },
    {
      type: "youtube",
      title: "Python Full Course for Beginners [2024] (Programming with Mosh)",
      url: "https://www.youtube.com/watch?v=_uQrJ0TkZlc",
      providerItemId: "_uQrJ0TkZlc"
    },
    {
      type: "youtube",
      title: "Python Tutorial for Beginners - Full Python Course (Corey Schafer)",
      url: "https://www.youtube.com/watch?v=YYXdXT2l-Gg",
      providerItemId: "YYXdXT2l-Gg"
    },
    {
      type: "youtube",
      title: "Learn Python - Full Course for Beginners (freeCodeCamp Classic)",
      url: "https://www.youtube.com/watch?v=rfscVS0vtbw",
      providerItemId: "rfscVS0vtbw"
    },
    {
      type: "web",
      title: "Python 3 Official Documentation & Tutorial",
      url: "https://docs.python.org/3/tutorial/",
      providerItemId: null
    },
    {
      type: "web",
      title: "Real Python - Production Python Guides & Tutorials",
      url: "https://realpython.com/",
      providerItemId: null
    }
  ],
  lectureDecks: [
    {
      title: "Lecture 1: Python Architecture, Bytecode Compilation & Memory Model",
      body: `## [SLIDE 1] 🎯 Course Objectives & The CPython Execution Engine
Welcome to Python & Data Science! Python is the world's most popular language for scientific computing, automation, and AI.

### 🎯 Key Learning Objectives
* Understand CPython bytecode compilation (\`.pyc\`) and the Python Virtual Machine (PVM).
* Master memory management, reference counting, and the Global Interpreter Lock (GIL).
* Establish strict virtual environments using \`venv\` or \`uv\`.

💡 **Professor's Tip:** In Python, **everything is an object**—including functions, classes, and primitive numbers. Variables are lightweight pointers bound to memory references!

---

## [SLIDE 2] 🧠 CPython Compilation Pipeline
Unlike pure interpreters, Python compiles source code to bytecode before runtime:

\`\`\`text
Source Code (.py)
      │ 1. Tokenizer & Parser
      ▼
Abstract Syntax Tree (AST)
      │ 2. Bytecode Compiler
      ▼
CPython Bytecode (.pyc in __pycache__)
      │ 3. Python Virtual Machine (PVM) Execution Loop
      ▼
Host CPU Machine Instructions
\`\`\`

---

## [SLIDE 3] 🏗️ Object Memory Model & Identity vs Equality
Python objects consist of a type pointer, reference count, and payload value:

| Concept | Operator | What It Compares | Example |
| :--- | :--- | :--- | :--- |
| **Value Equality** | \`==\` | Checks if data contents match (\`__eq__\`) | \`[1, 2] == [1, 2]\` → \`True\` |
| **Object Identity** | \`is\` | Checks if pointers refer to the exact same memory address (\`id()\`) | \`a is b\` |

⚠️ **Teacher's Warning:** Small integers (-5 to 256) and short strings are interned by CPython in static memory pools. Never rely on \`is\` for numerical comparisons!

---

## [SLIDE 4] 💻 Production Code Walkthrough & Typing
Here is a typed, production-ready Python starter:

\`\`\`python
from typing import List, Optional
import sys

def calculate_running_stats(values: List[float]) -> dict[str, float]:
    """Computes arithmetic mean and range safely."""
    if not values:
        raise ValueError("Cannot calculate stats on empty dataset.")
    
    total = sum(values)
    count = len(values)
    return {
        "mean": total / count,
        "min": min(values),
        "max": max(values),
        "count": float(count)
    }

if __name__ == "__main__":
    data = [12.5, 45.0, 68.2, 91.4]
    stats = calculate_running_stats(data)
    print(f"StudyOS Python Runtime: {sys.version.split()[0]}")
    for k, v in stats.items():
        print(f"  {k.capitalize()}: {v:.2f}")
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Mutable Default Arguments:** Writing \`def append_to(item, target=[])\` reuses the same list across all function invocations! Always write \`target: Optional[List] = None\` and initialize inside the body.
2. **Shallow vs Deep Copy:** \`b = a.copy()\` duplicates the outer list, but inner mutable objects remain shared pointers! Use \`copy.deepcopy()\` for nested structures.
3. **Variable Shadowing:** Defining a local variable with the name \`list\`, \`dict\`, or \`str\` destroys access to standard built-in constructors.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What happens when an object's reference count drops to 0?
  * *Answer:* CPython immediately deallocates the object memory and returns it to the arena allocator.
* **Q2:** Why should you use \`if __name__ == "__main__":\`?
  * *Answer:* Prevents executable code from running when the file is imported as a module in another script.`
    },
    {
      title: "Lecture 2: Core Data Structures (Lists, Tuples, Dictionaries & Sets)",
      body: `## [SLIDE 1] 🎯 Data Structures & Algorithmic Complexities
Choosing the correct data structure is the difference between an $O(1)$ constant time lookup and an $O(N)$ linear scan.

### 🎯 Key Learning Objectives
* Compare mutable vs immutable sequences (Lists vs Tuples).
* Understand Hash Tables behind Python Dictionaries and Sets.
* Master dictionary comprehensions and set operations.

---

## [SLIDE 2] 🧠 Hash Table Visualizer (Dictionaries & Sets)
Python dictionaries use compact hash tables with open addressing:

\`\`\`text
Key: "user:101" ──> hash() % Capacity ──> Hash Index [4]
                                            │
                                            ▼
                                   [ Hash | Key | Value ]
\`\`\`

* **Average Lookup:** $O(1)$
* **Worst-Case Collision:** $O(N)$

---

## [SLIDE 3] 🏗️ Time Complexity Matrix
| Operation | List | Tuple | Set | Dict |
| :--- | :--- | :--- | :--- | :--- |
| **Access by index** | $O(1)$ | $O(1)$ | N/A | N/A |
| **Lookup by key/value** | $O(N)$ | $O(N)$ | $O(1)$ avg | $O(1)$ avg |
| **Append / Insert** | $O(1)$ amortized | N/A | $O(1)$ avg | $O(1)$ avg |
| **Delete element** | $O(N)$ | N/A | $O(1)$ avg | $O(1)$ avg |

---

## [SLIDE 4] 💻 Idiomatic Python Code Walkthrough
\`\`\`python
from collections import defaultdict, Counter

def analyze_student_records(submissions: list[tuple[str, str, int]]) -> dict:
    # submissions: (student_id, course_code, score)
    scores_by_course = defaultdict(list)
    student_counter = Counter()

    for student_id, course, score in submissions:
        scores_by_course[course].append(score)
        student_counter[student_id] += 1

    course_averages = {
        course: sum(scores) / len(scores)
        for course, scores in scores_by_course.items()
    }
    return {"averages": course_averages, "top_students": student_counter.most_common(3)}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Modifying a collection while iterating over it:** Deleting items from a list inside a \`for item in my_list:\` loop skips every other element due to index shifting.
2. **Unhashable Type in Sets/Dicts:** Attempting to use a list or dictionary as a set element or dict key raises \`TypeError: unhashable type\`. Use a \`tuple\` instead.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** Why is \`item in my_set\` much faster than \`item in my_list\`?
  * *Answer:* Sets use hash tables ($O(1)$ lookup), whereas lists perform sequential scans ($O(N)$ lookup).
* **Q2:** When should you use a tuple instead of a list?
  * *Answer:* When the data is fixed/immutable, needs to serve as a dictionary key, or needs memory protection.`
    },
    {
      title: "Lecture 3: Functions, Closures, Decorators & Scope (LEGB Rule)",
      body: `## [SLIDE 1] 🎯 Advanced Functional Concepts in Python
In Python, functions are first-class citizens: they can be passed as arguments, returned from other functions, and bound dynamically.

### 🎯 Key Learning Objectives
* Master the LEGB (Local, Enclosing, Global, Built-in) scope resolution rule.
* Understand closures and how inner functions retain lexical scope.
* Build custom decorators with \`functools.wraps\` for performance timing and caching.

---

## [SLIDE 2] 🧠 The LEGB Scope Resolution Hierarchy
When resolving a variable name, Python searches strictly from inside out:

\`\`\`text
1. [L] Local Scope (Inside the executing function)
        │ If not found
        ▼
2. [E] Enclosing Scope (Inside any enclosing enclosing functions)
        │ If not found
        ▼
3. [G] Global Scope (Module level variables)
        │ If not found
        ▼
4. [B] Built-in Scope (Python builtins: len, sum, Exception)
\`\`\`

---

## [SLIDE 3] 🏗️ Decorator Execution Flow
Decorators wrap a target function, intercepting inputs and outputs:

\`\`\`text
@timing_decorator
def query_db(): ...

is executed as:

query_db = timing_decorator(query_db)
\`\`\`

---

## [SLIDE 4] 💻 Production Code: Timing & Retry Decorator
\`\`\`python
import time
from functools import wraps
from typing import Callable, Any

def retry(attempts: int = 3, delay: float = 0.5):
    """Retries an operation if transient exceptions occur."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            last_err = None
            for i in range(attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as err:
                    last_err = err
                    time.sleep(delay * (2 ** i)) # Exponential backoff
            raise RuntimeError(f"Failed after {attempts} attempts: {last_err}")
        return wrapper
    return decorator
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **UnboundLocalError:** Writing \`x += 1\` inside a function where \`x\` is global causes Python to mark \`x\` as local during compilation, triggering an error before assignment. Use the \`global\` or \`nonlocal\` keyword.
2. **Forgetting \`@wraps(func)\`:** Omitting \`@wraps\` strips the original function's \`__name__\` and docstrings, breaking debuggers and test runners.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is a closure?
  * *Answer:* A function object that retains bindings to variables in its lexical enclosing scope, even after the outer function has completed execution.
* **Q2:** What does the \`*args\` and \`**kwargs\` syntax allow?
  * *Answer:* \`*args\` collects positional arguments into a tuple, while \`**kwargs\` collects named keyword arguments into a dictionary.`
    },
    {
      title: "Lecture 4: Object-Oriented Architecture, Dunder Methods & Inheritance",
      body: `## [SLIDE 1] 🎯 Object-Oriented Programming (OOP) in Python
Python balances dynamic elegance with robust object-oriented architecture.

### 🎯 Key Learning Objectives
* Understand class vs instance attributes.
* Implement Pythonic Dunder (Double Underscore) magic methods.
* Master Multiple Inheritance and Method Resolution Order (MRO).

---

## [SLIDE 2] 🧠 Dunder Method Protocol Pipeline
\`\`\`text
len(my_obj)        ──> calls ──> my_obj.__len__()
print(my_obj)      ──> calls ──> my_obj.__str__()
repr(my_obj)       ──> calls ──> my_obj.__repr__()
my_obj[key]        ──> calls ──> my_obj.__getitem__(key)
for item in my_obj ──> calls ──> my_obj.__iter__()
\`\`\`

---

## [SLIDE 3] 🏗️ Method Resolution Order (C3 Linearization)
When multiple inheritance is used (\`class C(A, B)\`), Python resolves attributes using the C3 Linearization algorithm accessible via \`C.mro()\`.

---

## [SLIDE 4] 💻 Production Code: Custom Vector Class
\`\`\`python
class Vector2D:
    """An immutable, mathematically sound 2D Vector."""
    __slots__ = ("_x", "_y")  # Drastically reduces memory footprint

    def __init__(self, x: float, y: float):
        self._x = float(x)
        self._y = float(y)

    @property
    def x(self) -> float:
        return self._x

    @property
    def y(self) -> float:
        return self._y

    def __repr__(self) -> str:
        return f"Vector2D(x={self._x}, y={self._y})"

    def __add__(self, other: "Vector2D") -> "Vector2D":
        if not isinstance(other, Vector2D):
            return NotImplemented
        return Vector2D(self._x + other._x, self._y + other._y)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Vector2D):
            return False
        return self._x == other._x and self._y == other._y
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Class Attribute Mutation Trap:** Defining \`class Bank: accounts = []\` shares that exact single list across all bank instances! Always declare instance variables in \`__init__\` with \`self.accounts = []\`.
2. **\`__str__\` vs \`__repr__\`:** \`__str__\` is for end-user readable formatting; \`__repr__\` should be an unambiguous string that could recreate the object.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the purpose of \`__slots__\` in a Python class?
  * *Answer:* Prevents the creation of the dynamic \`__dict__\` per instance, drastically saving RAM and accelerating attribute access.
* **Q2:** How does \`super()\` know which parent method to invoke?
  * *Answer:* It looks up the class's Method Resolution Order (MRO) dynamically at runtime.`
    },
    {
      title: "Lecture 5: Iterators, Generators, Context Managers & Memory Optimization",
      body: `## [SLIDE 1] 🎯 Lazy Evaluation & Memory Efficiency
Generators produce values on-demand using \`yield\`, enabling Python to process multi-gigabyte datasets with only a few megabytes of RAM.

### 🎯 Key Learning Objectives
* Understand the Iterator Protocol (\`__iter__\` and \`__next__\`).
* Write memory-efficient Generator functions and expressions.
* Create Context Managers with \`__enter__\` and \`__exit__\` (\`with\` statements).

---

## [SLIDE 2] 🧠 Generator Stream vs Eager List Loading
\`\`\`text
Eager List:      [ Record 1, Record 2, ... Record 1,000,000 ]  (4.2 GB RAM Used!)
Lazy Generator:  Record ──yield──> Process ──> Discard ──> Next (12 KB RAM Used!)
\`\`\`

---

## [SLIDE 3] 🏗️ Context Manager Lifecycle
\`\`\`text
with open("data.csv") as f:
      │ 1. Calls f.__enter__()
      │ 2. Yields control to code block
      ▼
Execute block statements...
      │ 3. Always calls f.__exit__(exc_type, exc_val, exc_tb)
      ▼
Resources (File descriptor, Socket, Lock) safely closed even on crash!
\`\`\`

---

## [SLIDE 4] 💻 Production Code: Streaming Log Parser
\`\`\`python
from typing import Generator, TextIO
from contextlib import contextmanager
import time

def stream_error_logs(file_path: str) -> Generator[str, None, None]:
    """Yields only ERROR lines from a large log file without loading entire file."""
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            if "ERROR" in line:
                yield line.strip()

@contextmanager
def execution_timer(label: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        print(f"[{label}] Execution finished in {elapsed:.4f}s")
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Exhausting a Generator:** Once a generator has yielded all elements, attempting to loop over it again yields 0 elements! Generators are single-use streams.
2. **Swallowing Exceptions in Context Managers:** In \`__exit__\`, returning \`True\` suppresses any exception that occurred inside the \`with\` block, potentially hiding fatal errors.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What exception is raised when a generator reaches the end of its iteration?
  * *Answer:* The \`StopIteration\` exception.
* **Q2:** What is the difference between a list comprehension and a generator expression?
  * *Answer:* List comprehensions use square brackets \`[x for x in data]\` and allocate memory immediately; generator expressions use parentheses \`(x for x in data)\` and compute lazily.`
    },
    {
      title: "Lecture 6: Resilient Error Handling, Logging & Defensive Programming",
      body: `## [SLIDE 1] 🎯 Enterprise Error Handling & Logging
Production code must fail gracefully with actionable diagnostics rather than crashing abruptly.

### 🎯 Key Learning Objectives
* Master Python's exception hierarchy and custom exception modeling.
* Use \`try-except-else-finally\` correctly.
* Implement structured logging using Python's standard \`logging\` module.

---

## [SLIDE 2] 🧠 Exception Resolution Tree
\`\`\`text
BaseException
 ├── KeyboardInterrupt (Ctrl+C)
 ├── SystemExit
 └── Exception (Standard Application Errors)
      ├── ValueError
      ├── TypeError
      ├── LookupError (KeyError, IndexError)
      └── OSError (FileNotFoundError, PermissionError)
\`\`\`

⚠️ **Teacher's Warning:** Never write bare \`except:\`! It catches \`KeyboardInterrupt\` and \`SystemExit\`, making your script impossible to terminate from the terminal!

---

## [SLIDE 3] 🏗️ The try-except-else-finally State Flow
* **\`try\`**: Protected block where exceptions may arise.
* **\`except\`**: Handles designated error types.
* **\`else\`**: Executes ONLY when NO exception occurred in \`try\`.
* **\`finally\`**: ALWAYS executes regardless of errors or return statements.

---

## [SLIDE 4] 💻 Production Code: Custom Exception Hierarchy
\`\`\`python
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

class BankingError(Exception):
    """Base exception for banking domain errors."""

class InsufficientFundsError(BankingError):
    def __init__(self, balance: float, requested: float):
        super().__init__(f"Insufficient funds: Balance \${balance:.2f} < Requested \${requested:.2f}")
        self.balance = balance
        self.requested = requested

def withdraw(balance: float, amount: float) -> float:
    if amount <= 0:
        raise ValueError("Withdrawal amount must be positive.")
    if amount > balance:
        raise InsufficientFundsError(balance, amount)
    
    new_balance = balance - amount
    logging.info("Successfully withdrew \$%.2f. Remaining: \$%.2f", amount, new_balance)
    return new_balance
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Masking Tracebacks:** Writing \`except Exception as e: raise Exception("Failed")\` wipes the original stack trace. Always use chained exceptions: \`raise CustomError("Failed") from e\`.
2. **Using \`print()\` instead of \`logging\`:** Print statements cannot be redirected to rotating log files, filtered by severity level, or disabled in production.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** When does the \`else\` block in a \`try-except-else\` statement execute?
  * *Answer:* Only if the \`try\` block completes successfully without raising any exceptions.
* **Q2:** Why should you inherit custom application exceptions from \`Exception\` instead of \`BaseException\`?
  * *Answer:* \`BaseException\` bypasses standard application error handling and interferes with system-level control signals.`
    },
    {
      title: "Lecture 7: NumPy Foundations: Vectorization, N-D Arrays & Broadcasting",
      body: `## [SLIDE 1] 🎯 High-Performance Scientific Computing with NumPy
NumPy (Numerical Python) powers nearly all modern AI and scientific data science packages by providing C-speed array operations in Python.

### 🎯 Key Learning Objectives
* Understand Contiguous C-Arrays vs Python Pointer Arrays.
* Master Vectorization: Eliminating slow Python \`for\` loops.
* Master NumPy Broadcasting rules for arrays of different shapes.

---

## [SLIDE 2] 🧠 Contiguous C-Buffer vs Python List of Pointers
\`\`\`text
Python List:  [ *ptr1, *ptr2, *ptr3 ] ──> Scattered Heap Objects (Cache Misses!)
NumPy ndarray: [ 1.0 | 2.0 | 3.0 | 4.0 ] ──> Dense Contiguous Memory (SIMD Accelerated!)
\`\`\`

Vectorized operations run **50x to 200x faster** than pure Python loops!

---

## [SLIDE 3] 🏗️ NumPy Broadcasting Rules
Two dimensions are compatible when:
1. They are equal, or
2. One of them is 1.

\`\`\`text
Array A:  (4, 3)
Array B:     (3) ──> Broadcasts to (1, 3) ──> Stretches to (4, 3)
Result:   (4, 3)
\`\`\`

---

## [SLIDE 4] 💻 Production Code: Vectorized Linear Algebra
\`\`\`python
import numpy as np

def compute_euclidean_distance_matrix(X: np.ndarray, Y: np.ndarray) -> np.ndarray:
    """
    Computes pairwise Euclidean distance between rows in X (N, D) and Y (M, D)
    using vectorized broadcasting with zero Python loops!
    """
    # Formula: ||x - y||^2 = ||x||^2 + ||y||^2 - 2(x . y)
    X_sq = np.sum(X ** 2, axis=1, keepdims=True)  # (N, 1)
    Y_sq = np.sum(Y ** 2, axis=1, keepdims=True)  # (M, 1)
    
    # Pairwise dot products via matrix multiplication
    dot_products = np.dot(X, Y.T)                 # (N, M)
    
    dist_sq = X_sq + Y_sq.T - 2 * dot_products
    return np.sqrt(np.maximum(dist_sq, 0.0))
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Views vs Copies in Slicing:** A basic slice \`b = a[1:5]\` is a **view** into the original array's memory! Mutating \`b\` alters \`a\`! Use \`b = a[1:5].copy()\` to prevent side-effects.
2. **Boolean Indexing with \`and\` / \`or\`:** You cannot use Python's \`and\` or \`or\` on NumPy arrays. You MUST use bitwise operators: \`(arr > 0) & (arr < 10)\`.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What does NumPy vectorization mean?
  * *Answer:* Executing batch mathematical operations across contiguous memory buffers using pre-compiled C code and SIMD instructions without explicit Python loops.
* **Q2:** What is the difference between \`np.dot(A, B)\` and \`A * B\`?
  * *Answer:* \`A * B\` is element-wise multiplication, whereas \`np.dot(A, B)\` performs matrix dot multiplication.`
    },
    {
      title: "Lecture 8: Pandas for Data Science: DataFrames, GroupBy & Time Series",
      body: `## [SLIDE 1] 🎯 Data Wrangling & Analytics with Pandas
Pandas is the premier data science library for tabular data, SQL-like aggregations, and exploratory data analysis.

### 🎯 Key Learning Objectives
* Understand Series and DataFrames, Index alignment, and memory optimization.
* Master SQL-style filtering, joins, merges, and \`groupby\` aggregations.
* Handle missing values and detect statistical outliers.

---

## [SLIDE 2] 🧠 The Pandas Architecture
\`\`\`text
DataFrame
 ├── Index (Row Identifiers)
 ├── Columns (Feature Names)
 └── Series (Individual 1D Typed Arrays, backed by NumPy ndarrays)
\`\`\`

---

## [SLIDE 3] 🏗️ Split-Apply-Combine Pattern (GroupBy)
\`\`\`text
Raw DataFrame ──> Split by Category ──> Apply Aggregation ──> Combine into Summary
 [ Dept | Salary ]    [ Engineering ]      mean() = 120k           [ Dept | AvgSalary ]
                      [ Marketing   ]      mean() = 95k    ──>     [ Eng  | 120k      ]
                      [ Operations  ]      mean() = 80k            [ Mkt  | 95k       ]
\`\`\`

---

## [SLIDE 4] 💻 Production Code: Real-World Data Pipeline
\`\`\`python
import pandas as pd
import numpy as np

def clean_and_aggregate_sales(df: pd.DataFrame) -> pd.DataFrame:
    # 1. Handle missing values
    df = df.copy()
    df["sales"] = pd.to_numeric(df["sales"], errors="coerce").fillna(0.0)
    df["order_date"] = pd.to_datetime(df["order_date"])

    # 2. Add derived temporal features
    df["year_month"] = df["order_date"].dt.to_period("M")

    # 3. GroupBy aggregation
    summary = (
        df.groupby(["region", "year_month"])
        .agg(
            total_revenue=("sales", "sum"),
            avg_order_value=("sales", "mean"),
            order_count=("sales", "count")
        )
        .reset_index()
    )
    return summary
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **SettingWithCopyWarning:** Writing \`df[df['age'] > 18]['status'] = 'Adult'\` fails because the slice may return a temporary copy. Always write \`df.loc[df['age'] > 18, 'status'] = 'Adult'\`.
2. **Iterating with \`iterrows()\`:** Using \`iterrows()\` is excruciatingly slow! Always use vectorized operations, \`apply()\`, or NumPy methods.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What does \`df.loc\` vs \`df.iloc\` do?
  * *Answer:* \`df.loc\` selects data by label/name and boolean masks; \`df.iloc\` selects strictly by integer position.
* **Q2:** Why is \`dropna()\` used cautiously in production data pipelines?
  * *Answer:* Dropping rows blindly can introduce severe sampling bias and discard valuable records; imputation (\`fillna\`) is often preferred.`
    }
  ],
  dailyLessons: [
    {
      dayNumber: 1,
      title: "Python Setup: Virtual Environments, Interpreters & Hello World",
      subtasks: [
        "Create an isolated virtual environment using python -m venv .venv",
        "Activate the environment and verify interpreter path with which python",
        "Write a typed script main.py and execute with python main.py",
        "Inspect installed site-packages using pip list and freeze"
      ],
      notes: "# Python Setup & Virtual Environments\\n\\nVirtual environments isolate project dependencies to prevent global namespace pollution."
    },
    {
      dayNumber: 2,
      title: "Python Primitives: Integers, Floats, Strings & f-Strings",
      subtasks: [
        "Experiment with dynamic typing and inspect types with type() and isinstance()",
        "Format output strings using modern Python 3.8+ f-strings (e.g. f'{val:.2f}')",
        "Test precision limits of IEEE 754 floating point arithmetic",
        "Practice string slicing with start, stop, and step parameters"
      ],
      notes: "# Primitives & String Formatting\\n\\nPython strings are immutable sequences of Unicode code points."
    },
    {
      dayNumber: 3,
      title: "Python Control: if-elif-else & Structural Pattern Matching",
      subtasks: [
        "Implement multi-way branching with if-elif-else logic",
        "Explore Python 3.10+ match-case structural pattern matching",
        "Combine boolean operators (and, or, not) with short-circuit evaluation",
        "Validate user input using defensive guard clauses"
      ],
      notes: "# Control Flow & Pattern Matching\\n\\nStructural pattern matching (`match-case`) enables pattern matching against literal values, sequences, and class structures."
    },
    {
      dayNumber: 4,
      title: "Python Loops: for, while, enumerate & zip",
      subtasks: [
        "Iterate over sequences using for-in loops and range() generator",
        "Track indices idiomatically using enumerate() rather than range(len(items))",
        "Pair parallel lists simultaneously using zip() and zip(strict=True)",
        "Implement while loop with break, continue, and loop-else constructs"
      ],
      notes: "# Idiomatic Looping\\n\\nAlways prefer `enumerate(items)` and `zip(a, b)` over manual index counters."
    },
    {
      dayNumber: 5,
      title: "Python Lists & Tuples: Slicing, Sorting & Immutability",
      subtasks: [
        "Demonstrate list mutation (append, extend, pop, insert, sort)",
        "Compare in-place sorting list.sort() vs built-in sorted(iterable)",
        "Unpack tuples with asterisk syntax (head, *tail = items)",
        "Verify why tuples can be used as dictionary keys while lists cannot"
      ],
      notes: "# Sequences: Lists vs Tuples\\n\\nLists are mutable arrays of pointers; tuples are immutable and memory-efficient."
    },
    {
      dayNumber: 6,
      title: "Python Dictionaries & Sets: Hash Tables & O(1) Lookups",
      subtasks: [
        "Create dictionaries and master safe retrieval with dict.get(key, default)",
        "Perform set mathematical operations (union |, intersection &, difference -)",
        "Benchmark lookup performance: item in my_set vs item in my_list",
        "Complete Week 1 Project: Interactive CLI Financial Budget Tracker"
      ],
      notes: "# Hash Maps: Dictionaries & Sets\\n\\nDictionaries and sets provide amortized $O(1)$ key lookup via internal hash tables."
    },
    {
      dayNumber: 7,
      title: "Python Functions: Default Arguments, *args & **kwargs",
      subtasks: [
        "Define functions with positional-only, keyword-only, and default arguments",
        "Demonstrate why mutable default arguments (e.g. arg=[]) cause bugs",
        "Accept arbitrary arguments with *args tuple and **kwargs dict",
        "Add type hints and inspect function annotations via __annotations__"
      ],
      notes: "# Functions & Argument Binding\\n\\nAvoid mutable default arguments! Use `None` as sentinel."
    },
    {
      dayNumber: 8,
      title: "Python Scope: LEGB Rule, Closures & nonlocal",
      subtasks: [
        "Trace variable scope through Local, Enclosing, Global, and Built-in namespaces",
        "Construct a closure that preserves state across calls",
        "Use nonlocal to mutate enclosing variables in nested functions",
        "Avoid polluting global scope with unnecessary global declarations"
      ],
      notes: "# Scope Resolution (LEGB)\\n\\nClosures remember values in enclosing scopes even after the outer function has returned."
    },
    {
      dayNumber: 9,
      title: "Python Decorators: Function Wrappers & functools.wraps",
      subtasks: [
        "Write a basic execution timer decorator using time.perf_counter()",
        "Preserve function metadata and docstrings using @functools.wraps",
        "Construct parameterized decorators accepting configuration arguments",
        "Stack multiple decorators and trace their order of execution"
      ],
      notes: "# Decorators\\n\\nDecorators provide clean metaprogramming by wrapping function execution."
    },
    {
      dayNumber: 10,
      title: "Python OOP: Classes, Instances & __init__ vs __new__",
      subtasks: [
        "Define a class with instance attributes initialized inside __init__",
        "Distinguish between class attributes and instance attributes",
        "Create properties with @property getter and @setter decorators",
        "Optimize memory using __slots__ on performance-critical models"
      ],
      notes: "# Object-Oriented Foundations\\n\\nUse `@property` for encapsulated access and `__slots__` for memory savings."
    },
    {
      dayNumber: 11,
      title: "Python Dunder Methods: __repr__, __len__, __eq__ & __add__",
      subtasks: [
        "Implement __repr__ and __str__ for clean debugging output",
        "Enable mathematical operator overloading via __add__ and __mul__",
        "Support collection length with __len__ and indexing with __getitem__",
        "Implement equality checks with __eq__ and hashing with __hash__"
      ],
      notes: "# Magic Dunder Methods\\n\\nDunder methods integrate your custom classes natively with Python built-ins."
    },
    {
      dayNumber: 12,
      title: "Python OOP: Inheritance, Abstract Classes & MRO",
      subtasks: [
        "Inherit from base classes and invoke parent logic via super()",
        "Define abstract base classes (ABC) using the abc module and @abstractmethod",
        "Inspect Method Resolution Order using ClassName.mro()",
        "Complete Week 2 Project: Object-Oriented Inventory & Order Management Engine"
      ],
      notes: "# Inheritance & Polymorphism\\n\\nAbstract base classes define strict interface contracts across domain models."
    },
    {
      dayNumber: 13,
      title: "Python Generators: yield, Iterables & Lazy Streams",
      subtasks: [
        "Write a generator function that yields items one at a time",
        "Create generator expressions using (x for x in stream) syntax",
        "Process large files line-by-line without loading entire file into RAM",
        "Inspect generator state and advance manually using next()"
      ],
      notes: "# Generators & Lazy Evaluation\\n\\n`yield` returns control to caller while preserving the function's local execution state."
    },
    {
      dayNumber: 14,
      title: "Python Context Managers: with Statement & contextlib",
      subtasks: [
        "Implement custom context manager using __enter__ and __exit__ methods",
        "Handle exception suppression and cleanup in __exit__",
        "Build lightweight context managers using @contextlib.contextmanager",
        "Manage multiple context managers simultaneously with compound with statements"
      ],
      notes: "# Resource Management\\n\\nThe `with` statement guarantees cleanup of sockets, locks, and file descriptors."
    },
    {
      dayNumber: 15,
      title: "Python Error Handling: try-except-else-finally & Custom Exceptions",
      subtasks: [
        "Catch specific exceptions and avoid anti-pattern bare except:",
        "Execute code conditionally using the else block when no errors occur",
        "Guarantee cleanup operations using the finally block",
        "Create domain-specific custom exception classes derived from Exception"
      ],
      notes: "# Exception Architecture\\n\\nUse specific exception classes and chain errors using `raise ... from err`."
    },
    {
      dayNumber: 16,
      title: "Python Logging: Structured Logging over Print Statements",
      subtasks: [
        "Configure logging levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)",
        "Set up rotating file handlers to log events with timestamps",
        "Format log output with structured metadata and module names",
        "Capture full exception tracebacks using logger.exception()"
      ],
      notes: "# Production Logging\\n\\nNever use print() for application diagnostics; configure structured loggers."
    },
    {
      dayNumber: 17,
      title: "Python I/O: JSON Parsing, CSV Manipulation & Pathlib",
      subtasks: [
        "Manipulate filesystem paths cross-platform using pathlib.Path",
        "Serialize and deserialize complex objects using json.dump() and json.load()",
        "Parse CSV records using csv.DictReader and csv.DictWriter",
        "Manage file encoding explicitly (encoding='utf-8') to avoid corruptions"
      ],
      notes: "# File & Data Serialization\\n\\nAlways use `pathlib.Path` for path manipulations and specify `encoding='utf-8'`."
    },
    {
      dayNumber: 18,
      title: "Python HTTP & APIs: Requests, Async & Data Harvesting",
      subtasks: [
        "Make GET and POST requests using requests with custom timeouts",
        "Inspect HTTP status codes, headers, and parsed JSON responses",
        "Parse HTML structures safely using BeautifulSoup",
        "Complete Week 3 Project: Resilient Web Scraper & Multi-threaded API Harvester"
      ],
      notes: "# HTTP Requests & Scraping\\n\\nAlways specify timeouts on outbound requests to prevent worker thread hangs."
    },
    {
      dayNumber: 19,
      title: "NumPy Arrays: Creation, dtypes, Slicing & Views",
      subtasks: [
        "Create 1D and 2D arrays from lists and built-in generators (zeros, ones, arange)",
        "Inspect array attributes: shape, dtype, ndim, itemsize, and size",
        "Slice multi-dimensional arrays and demonstrate views vs copies",
        "Reshape arrays using reshape() and flatten with ravel()"
      ],
      notes: "# NumPy Array Basics\\n\\nNumPy ndarrays store homogeneous primitives in continuous memory."
    },
    {
      dayNumber: 20,
      title: "NumPy Vectorization: Mathematical Operations & Universal Functions",
      subtasks: [
        "Perform element-wise arithmetic without Python for loops",
        "Apply mathematical universal functions (np.sin, np.exp, np.log)",
        "Benchmark vector math speed against standard Python lists",
        "Calculate matrix dot products using the @ operator and np.matmul()"
      ],
      notes: "# Vectorized Arithmetic\\n\\nVectorized calculations execute at compiled C speeds via SIMD CPU instructions."
    },
    {
      dayNumber: 21,
      title: "NumPy Broadcasting & Masking: Boolean Indexing & Where",
      subtasks: [
        "Apply broadcasting rules to compute operations across differing array shapes",
        "Filter data using boolean mask arrays: data[data > threshold]",
        "Combine conditional filters using bitwise & and | operators",
        "Use np.where() for conditional element selection"
      ],
      notes: "# Broadcasting & Boolean Masks\\n\\nBroadcasting stretches dimensions of size 1 to match compatible target shapes."
    },
    {
      dayNumber: 22,
      title: "Pandas DataFrames: Series, Selection, Filtering & Indexing",
      subtasks: [
        "Load datasets from CSV into Pandas DataFrames using read_csv()",
        "Select rows and columns using .loc[] (by label) and .iloc[] (by integer position)",
        "Inspect DataFrame statistics with info(), describe(), and head()",
        "Handle missing data with isna(), dropna(), and fillna()"
      ],
      notes: "# Pandas Core Selection\\n\\nUse `.loc` for label-based indexing and `.iloc` for integer position indexing."
    },
    {
      dayNumber: 23,
      title: "Pandas Aggregations: GroupBy, Merge, Concat & Pivot Tables",
      subtasks: [
        "Group records by category using df.groupby() and apply multiple aggregations",
        "Merge DataFrames on common keys (inner, left, outer joins)",
        "Construct multidimensional summary reports using pd.pivot_table()",
        "Export cleaned analytical datasets to Parquet and CSV"
      ],
      notes: "# Split-Apply-Combine Analytics\\n\\n`groupby()` aggregates data efficiently across dimensional categories."
    },
    {
      dayNumber: 24,
      title: "Python Data Science Capstone: Complete EDA Pipeline",
      subtasks: [
        "Execute end-to-end cleaning and feature derivation on real-world dataset",
        "Generate correlation heatmaps and distribution plots",
        "Export final presentation slide deck and printable analytical report",
        "Complete Week 4 Capstone: Exploratory Data Analysis & Visualization Dashboard"
      ],
      notes: "# Data Science Mastery\\n\\nCongratulations! You have mastered production Python, OOP, and data analytics with NumPy & Pandas."
    }
  ]
});

// 3. DATA STRUCTURES & ALGORITHMS (DSA)
writeCatalog('dsa.ts', {
  id: "dsa",
  aliases: ["dsa", "data structures", "algorithms", "data structures and algorithms", "leetcode", "competitive programming"],
  subject: {
    name: "Data Structures & Algorithms (DSA)",
    description: "Core algorithms, asymptotic time/space complexities, tree/graph traversals, dynamic programming, and interview patterns.",
    color: "#10B981",
    icon: "code"
  },
  assignments: [
    {
      title: "Week 1 Project: High-Throughput LRU Cache & Doubly-Linked List",
      description: "Implement a production-grade Least Recently Used (LRU) Cache supporting O(1) get() and put() using a hash map combined with a doubly-linked list.",
      daysDue: 7
    },
    {
      title: "Week 2 Project: Expression Evaluator & Monotonic Stack Engine",
      description: "Build an algebraic arithmetic expression parser supporting nested parentheses, operator precedence, and Daily Temperatures monotonic stack algorithms.",
      daysDue: 14
    },
    {
      title: "Week 3 Project: Trie Autocomplete Engine & Topological Sort Dependency Graph",
      description: "Construct a Trie (Prefix Tree) for sub-millisecond search autocomplete and a Directed Acyclic Graph (DAG) topological sort package manager.",
      daysDue: 21
    },
    {
      title: "Week 4 Capstone: Real-Time Dijkstra Shortest Path & DP Optimizer",
      description: "Implement Dijkstra's shortest path routing engine with a min-heap priority queue and 0/1 Knapsack dynamic programming optimizations.",
      daysDue: 28
    }
  ],
  resources: [
    {
      type: "youtube",
      title: "Algorithms and Data Structures Tutorial - Full Course (freeCodeCamp)",
      url: "https://www.youtube.com/watch?v=8hly31xKli0",
      providerItemId: "8hly31xKli0"
    },
    {
      type: "youtube",
      title: "Data Structures and Algorithms for Beginners (Bro Code)",
      url: "https://www.youtube.com/watch?v=CBYHwZcbD-s",
      providerItemId: "CBYHwZcbD-s"
    },
    {
      type: "youtube",
      title: "Introduction to Algorithms - Complete Masterclass (Abdul Bari)",
      url: "https://www.youtube.com/watch?v=0IAPZzGSbME",
      providerItemId: "0IAPZzGSbME"
    },
    {
      type: "youtube",
      title: "Two Sum - Hash Map & Array Mastery (NeetCode)",
      url: "https://www.youtube.com/watch?v=KLlXCFG5TnA",
      providerItemId: "KLlXCFG5TnA"
    },
    {
      type: "web",
      title: "GeeksforGeeks - Data Structures and Algorithms Reference",
      url: "https://www.geeksforgeeks.org/data-structures/",
      providerItemId: null
    },
    {
      type: "web",
      title: "VisuAlgo - Visualising Data Structures and Algorithms",
      url: "https://visualgo.net/en",
      providerItemId: null
    }
  ],
  lectureDecks: [
    {
      title: "Lecture 1: Asymptotic Analysis, Big-O Notation & Space-Time Tradeoffs",
      body: `## [SLIDE 1] 🎯 Course Objectives & The Core Mindset of DSA
Data Structures and Algorithms form the foundation of software engineering, separating developers who write code from engineers who architect scalable systems.

### 🎯 Key Learning Objectives
* Understand Formal Asymptotic Notations: Big-$O$, Big-$\\Omega$, and Big-$\\Theta$.
* Master Space vs Time Complexity tradeoffs.
* Recognize common complexity curves from $O(1)$ to $O(2^N)$.

💡 **Professor's Tip:** When optimizing code, **measure first**. Improving an algorithm from $O(N^2)$ to $O(N \\log N)$ beats any micro-level compiler optimization!

---

## [SLIDE 2] 🧠 Algorithmic Complexity Growth Curves
\`\`\`text
Execution Time
      ▲
      │                                                * O(2^N) [Exponential]
      │                                            *
      │                                         *    * O(N^2) [Quadratic]
      │                                       *    *
      │                                     *    *   * O(N log N) [Linearithmic]
      │                                   *    *   *
      │                                 *    *   *   * O(N) [Linear]
      │                               *    *   *   *
      │   -------------------------------------------* O(log N) [Logarithmic]
      │   -------------------------------------------* O(1) [Constant]
      └─────────────────────────────────────────────────────► Input Size (N)
\`\`\`

---

## [SLIDE 3] 🏗️ The 3 Asymptotic Bounds
| Notation | Definition | Practical Engineering Meaning |
| :--- | :--- | :--- |
| **Big-$O$ ($O$)** | $f(N) \\le c \\cdot g(N)$ | **Worst-Case Upper Bound** (Guaranteed upper limit) |
| **Big-$\\Omega$ ($\\Omega$)** | $f(N) \\ge c \\cdot g(N)$ | **Best-Case Lower Bound** (Minimum possible operations) |
| **Big-$\\Theta$ ($\\Theta$)** | $c_1 \\cdot g(N) \\le f(N) \\le c_2 \\cdot g(N)$ | **Tight Bound** (Exact asymptotic behavior) |

---

## [SLIDE 4] 💻 Production Code: Two-Pointer Pair Sum
\`\`\`python
def two_sum_sorted(nums: list[int], target: int) -> tuple[int, int]:
    """
    Finds pair with sum == target in a SORTED array.
    Time Complexity: O(N) linear time
    Space Complexity: O(1) constant auxiliary space
    """
    left = 0
    right = len(nums) - 1

    while left < right:
        current_sum = nums[left] + nums[right]
        if current_sum == target:
            return (left, right)
        elif current_sum < target:
            left += 1   # Need larger sum -> move left rightward
        else:
            right -= 1  # Need smaller sum -> move right leftward

    raise ValueError("No two elements sum to target.")
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Ignoring Auxiliary Space:** In recursive algorithms, stack frames consume $O(D)$ space where $D$ is the maximum recursion depth.
2. **Assuming $O(N)$ for string concatenation in loops:** In many languages, \`s += char\` inside a loop of length $N$ takes $O(N^2)$ because strings are copied each time!

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the average and worst-case time complexity of QuickSort?
  * *Answer:* Average: $O(N \\log N)$; Worst-case: $O(N^2)$ when pivot selection is poor on already sorted arrays.
* **Q2:** Why is hash map lookup considered $O(1)$ amortized rather than strict $O(1)$?
  * *Answer:* Hash collisions can cause worst-case degradation to $O(N)$ unless table resizing and uniform hashing maintain sparse bucket distribution.`
    },
    {
      title: "Lecture 2: Arrays, Two Pointers & Sliding Window Patterns",
      body: `## [SLIDE 1] 🎯 Array Mastery & Windowing Techniques
Arrays provide $O(1)$ random access via contiguous memory indexing.

### 🎯 Key Learning Objectives
* Master the Two-Pointer convergence pattern.
* Implement Fixed-size and Dynamic-size Sliding Window algorithms.
* Eliminate nested $O(N^2)$ loops in sub-array problems.

---

## [SLIDE 2] 🧠 Dynamic Sliding Window Visualizer
\`\`\`text
Window: [Left ... Right] expands until condition breaks, then Left contracts.
Target: Sum >= K

Array:  [ 2,  3,  1,  2,  4,  3 ]
Step 1: [ 2,  3,  1,  2 ]           Sum = 8 (>= 7) -> MinLen = 4 -> Contract Left
Step 2:     [ 3,  1,  2,  4 ]       Sum = 10 (>= 7) -> MinLen = 4 -> Contract Left
Step 3:         [ 1,  2,  4 ]       Sum = 7  (>= 7) -> MinLen = 3 -> Contract Left
Step 4:             [ 4,  3 ]       Sum = 7  (>= 7) -> MinLen = 2! (Optimal)
\`\`\`

---

## [SLIDE 3] 🏗️ Pattern Selector Matrix
| Pattern | When to Use | Typical Complexity |
| :--- | :--- | :--- |
| **Converging Pointers** | Sorted array, finding pairs/triplets, reversing | $O(N)$ time, $O(1)$ space |
| **Fast & Slow Pointers** | Cycle detection, finding linked list middle | $O(N)$ time, $O(1)$ space |
| **Fixed Sliding Window** | Subarray of exact length $K$ (max sum, averages) | $O(N)$ time, $O(1)$ space |
| **Dynamic Sliding Window** | Shortest/longest subarray satisfying condition | $O(N)$ time, $O(K)$ space |

---

## [SLIDE 4] 💻 Production Code: Minimum Size Subarray Sum
\`\`\`python
def min_subarray_len(target: int, nums: list[int]) -> int:
    """Finds minimal length of contiguous subarray whose sum >= target."""
    left = 0
    current_sum = 0
    min_len = float("inf")

    for right in range(len(nums)):
        current_sum += nums[right]

        # Shrink window from the left as long as sum >= target
        while current_sum >= target:
            min_len = min(min_len, right - left + 1)
            current_sum -= nums[left]
            left += 1

    return int(min_len) if min_len != float("inf") else 0
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Off-by-One in Window Length:** Window length is \`right - left + 1\`, NOT \`right - left\`.
2. **Negative Numbers in Sliding Window:** Standard sliding window assumes monotonic growth (positive numbers). If numbers can be negative, use Prefix Sums with Hash Maps instead!

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** Why does the sliding window technique run in $O(N)$ time when there is a nested \`while\` loop inside the \`for\` loop?
  * *Answer:* Because each pointer (\`left\` and \`right\`) traverses each element at most once. Total pointer movements $\\le 2N$.
* **Q2:** How do you find the middle of a linked list in a single pass?
  * *Answer:* Use fast and slow pointers: slow advances by 1 step while fast advances by 2 steps. When fast reaches the end, slow is at the middle.`
    },
    {
      title: "Lecture 3: Linked Lists & The LRU Cache Architecture",
      body: `## [SLIDE 1] 🎯 Linked Structures & Pointer Mechanics
Unlike arrays, linked lists allow $O(1)$ node insertion and deletion without shifting elements in memory.

### 🎯 Key Learning Objectives
* Master Singly vs Doubly Linked Lists with Sentinel (Dummy) nodes.
* Reverse a Linked List iteratively and recursively.
* Combine Doubly Linked Lists with Hash Maps to build an LRU Cache.

---

## [SLIDE 2] 🧠 LRU Cache Architecture (Hash Map + Doubly-Linked List)
\`\`\`text
Hash Map:
[ Key "A" ] ──► Node A
[ Key "B" ] ──► Node B

Doubly-Linked List:
[ Dummy HEAD ] <──> [ Most Recently Used ] <──> ... <──> [ Least Recently Used ] <──> [ Dummy TAIL ]
\`\`\`
* **\`get(key)\`**: Hash map finds node in $O(1)$ ──> Move node to HEAD in $O(1)$.
* **\`put(key, val)\`**: Insert at HEAD in $O(1)$ ──> If capacity exceeded, remove TAIL.prev in $O(1)$.

---

## [SLIDE 3] 🏗️ Sentinel (Dummy) Head/Tail Pattern
Using dummy head and tail nodes eliminates annoying null checks for edge cases:
* Inserting into an empty list.
* Deleting the only remaining element.
* Updating head or tail references.

---

## [SLIDE 4] 💻 Production Code: LRU Cache Implementation
\`\`\`python
class Node:
    def __init__(self, key: int = 0, val: int = 0):
        self.key, self.val = key, val
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.cache = {}  # key -> Node
        self.head, self.tail = Node(), Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def _remove(self, node: Node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _insert(self, node: Node):
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key in self.cache:
            node = self.cache[key]
            self._remove(node)
            self._insert(node)
            return node.val
        return -1

    def put(self, key: int, value: int):
        if key in self.cache:
            self._remove(self.cache[key])
        node = Node(key, value)
        self.cache[key] = node
        self._insert(node)
        if len(self.cache) > self.cap:
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Losing Pointer References:** When reversing a linked list, saving \`next_node = curr.next\` BEFORE altering \`curr.next = prev\` is mandatory.
2. **Memory Leaks in C/C++:** When deleting a node from a linked list, always preserve pointers before calling \`free()\`.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the primary disadvantage of a linked list compared to an array?
  * *Answer:* Lack of $O(1)$ random access (requires $O(N)$ sequential traversal) and poor CPU cache locality due to non-contiguous node allocations.
* **Q2:** Why does an LRU Cache use a Doubly-Linked List instead of a Singly-Linked List?
  * *Answer:* Doubly-linked lists allow removing a node in $O(1)$ because each node has direct access to its \`prev\` pointer.`
    },
    {
      title: "Lecture 4: Stacks, Queues & Monotonic Stack Algorithms",
      body: `## [SLIDE 1] 🎯 LIFO vs FIFO & Monotonic Sequences
Stacks (Last-In, First-Out) and Queues (First-In, First-Out) govern execution call stacks, breadth-first searches, and parsing engines.

### 🎯 Key Learning Objectives
* Implement stacks and circular queues.
* Master the Monotonic Stack pattern for "Next Greater Element" problems.
* Parse nested balanced parentheses and mathematical ASTs.

---

## [SLIDE 2] 🧠 Monotonic Stack Visualizer
\`\`\`text
Goal: Find Next Greater Element for: [ 2, 1, 2, 4, 3 ]
Stack maintains strictly decreasing values.

Item: 2 -> Stack: [2]
Item: 1 -> Stack: [2, 1]
Item: 2 -> Pops 1 (2 is greater than 1!) -> Stack: [2, 2]
Item: 4 -> Pops 2, Pops 2 (4 is greater than both!) -> Stack: [4]
Item: 3 -> Stack: [4, 3]
\`\`\`

---

## [SLIDE 3] 🏗️ Stack Complexity Guarantees
| Operation | List (Stack) | deque (Queue) |
| :--- | :--- | :--- |
| **Push / Enqueue** | $O(1)$ amortized | $O(1)$ |
| **Pop / Dequeue** | $O(1)$ at end | $O(1)$ at either end |
| **Peek Top** | $O(1)$ | $O(1)$ |

---

## [SLIDE 4] 💻 Production Code: Daily Temperatures (Monotonic Stack)
\`\`\`python
def daily_temperatures(temperatures: list[int]) -> list[int]:
    """Returns number of days until a warmer temperature occurs."""
    n = len(temperatures)
    answer = [0] * n
    stack = []  # Stores indices of temperatures

    for curr_day, curr_temp in enumerate(temperatures):
        # Pop previous days that are colder than today
        while stack and temperatures[stack[-1]] < curr_temp:
            prev_day = stack.pop()
            answer[prev_day] = curr_day - prev_day
        stack.append(curr_day)

    return answer
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Using \`list.pop(0)\` for Queues:** In Python, \`list.pop(0)\` shifts all remaining elements in memory ($O(N)$). Always use \`collections.deque\` for $O(1)$ pops from the left!
2. **Storing Values instead of Indices:** In monotonic stacks, storing indices allows you to calculate both the values and the distance between elements.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is a monotonic stack?
  * *Answer:* A stack whose elements are always strictly increasing or strictly decreasing from bottom to top.
* **Q2:** How can you implement a queue using two stacks?
  * *Answer:* Push incoming items onto Stack 1. For dequeue, pop from Stack 2; if Stack 2 is empty, pop all items from Stack 1 into Stack 2 (reversing order) and then pop.`
    },
    {
      title: "Lecture 5: Recursion, Divide & Conquer & Binary Search",
      body: `## [SLIDE 1] 🎯 Recursive Thinking & Logarithmic Search
Binary search reduces search spaces by 50% at each step, operating in $O(\\log N)$ time.

### 🎯 Key Learning Objectives
* Understand Call Stack mechanics, Base Cases, and Recursion Trees.
* Master the Master Theorem for Divide-and-Conquer analysis.
* Implement bug-free Binary Search and search-on-answer patterns.

---

## [SLIDE 2] 🧠 Binary Search Decision Tree
\`\`\`text
Array: [ 1,  3,  5,  7,  9,  11,  13,  15 ]  (Target = 11)
Step 1: Mid = 7  (7 < 11) ──► Eliminate Left Half! Search: [ 9, 11, 13, 15 ]
Step 2: Mid = 11 (11 == 11) ──► Target Found at Index 5!

Comparisons needed for 1,000,000 items: at most 20 comparisons!
\`\`\`

---

## [SLIDE 3] 🏗️ The Master Theorem
For recurrences of the form $T(N) = a T(N/b) + O(N^d)$:
* If $d < \\log_b a$, then $T(N) = O(N^{\\log_b a})$.
* If $d = \\log_b a$, then $T(N) = O(N^d \\log N)$ (e.g., MergeSort: $a=2, b=2, d=1 \\implies O(N \\log N)$).
* If $d > \\log_b a$, then $T(N) = O(N^d)$.

---

## [SLIDE 4] 💻 Production Code: Binary Search on Answer
\`\`\`python
def min_eating_speed(piles: list[int], h: int) -> int:
    """
    Koko Eating Bananas: Find minimum integer speed k to eat all bananas within h hours.
    Search Space: [1, max(piles)]
    """
    import math

    def can_finish(speed: int) -> bool:
        hours = sum(math.ceil(p / speed) for p in piles)
        return hours <= h

    left = 1
    right = max(piles)
    ans = right

    while left <= right:
        mid = (left + right) // 2
        if can_finish(mid):
            ans = mid
            right = mid - 1  # Try slower speed
        else:
            left = mid + 1   # Must eat faster

    return ans
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Integer Overflow in Mid Calculation:** In C/C++/Java, writing \`(left + right) / 2\` can overflow 32-bit integers if both are large! Write \`left + (right - left) / 2\` instead.
2. **Infinite Loops on Boundaries:** Ensure loop condition \`left <= right\` aligns with \`left = mid + 1\` and \`right = mid - 1\`.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the base case in a recursive function?
  * *Answer:* The terminating condition that produces an immediate result without making further recursive calls, preventing infinite recursion and stack overflow.
* **Q2:** Can binary search be applied to an unsorted array?
  * *Answer:* No, binary search requires the search space to be monotonic (sorted) or have a monotonic predicate function.`
    },
    {
      title: "Lecture 6: Binary Trees, Binary Search Trees (BST) & Traversals",
      body: `## [SLIDE 1] 🎯 Hierarchical Structures & Tree Traversals
Trees model hierarchical relationships: file systems, DOM trees, database indexes, and decision trees.

### 🎯 Key Learning Objectives
* Understand Depth-First Search (DFS): Pre-order, In-order, Post-order.
* Implement Breadth-First Search (BFS) level-order traversal using queues.
* Master Binary Search Tree (BST) invariants and balance validation.

---

## [SLIDE 2] 🧠 Tree Traversals Visualizer
\`\`\`text
         (4)
        /   \\
      (2)   (6)
     /  \\   /  \\
   (1)  (3)(5) (7)

* In-Order (Left, Root, Right):   [ 1, 2, 3, 4, 5, 6, 7 ]  <-- ALWAYS SORTED IN BST!
* Pre-Order (Root, Left, Right):  [ 4, 2, 1, 3, 6, 5, 7 ]  <-- Serialization
* Post-Order (Left, Right, Root): [ 1, 3, 2, 5, 7, 6, 4 ]  <-- Bottom-up cleanup / math AST
* Level-Order (BFS):              [ 4, 2, 6, 1, 3, 5, 7 ]
\`\`\`

---

## [SLIDE 3] 🏗️ BST Invariant Validation
A tree is a valid BST if and only if:
$$\\forall \\text{ node}, \\quad \\text{low} < \\text{node.val} < \\text{high}$$
Checking only immediate parent-child relationships is an exam trap!

---

## [SLIDE 4] 💻 Production Code: Validate Binary Search Tree
\`\`\`python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def is_valid_bst(root: TreeNode | None) -> bool:
    """Validates BST using range boundary recursion."""
    def validate(node: TreeNode | None, low: float, high: float) -> bool:
        if not node:
            return True
        if not (low < node.val < high):
            return False
        return validate(node.left, low, node.val) and validate(node.right, node.val, high)

    return validate(root, float("-inf"), float("inf"))
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Local vs Global BST Invariant:** Verifying \`node.left.val < node.val\` is NOT enough! An element in the right subtree could be smaller than a grandparent node. Always pass \`(min_allowed, max_allowed)\` down the tree.
2. **Unbalanced BST Worst-Case:** An unbalance BST (skewed list) degrades from $O(\\log N)$ to $O(N)$ operations! Self-balancing trees (AVL, Red-Black) maintain height $\\le 2 \\log N$.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** Which traversal of a BST produces elements in strictly ascending order?
  * *Answer:* In-order traversal (Left $\\to$ Root $\\to$ Right).
* **Q2:** What data structure is used to implement Level-Order (BFS) traversal of a tree?
  * *Answer:* A Queue (FIFO).`
    },
    {
      title: "Lecture 7: Graph Algorithms: BFS, DFS, Dijkstra & Topological Sort",
      body: `## [SLIDE 1] 🎯 Networks, Graphs & Shortest Paths
Graphs represent arbitrary interconnected networks: social connections, road maps, web link graphs, and task dependency pipelines.

### 🎯 Key Learning Objectives
* Model graphs using Adjacency Lists and Adjacency Matrices.
* Implement Breadth-First Search (BFS) for unweighted shortest paths.
* Master Dijkstra's Algorithm with Min-Heap for weighted graphs.
* Implement Topological Sort (Kahn's Algorithm) for task dependencies.

---

## [SLIDE 2] 🧠 Dijkstra's Algorithm Pipeline
\`\`\`text
Priority Queue (Min-Heap): Stores (current_distance, node)
Relaxation Formula:
if dist[u] + weight(u, v) < dist[v]:
    dist[v] = dist[u] + weight(u, v)
    heap.push( (dist[v], v) )
\`\`\`
Time Complexity: $O((V + E) \\log V)$ using binary min-heap.

---

## [SLIDE 3] 🏗️ Graph Representation Comparison
| Format | Storage Space | Check Edge $(u, v)$ | Iterate Neighbors of $u$ |
| :--- | :--- | :--- | :--- |
| **Adjacency Matrix** | $O(V^2)$ | $O(1)$ | $O(V)$ |
| **Adjacency List** | $O(V + E)$ | $O(\\text{deg}(u))$ | $O(\\text{deg}(u))$ [Optimal!] |

---

## [SLIDE 4] 💻 Production Code: Dijkstra Shortest Path
\`\`\`python
import heapq

def dijkstra(n: int, edges: list[tuple[int, int, int]], start: int) -> dict[int, int]:
    """Computes shortest path from start node to all reachable nodes."""
    # Build Adjacency List: node -> list of (neighbor, weight)
    graph = {i: [] for i in range(n)}
    for u, v, w in edges:
        graph[u].append((v, w))
        graph[v].append((u, w)) # Undirected graph

    distances = {i: float("inf") for i in range(n)}
    distances[start] = 0
    pq = [(0, start)]  # (distance, node)

    while pq:
        curr_dist, u = heapq.heappop(pq)
        if curr_dist > distances[u]:
            continue  # Outdated entry in heap

        for v, weight in graph[u]:
            new_dist = curr_dist + weight
            if new_dist < distances[v]:
                distances[v] = new_dist
                heapq.heappush(pq, (new_dist, v))

    return distances
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Negative Weights in Dijkstra:** Dijkstra fails on graphs with negative edge weights because it greedily finalizes nodes! Use the Bellman-Ford algorithm ($O(V \\cdot E)$) instead.
2. **Cycles in Topological Sort:** If a graph contains a directed cycle, topological sort is impossible! Kahn's algorithm detects cycles if the count of sorted nodes $< V$.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** When is BFS preferred over DFS for finding the shortest path?
  * *Answer:* When the graph is unweighted (all edges have identical cost 1).
* **Q2:** What does a Topological Sort represent?
  * *Answer:* A linear ordering of vertices in a Directed Acyclic Graph (DAG) such that for every directed edge $u \\to v$, vertex $u$ comes before vertex $v$.`
    },
    {
      title: "Lecture 8: Dynamic Programming: Memoization, Tabulation & Knapsack",
      body: `## [SLIDE 1] 🎯 Dynamic Programming: Breaking Complexity Barriers
Dynamic Programming (DP) solves complex problems by breaking them into overlapping subproblems and storing intermediate answers to prevent redundant calculations.

### 🎯 Key Learning Objectives
* Identify Optimal Substructure and Overlapping Subproblems.
* Compare Top-Down (Memoization) vs Bottom-Up (Tabulation).
* Solve 0/1 Knapsack, Coin Change, and Longest Common Subsequence (LCS).

---

## [SLIDE 2] 🧠 Recursion Tree vs DP Cache
\`\`\`text
Fibonacci(5) without DP:
                    fib(5)
              /                \\
          fib(4)              fib(3)        (Notice redundant calculations!)
         /      \\            /      \\
      fib(3)    fib(2)     fib(2)   fib(1)
     /      \\
   fib(2)  fib(1)
Total calls: O(2^N) [Exponential Explosion!]

With DP Memoization:
Calculate fib(1), fib(2), fib(3), fib(4), fib(5) exactly ONCE!
Total calls: O(N) [Linear Time!]
\`\`\`

---

## [SLIDE 3] 🏗️ The 0/1 Knapsack State Recurrence
Given $N$ items with weights $w_i$ and values $v_i$, and knapsack capacity $W$:
$$\\text{DP}[i][c] = \\max(\\text{DP}[i-1][c], \\, \\text{DP}[i-1][c - w_i] + v_i)$$

---

## [SLIDE 4] 💻 Production Code: Coin Change (Bottom-Up Tabulation)
\`\`\`python
def coin_change(coins: list[int], amount: int) -> int:
    """Finds fewest coins needed to make up amount. Returns -1 if impossible."""
    # dp[i] represents minimum coins to make amount i
    dp = [float("inf")] * (amount + 1)
    dp[0] = 0

    for coin in coins:
        for a in range(coin, amount + 1):
            dp[a] = min(dp[a], dp[a - coin] + 1)

    return int(dp[amount]) if dp[amount] != float("inf") else -1
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **0/1 Knapsack vs Unbounded Knapsack:** In 0/1 Knapsack (each item can be used at most once), the inner loop must traverse capacities **backwards** (\`W\` down to \`w_i\`) to avoid reusing the same item multiple times in 1D array optimization!
2. **State Base Cases:** Forgetting to initialize \`dp[0] = 0\` or boundary conditions will produce incorrect answers or runtime errors.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What two properties must a problem have to be solvable using Dynamic Programming?
  * *Answer:* Overlapping subproblems and optimal substructure.
* **Q2:** How can you optimize space in a 2D DP table where $\\text{DP}[i]$ only depends on $\\text{DP}[i-1]$?
  * *Answer:* Maintain only two 1D rows (previous and current) or a single 1D array, reducing space complexity from $O(N \\cdot W)$ to $O(W)$.`
    }
  ],
  dailyLessons: [
    {
      dayNumber: 1,
      title: "Asymptotic Analysis: Big-O, Big-Omega, Big-Theta",
      subtasks: [
        "Calculate time complexity of nested and independent loops",
        "Plot complexity growth curves on Desmos (log N, N, N log N, N^2, 2^N)",
        "Differentiate worst-case Big-O from average-case Big-Theta",
        "Analyze space complexity and recursion stack memory overhead"
      ],
      notes: "# Asymptotic Analysis\\n\\nBig-O represents the upper bound on worst-case execution time."
    },
    {
      dayNumber: 2,
      title: "Array Two-Pointers: Sorted Pair Sum & In-Place Removal",
      subtasks: [
        "Implement two-sum on sorted array in O(N) using converging pointers",
        "Solve remove-duplicates from sorted array in-place in O(1) space",
        "Implement container with most water algorithm",
        "Trace pointer moves step-by-step with edge cases"
      ],
      notes: "# Two Pointers Technique\\n\\nConverging pointers exploit sorted monotonic properties."
    },
    {
      dayNumber: 3,
      title: "Sliding Window: Fixed Size & Maximum Subarray of Size K",
      subtasks: [
        "Implement maximum sum subarray of size K in O(N) time",
        "Maintain running sum by adding incoming element and subtracting outgoing element",
        "Avoid O(N*K) brute force recomputations",
        "Handle edge case where array length is less than K"
      ],
      notes: "# Fixed Sliding Window\\n\\nUpdate running state incrementally instead of re-summing."
    },
    {
      dayNumber: 4,
      title: "Sliding Window: Dynamic Size & Longest Substring Without Repeating Characters",
      subtasks: [
        "Implement dynamic sliding window using Hash Map character frequency counter",
        "Contract left boundary when duplicate character is encountered",
        "Update maximum window length dynamically at each step",
        "Benchmark O(N) sliding window against O(N^2) brute force"
      ],
      notes: "# Dynamic Sliding Window\\n\\nExpand right boundary and shrink left boundary to satisfy invariant."
    },
    {
      dayNumber: 5,
      title: "Prefix Sums: Range Sum Query & 2D Matrix Sub-block Sums",
      subtasks: [
        "Construct 1D prefix sum array for O(1) range sum queries",
        "Build 2D prefix sum table for instant submatrix queries",
        "Solve Subarray Sum Equals K using prefix sums and Hash Map in O(N)",
        "Validate zero-index boundary offsets"
      ],
      notes: "# Prefix Sum Technique\\n\\nPrefix sums precompute cumulative values for instant range queries."
    },
    {
      dayNumber: 6,
      title: "Fast & Slow Pointers: Floyd's Cycle Detection Algorithm",
      subtasks: [
        "Implement slow pointer (1 step) and fast pointer (2 steps)",
        "Prove mathematically why fast and slow pointers must meet if cycle exists",
        "Find entry node of linked list cycle",
        "Complete Week 1 Project: High-Throughput LRU Cache & Doubly-Linked List"
      ],
      notes: "# Floyd's Tortoise and Hare\\n\\nDetects cycles in sequences without auxiliary memory allocation."
    },
    {
      dayNumber: 7,
      title: "Linked Lists: Sentinel Nodes, Insertion, Deletion & Traversal",
      subtasks: [
        "Design ListNode class with pointer references",
        "Use dummy sentinel node to simplify head insertion and deletion logic",
        "Implement delete-node without previous pointer reference",
        "Traverse linked list and print values safely"
      ],
      notes: "# Linked List Fundamentals\\n\\nSentinel dummy nodes eliminate null pointer boundary errors."
    },
    {
      dayNumber: 8,
      title: "Linked Lists: In-Place Reversal & Merge Two Sorted Lists",
      subtasks: [
        "Reverse a singly linked list in-place iteratively in O(N) time and O(1) space",
        "Trace prev, curr, and next pointer reassignments",
        "Implement recursive reversal of linked list",
        "Merge two sorted linked lists using two pointers into single sorted chain"
      ],
      notes: "# In-Place Reversal\\n\\nMaintain three pointers (`prev`, `curr`, `next`) to flip direction without losing rest of list."
    },
    {
      dayNumber: 9,
      title: "Stacks: Balanced Parentheses & Postfix Expression Evaluation",
      subtasks: [
        "Validate balanced parentheses ((), [], {}) using stack",
        "Convert infix mathematical notation to Reverse Polish Notation (RPN)",
        "Evaluate RPN postfix expressions using stack in O(N) time",
        "Handle invalid expression edge cases and empty stack pops"
      ],
      notes: "# Stacks & Parsing\\n\\nStacks naturally model nested hierarchical syntax and operator precedence."
    },
    {
      dayNumber: 10,
      title: "Monotonic Stack: Next Greater Element & Daily Temperatures",
      subtasks: [
        "Understand monotonic stack invariant (strictly decreasing or increasing)",
        "Implement Next Greater Element in O(N) linear time",
        "Solve Daily Temperatures problem storing indices in stack",
        "Calculate element spans using stack index differences"
      ],
      notes: "# Monotonic Stacks\\n\\nFinds nearest greater or smaller elements in linear time."
    },
    {
      dayNumber: 11,
      title: "Queues: Circular Queue & Breadth-First Traversal Pipeline",
      subtasks: [
        "Implement fixed-size circular queue with array and modulo arithmetic",
        "Maintain front and rear pointers to support O(1) enqueue and dequeue",
        "Compare circular array queue vs linked list queue memory locality",
        "Implement queue-based task processing pipeline"
      ],
      notes: "# Queue Systems\\n\\nCircular buffers use modulo indexing `(rear + 1) % capacity` for fixed-memory FIFOs."
    },
    {
      dayNumber: 12,
      title: "Monotonic Deque: Sliding Window Maximum",
      subtasks: [
        "Understand double-ended queue (deque) operations",
        "Maintain monotonic decreasing deque of indices",
        "Evict elements outside current sliding window boundary in O(1)",
        "Complete Week 2 Project: Expression Evaluator & Monotonic Stack Engine"
      ],
      notes: "# Monotonic Deque\\n\\nMaintains sliding window maximum/minimum in amortized $O(1)$ per step."
    },
    {
      dayNumber: 13,
      title: "Binary Search: Invariants, Boundary Conditions & Template",
      subtasks: [
        "Implement standard binary search with left <= right loop condition",
        "Use left + (right - left) // 2 to prevent integer overflow",
        "Find first and last occurrence (leftmost and rightmost bounds)",
        "Search in rotated sorted array in O(log N) time"
      ],
      notes: "# Binary Search Template\\n\\nAlways adhere strictly to boundary update rules to prevent infinite loops."
    },
    {
      dayNumber: 14,
      title: "Binary Search on Answer: Capacity to Ship Packages & Peak Elements",
      subtasks: [
        "Identify monotonic search spaces for optimization problems",
        "Implement feasibility verification function can_ship(capacity)",
        "Solve Capacity to Ship Packages within D Days in O(N log(Sum - Max))",
        "Find peak element in mountain array using binary search"
      ],
      notes: "# Binary Search on Answer\\n\\nIf feasibility is monotonic (`False, False, ..., True, True`), binary search finds the optimal boundary."
    },
    {
      dayNumber: 15,
      title: "Binary Trees: Tree Traversals (DFS: In-order, Pre-order, Post-order)",
      subtasks: [
        "Implement recursive in-order, pre-order, and post-order traversals",
        "Implement iterative DFS using explicit stack",
        "Calculate maximum depth and diameter of binary tree",
        "Serialize and deserialize binary tree into string format"
      ],
      notes: "# Depth-First Tree Traversals\\n\\nPre-order visits root first; in-order yields sorted order on BSTs; post-order cleans bottom-up."
    },
    {
      dayNumber: 16,
      title: "Binary Trees: Level-Order Traversal (BFS) & Lowest Common Ancestor",
      subtasks: [
        "Implement level-order traversal using queue tracking level sizes",
        "Print zigzag level order traversal",
        "Find Lowest Common Ancestor (LCA) in binary tree using bottom-up recursion",
        "Check if tree is height-balanced (AVL condition)"
      ],
      notes: "# Breadth-First Tree Traversals\\n\\nProcess trees level-by-level using a FIFO queue."
    },
    {
      dayNumber: 17,
      title: "Binary Search Trees (BST): Insertion, Deletion & Validation",
      subtasks: [
        "Search for value in BST in O(h) time",
        "Insert new node while preserving BST invariant",
        "Delete node handling 0, 1, and 2 children (finding in-order successor)",
        "Validate BST using min/max range recursion"
      ],
      notes: "# Binary Search Tree Operations\\n\\nDeletion of a node with two children requires replacing it with its in-order successor."
    },
    {
      dayNumber: 18,
      title: "Tries (Prefix Trees): Autocomplete & Word Dictionary",
      subtasks: [
        "Design TrieNode with children hash map and is_end_of_word boolean",
        "Implement insert(word), search(word), and starts_with(prefix)",
        "Analyze Trie space complexity vs hash set",
        "Complete Week 3 Project: Trie Autocomplete Engine & Dependency Graph"
      ],
      notes: "# Trie (Prefix Tree)\\n\\nTries provide $O(L)$ prefix lookups where $L$ is word length, independent of dictionary size."
    },
    {
      dayNumber: 19,
      title: "Heaps & Priority Queues: Binary Min-Heap & Top-K Elements",
      subtasks: [
        "Understand complete binary tree array representation (parent = (i-1)//2)",
        "Implement heapify-up and heapify-down operations",
        "Find Kth largest element in array using min-heap of size K in O(N log K)",
        "Merge K sorted linked lists using priority queue"
      ],
      notes: "# Heaps & Priority Queues\\n\\nMaintains dynamic min/max element with $O(1)$ peek and $O(\\log N)$ insertion/extraction."
    },
    {
      dayNumber: 20,
      title: "Graph Traversal: BFS & DFS on Adjacency Lists",
      subtasks: [
        "Build adjacency list representation from edge list",
        "Implement graph BFS with visited set to prevent infinite cycle loops",
        "Implement graph DFS iteratively and recursively",
        "Count number of connected components and islands in 2D grid"
      ],
      notes: "# Graph Traversals\\n\\nAlways maintain a `visited` set to avoid infinite loops in cyclic graphs."
    },
    {
      dayNumber: 21,
      title: "Graph Algorithms: Topological Sort (Kahn's Algorithm) & Cycle Detection",
      subtasks: [
        "Calculate in-degrees for all nodes in Directed Graph",
        "Initialize queue with all nodes having in-degree 0",
        "Process nodes and decrement neighbors' in-degrees (Kahn's algorithm)",
        "Detect cycles in directed graph when processed node count < total vertices"
      ],
      notes: "# Topological Sorting\\n\\nKahn's algorithm resolves task dependency orders in DAGs."
    },
    {
      dayNumber: 22,
      title: "Graph Algorithms: Dijkstra's Shortest Path with Min-Heap",
      subtasks: [
        "Implement Dijkstra's algorithm using priority queue (min-heap)",
        "Perform edge relaxation: if d[u] + w < d[v] then update d[v]",
        "Track parent pointers to reconstruct exact shortest path coordinates",
        "Benchmark Dijkstra against unweighted BFS"
      ],
      notes: "# Dijkstra's Algorithm\\n\\nComputes shortest path in non-negative weighted graphs in $O((V + E) \\log V)$."
    },
    {
      dayNumber: 23,
      title: "Dynamic Programming: 1D Problems (Climbing Stairs, House Robber, Coin Change)",
      subtasks: [
        "Formulate state transition recurrence for House Robber: dp[i] = max(dp[i-1], dp[i-2] + nums[i])",
        "Optimize space complexity from O(N) array to two variables O(1)",
        "Solve Coin Change using bottom-up tabulation",
        "Solve Longest Increasing Subsequence (LIS) in O(N^2) and O(N log N) via Patience Sorting"
      ],
      notes: "# 1D Dynamic Programming\\n\\nIdentify the state variable and formulate the recurrence relation."
    },
    {
      dayNumber: 24,
      title: "Dynamic Programming: 2D Grid Problems & Capstone Review",
      subtasks: [
        "Solve Unique Paths in 2D grid with obstacles using tabulation",
        "Implement 0/1 Knapsack with 1D space optimization",
        "Solve Longest Common Subsequence (LCS) string alignment",
        "Complete Week 4 Capstone: Real-Time Dijkstra Shortest Path & DP Optimizer"
      ],
      notes: "# Algorithmic Mastery\\n\\nCongratulations! You have mastered the core data structures and algorithm design paradigms."
    }
  ]
});

// 4. FULLSTACK WEB DEVELOPMENT & REACT
writeCatalog('web-react.ts', {
  id: "web-react",
  aliases: ["react", "web", "web dev", "frontend", "fullstack", "javascript", "typescript", "nextjs"],
  subject: {
    name: "Fullstack Web Development & React",
    description: "Modern JavaScript/TypeScript, React 19 architecture, Virtual DOM, state management, REST APIs, and fullstack deployment.",
    color: "#06B6D4",
    icon: "globe"
  },
  assignments: [
    {
      title: "Week 1 Project: Interactive Responsive Kanban Board in TypeScript",
      description: "Build a drag-and-drop Kanban task board using native DOM events, strict TypeScript interfaces, and LocalStorage persistence.",
      daysDue: 7
    },
    {
      title: "Week 2 Project: Real-Time Weather & Air Quality Dashboard in React",
      description: "Implement a responsive React application with custom hooks, debounce search, live OpenWeather API integration, and skeleton loading states.",
      daysDue: 14
    },
    {
      title: "Week 3 Project: Production E-Commerce Cart with Context API & React Query",
      description: "Architect shopping cart state management, checkout simulation, optimistic UI mutations, and server caching using TanStack React Query.",
      daysDue: 21
    },
    {
      title: "Week 4 Capstone: Fullstack Collaborative Study App with Auth & WebSockets",
      description: "Deliver a fullstack application with JWT authentication, REST endpoints, real-time WebSocket messaging, and cloud deployment.",
      daysDue: 28
    }
  ],
  resources: [
    {
      type: "youtube",
      title: "React Course - Beginner's Tutorial for React (freeCodeCamp)",
      url: "https://www.youtube.com/watch?v=bMknfKXIFA8",
      providerItemId: "bMknfKXIFA8"
    },
    {
      type: "youtube",
      title: "React Tutorial for Beginners (Web Dev Simplified)",
      url: "https://www.youtube.com/watch?v=SqcY0GlETPk",
      providerItemId: "SqcY0GlETPk"
    },
    {
      type: "youtube",
      title: "React JS Crash Course (Traversy Media)",
      url: "https://www.youtube.com/watch?v=w7ejDZ8SWv8",
      providerItemId: "w7ejDZ8SWv8"
    },
    {
      type: "web",
      title: "React Official Documentation - Learn React",
      url: "https://react.dev/learn",
      providerItemId: null
    },
    {
      type: "web",
      title: "MDN Web Docs - JavaScript Guide",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
      providerItemId: null
    }
  ],
  lectureDecks: [
    {
      title: "Lecture 1: Modern JavaScript & TypeScript Foundations for React",
      body: `## [SLIDE 1] 🎯 Course Objectives & The Modern Web Ecosystem
Welcome to Fullstack Web Development & React! The modern web relies on asynchronous event-driven JavaScript/TypeScript powering reactive user interfaces.

### 🎯 Key Learning Objectives
* Master the JavaScript Event Loop, Microtask Queue, and Promises.
* Utilize ES6+ features: Destructuring, Spread/Rest, Modules, and Closures.
* Implement strict TypeScript interfaces, generics, and union types.

💡 **Professor's Tip:** React does not replace JavaScript—it **leverages** JavaScript closures and pure functions to manage UI state declaratively!

---

## [SLIDE 2] 🧠 The JavaScript Event Loop Visualizer
\`\`\`text
Call Stack (Synchronous Code)
      │
      ▼
Web APIs (setTimeout, fetch, DOM events)
      │
      ├──► Microtask Queue (Promise callbacks, queueMicrotask) [Highest Priority!]
      │
      └──► Macrotask Queue (setTimeout, setInterval, I/O)
\`\`\`
The Event Loop continuously checks: if the Call Stack is empty, flush the entire Microtask Queue before processing the next Macrotask!

---

## [SLIDE 3] 🏗️ TypeScript Type Safety Spectrum
| Concept | JavaScript | TypeScript |
| :--- | :--- | :--- |
| **Type Checking** | Runtime only (Bugs hit users in production!) | Compile-time static analysis (Caught in IDE) |
| **Interfaces & Types** | Not supported | Full structural typing contracts |
| **Generics** | Implicit dynamic objects | Type-safe reusable pipelines (\`T\`) |

---

## [SLIDE 4] 💻 Production Code: Type-Safe Async API Client
\`\`\`typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "student" | "instructor" | "admin";
}

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const response = await fetch(\`/api/users/\${encodeURIComponent(userId)}\`);
  if (!response.ok) {
    throw new Error(\`HTTP Error \${response.status}: Failed to fetch user.\`);
  }
  const payload: ApiResponse<UserProfile> = await response.json();
  return payload.data;
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Mutating State In-Place:** Writing \`arr.push(item)\` mutates the existing array reference. React will NOT re-render because \`oldArr === newArr\`! Always return a new reference: \`[...arr, item]\`.
2. **Double Render in Strict Mode:** In development, React renders components twice to detect side-effects in render loops. Never perform network calls or mutations directly in the component body!

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the difference between \`==\` and \`===\` in JavaScript?
  * *Answer:* \`==\` performs loose equality with implicit type coercion; \`===\` performs strict equality checking both value and type without coercion.
* **Q2:** Why are React component state variables immutable?
  * *Answer:* Immutability allows React to perform shallow reference comparisons ($O(1)$) to quickly determine whether a re-render is required.`
    },
    {
      title: "Lecture 2: The Virtual DOM, React 19 Fiber Architecture & Reconciliation",
      body: `## [SLIDE 1] 🎯 Reconciliation & The Virtual DOM
Direct DOM manipulations (\`document.createElement\`, \`appendChild\`) are expensive operations that trigger browser layout recalibration and repainting.

### 🎯 Key Learning Objectives
* Understand the Virtual DOM tree and diffing algorithm.
* Master the React 19 Fiber architecture and concurrent rendering.
* Explain why \`key\` props are mandatory in lists for element stability.

---

## [SLIDE 2] 🧠 The Reconciliation Diffing Pipeline
\`\`\`text
State Change (setCount)
      │
      ▼
New Virtual DOM Tree Generated
      │
      ▼ Diffing with Previous VDOM Tree ($O(N)$ heuristic)
Compute Minimal Set of DOM Mutations (Fiber Work Loop)
      │
      ▼ Commit Phase
Batch Update Real Browser DOM (Single Reflow / Repaint!)
\`\`\`

---

## [SLIDE 3] 🏗️ The Heuristic $O(N)$ Diffing Rules
1. **Different Element Types:** If \`<div>\` changes to \`<span>\`, React destroys the old subtree entirely and builds a new one from scratch.
2. **Keys on Lists:** Unique keys allow React to match children across renders, enabling efficient reordering without re-creating DOM nodes.

---

## [SLIDE 4] 💻 Production Code: Clean Declarative Component
\`\`\`tsx
import React, { useState } from "react";

interface CounterProps {
  initialCount?: number;
  label: string;
}

export const ModernCounter: React.FC<CounterProps> = ({ initialCount = 0, label }) => {
  const [count, setCount] = useState(initialCount);

  return (
    <div className="p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
      <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
      <p className="text-3xl font-bold tracking-tight my-2">{count}</p>
      <div className="flex gap-2">
        <button 
          onClick={() => setCount((prev) => prev + 1)}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium"
        >
          Increment
        </button>
        <button 
          onClick={() => setCount(0)}
          className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm font-medium"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Using Array Index as Key:** Using \`key={index}\` on dynamically changing lists corrupts form inputs and animation states when items are inserted or deleted. Always use unique identifiers (\`key={item.id}\`).
2. **Stale Closures:** Updating state based on current value using \`setCount(count + 1)\` multiple times inside an async function only increments once. Always use functional updates: \`setCount(prev => prev + 1)\`.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the primary purpose of the Virtual DOM?
  * *Answer:* To batch and minimize expensive direct manipulations of the browser's real DOM by calculating differences in memory.
* **Q2:** Why should \`key\` attributes be unique among sibling elements?
  * *Answer:* Keys provide identity to elements, allowing React to preserve component state and DOM nodes during list reordering.`
    },
    {
      title: "Lecture 3: React Hooks Deep Dive: useState, useEffect & useRef",
      body: `## [SLIDE 1] 🎯 State & Lifecycle with Hooks
Hooks allow functional components to maintain private state, synchronize with external systems, and persist references across renders.

### 🎯 Key Learning Objectives
* Understand how \`useState\` triggers re-render cycles.
* Master \`useEffect\` dependencies and cleanup functions.
* Persist mutable values without re-renders using \`useRef\`.

---

## [SLIDE 2] 🧠 The useEffect Synchronization Lifecycle
\`\`\`text
Component Renders ──► Browser Paints Screen ──► useEffect Runs
                              │
When Dependencies Change:      │
1. Run Cleanup Function of Previous Effect ──► 2. Run New Effect
                              │
When Component Unmounts:      │
Run Final Cleanup Function (Cancel subscriptions, clear timers, abort fetch)
\`\`\`

---

## [SLIDE 3] 🏗️ useState vs useRef Comparison
| Feature | \`useState\` | \`useRef\` |
| :--- | :--- | :--- |
| **Triggers Re-render?** | YES | NO |
| **Access Method** | Read directly: \`count\` | Read through \`.current\`: \`timerRef.current\` |
| **Primary Purpose** | UI State displayed on screen | Persistent mutable references (DOM elements, timer IDs) |

---

## [SLIDE 4] 💻 Production Code: Debounced Search Hook
\`\`\`typescript
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Schedule timer to update debounced value
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    // Cleanup: cancel timer if value changes before delay expires
    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Missing Dependency in \`useEffect\`:** Omitting values used inside the effect from the dependency array produces stale closure bugs where the effect reads outdated state.
2. **Infinite Re-render Loop:** Calling \`setState\` inside \`useEffect\` without a dependency array (or with an unstable object reference in dependencies) causes an endless re-render cycle.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** When does the cleanup function in \`useEffect\` execute?
  * *Answer:* Right before the effect runs again due to dependency changes, and when the component unmounts.
* **Q2:** Does mutating \`myRef.current\` trigger a re-render?
  * *Answer:* No, \`useRef\` persists mutable values silently across renders without triggering a re-render.`
    },
    {
      title: "Lecture 4: Performance Optimization: useMemo, useCallback & memo",
      body: `## [SLIDE 1] 🎯 Eliminating Redundant Re-Renders
Premature optimization is a trap, but high-performance React applications require strategic memoization for expensive computations and stable callbacks.

### 🎯 Key Learning Objectives
* Understand React's default re-rendering behavior (parent render triggers children).
* Cache expensive calculations with \`useMemo\`.
* Preserve function reference equality with \`useCallback\`.
* Wrap pure presentation components in \`React.memo\`.

---

## [SLIDE 2] 🧠 Reference Equality Visualizer
\`\`\`text
Parent Renders:
const handleClick = () => { ... }   <-- Creates NEW function memory reference in RAM!
ChildComponent receives props:
<ChildComponent onClick={handleClick} />  <-- Prop reference changed -> CHILD RE-RENDERS!

With useCallback:
const handleClick = useCallback(() => { ... }, []) <-- REUSES IDENTICAL REFERENCE!
ChildComponent sees identical prop reference -> RE-RENDER SKIPPED!
\`\`\`

---

## [SLIDE 3] 🏗️ Memoization Cost-Benefit Rule
* Use \`useMemo\` when:
  1. Performing computationally expensive calculations (sorting 10,000 items, complex regex).
  2. Passing an object/array as a dependency to another hook (\`useEffect\`).
* Do NOT use \`useMemo\` for:
  1. Primitive arithmetic (\`a + b\`)—the memoization overhead exceeds the calculation cost!

---

## [SLIDE 4] 💻 Production Code: Memoized Filter Component
\`\`\`tsx
import React, { useMemo, useCallback } from "react";

interface ItemListProps {
  items: Array<{ id: string; name: string; category: string }>;
  selectedCategory: string;
  onItemSelect: (id: string) => void;
}

export const FilteredItemList: React.FC<ItemListProps> = React.memo(({
  items,
  selectedCategory,
  onItemSelect
}) => {
  // Memoize filtered results to avoid re-filtering unless items or category changes
  const filteredItems = useMemo(() => {
    return items.filter(
      (item) => selectedCategory === "all" || item.category === selectedCategory
    );
  }, [items, selectedCategory]);

  return (
    <ul className="space-y-1">
      {filteredItems.map((item) => (
        <li 
          key={item.id} 
          onClick={() => onItemSelect(item.id)}
          className="p-2 hover:bg-accent rounded cursor-pointer text-sm"
        >
          {item.name}
        </li>
      ))}
    </ul>
  );
});
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Wrapping everything in \`useCallback\`:** Adding \`useCallback\` to simple inline handlers without passing them to a memoized child (\`React.memo\`) is completely useless and adds memory overhead.
2. **Missing Dependencies in \`useCallback\`:** A callback that captures state without including it in the dependency array will forever execute with initial state values!

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the difference between \`useMemo\` and \`useCallback\`?
  * *Answer:* \`useMemo\` caches the calculated result of invoking a function; \`useCallback\` caches the function definition itself.
* **Q2:** What does \`React.memo\` do?
  * *Answer:* It performs shallow comparisons of incoming props; if props haven't changed, it skips rendering that component.`
    },
    {
      title: "Lecture 5: Global State Management: Context API & TanStack React Query",
      body: `## [SLIDE 1] 🎯 Server State vs Client State
Managing data in web apps requires separating ephemeral client UI state (modals, active tabs) from asynchronous server cache state (data fetched from databases).

### 🎯 Key Learning Objectives
* Understand Prop Drilling and how Context API resolves it.
* Contrast Client State vs Server Cache State.
* Master TanStack React Query: Stale-While-Revalidate, caching, and optimistic updates.

---

## [SLIDE 2] 🧠 Server State Lifecycle (React Query)
\`\`\`text
User loads page:
1. Return cached data immediately from memory (Instant UI, no loader!)
2. Background fetch to server: GET /api/notes
3. Compare responses: If server has newer data, re-render with fresh data!
4. Mark data as "stale" after staleTime (e.g. 60 seconds).
\`\`\`

---

## [SLIDE 3] 🏗️ Client State vs Server State Architecture
| Dimension | Client State (Context / Zustand) | Server State (React Query / SWR) |
| :--- | :--- | :--- |
| **Ownership** | Purely local to user's browser | Remote source of truth in database |
| **Challenges** | Component hierarchy propagation | Network latency, cache invalidation, polling, deduplication |
| **Examples** | Dark mode toggle, sidebar collapsed | User list, academic grades, notifications |

---

## [SLIDE 4] 💻 Production Code: Type-Safe React Query Hook
\`\`\`typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export function useTasks() {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to load tasks");
      return res.json();
    },
    staleTime: 1000 * 60 * 2, // Fresh for 2 minutes
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await fetch(\`/api/tasks/\${id}\`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
    },
    onSuccess: () => {
      // Invalidate and refetch fresh tasks immediately
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return { ...tasksQuery, toggleTask };
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Using Context for Rapidly Changing Data:** Context triggers re-renders on ALL consumer components whenever its value changes. Rapidly changing values (e.g. cursor coordinates) cause severe lag in Context. Use Zustand or signals instead.
2. **Missing Query Keys:** TanStack Query caches data based on the query key array. Reusing generic keys across different filters causes conflicting cache collisions.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What does Stale-While-Revalidate mean?
  * *Answer:* The client immediately renders existing cached data while simultaneously initiating a background network request to revalidate and update stale content.
* **Q2:** Why should you separate server state from client state?
  * *Answer:* Server state involves network latency, multiple users modifying data, and requires caching and retries, whereas client state is synchronous and ephemeral.`
    },
    {
      title: "Lecture 6: Fullstack Architecture: REST APIs, Hono, Express & Middlewares",
      body: `## [SLIDE 1] 🎯 Backend Architecture for Frontend Engineers
A fullstack engineer understands both sides of the wire: how HTTP requests are routed, validated, and secured on the server.

### 🎯 Key Learning Objectives
* Understand the HTTP/1.1 and HTTP/2 protocol (Headers, Status Codes, Methods).
* Master RESTful API design principles and idempotent operations.
* Build fast middleware pipelines using modern frameworks like Hono or Express.

---

## [SLIDE 2] 🧠 The Middleware Pipeline Architecture
\`\`\`text
Client Request: POST /api/tasks
      │
      ▼
Middleware 1: CORS & Security Headers
      │
      ▼
Middleware 2: JWT Authentication (Verify Bearer Token & extract userId)
      │
      ▼
Middleware 3: Zod Schema Validation (Ensure payload structure is valid)
      │
      ▼
Route Handler: Business Logic & Database Operation (PostgreSQL via Drizzle)
      │
      ▼
Client Response: JSON { success: true, data: { ... } } (HTTP 201 Created)
\`\`\`

---

## [SLIDE 3] 🏗️ HTTP Method Idempotence Matrix
| Method | Idempotent? | Safe? | Typical Purpose |
| :--- | :--- | :--- | :--- |
| **GET** | YES | YES | Read data (Zero side effects) |
| **POST** | NO | NO | Create a new record |
| **PUT** | YES | NO | Replace existing record entirely |
| **PATCH**| NO | NO | Partially update specific fields |
| **DELETE**| YES | NO | Remove record |

---

## [SLIDE 4] 💻 Production Code: Hono REST API Route with Zod
\`\`\`typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  priority: z.enum(["P1", "P2", "P3"]).default("P2"),
  estimatedMins: z.number().int().positive().optional(),
});

export const taskApi = new Hono()
  .post("/", zValidator("json", taskSchema), async (c) => {
    const validatedData = c.req.valid("json");
    // Insert into database...
    return c.json({ success: true, task: { id: "task_1", ...validatedData } }, 201);
  })
  .get("/:id", async (c) => {
    const taskId = c.req.param("id");
    return c.json({ success: true, task: { id: taskId, title: "StudyOS Task" } });
  });
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Returning HTTP 200 on Errors:** Returning \`{ error: "Not found" }\` with HTTP 200 OK breaks client-side error handling in Axios and React Query. Always return accurate HTTP status codes (400, 401, 403, 404, 500).
2. **CORS Misunderstandings:** CORS is enforced by the **browser**, not the server! Server-to-server or curl requests bypass CORS entirely.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What does idempotence mean in REST APIs?
  * *Answer:* An operation is idempotent if making multiple identical requests has the exact same side-effect on the server as making a single request (e.g., DELETE, PUT).
* **Q2:** What is the difference between HTTP 401 Unauthorized and HTTP 403 Forbidden?
  * *Answer:* 401 means the client is unauthenticated (missing or invalid credentials); 403 means the identity is known, but lacks permission to access the resource.`
    },
    {
      title: "Lecture 7: WebSockets & Real-Time Bidirectional Communication",
      body: `## [SLIDE 1] 🎯 Beyond HTTP: Full-Duplex Real-Time Sockets
Traditional HTTP request-response architecture requires polling to receive new data. WebSockets provide persistent, low-latency, bidirectional communication.

### 🎯 Key Learning Objectives
* Understand the HTTP-to-WebSocket Upgrade Handshake.
* Compare Short Polling, Long Polling, Server-Sent Events (SSE), and WebSockets.
* Implement robust client reconnection with exponential backoff and heartbeat pings.

---

## [SLIDE 2] 🧠 The WebSocket Handshake Pipeline
\`\`\`text
Client                                                   Server
  │                                                        │
  │─── HTTP GET /ws (Upgrade: websocket, Sec-WebSocket-Key)──►
  │                                                        │
  │◄── HTTP 101 Switching Protocols (Connection Upgraded) ─│
  │                                                        │
  ══════════════════════════════════════════════════════════
               Persistent TCP Full-Duplex Stream
  │─── JSON Frame: {"action": "join_room"} ───────────────►│
  │◄── Binary/JSON Frame: {"event": "new_message"} ────────│
  │─── Ping Frame ────────────────────────────────────────►│
  │◄── Pong Frame ─────────────────────────────────────────│
\`\`\`

---

## [SLIDE 3] 🏗️ Real-Time Technology Comparison
| Technology | Direction | Transport | Overhead per message | Best Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Short Polling** | Unidirectional | HTTP | High (Full HTTP headers every interval) | Infrequent updates |
| **SSE (Server-Sent Events)** | Server to Client | HTTP | Low | Live stock feeds, AI token streaming |
| **WebSockets** | Full-Duplex | Persistent TCP | Minimal (2 to 10 bytes framing header) | Collaborative apps, multiplayer games |

---

## [SLIDE 4] 💻 Production Code: Resilient WebSocket Client
\`\`\`typescript
export class StudyOSSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private url: string;

  constructor(url: string) {
    this.url = url;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("[WS] Connected to real-time server.");
      this.reconnectAttempts = 0;
    };

    this.ws.onclose = () => {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.warn(\`[WS] Disconnected. Reconnecting in \${delay}ms...\`);
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), delay);
    };

    this.ws.onerror = (err) => console.error("[WS] Socket error:", err);
  }

  public send(payload: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Zombie Connections (Silent Socket Drops):** Cellular networks or sleep states can sever a TCP connection without firing an \`onclose\` event. Always implement heartbeat ping/pong signals to detect and prune dead connections.
2. **Missing State Buffering:** Attempting to call \`ws.send()\` before the \`onopen\` event fires throws an \`INVALID_STATE_ERR\` exception. Always buffer messages until the connection is established.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What HTTP status code is returned during a successful WebSocket handshake?
  * *Answer:* HTTP 101 Switching Protocols.
* **Q2:** Why are WebSockets more efficient than HTTP polling for high-frequency updates?
  * *Answer:* Once established, WebSocket frames carry only 2 to 10 bytes of header overhead, avoiding repetitive HTTP header exchanges and connection re-establishment.`
    },
    {
      title: "Lecture 8: Production Security, Authentication (JWT/Cookies) & Deployment",
      body: `## [SLIDE 1] 🎯 Production Hardening & Fullstack Delivery
Writing functional code is only half the battle; deploying software to production requires defensive security, CSRF/XSS mitigations, and CI/CD pipelines.

### 🎯 Key Learning Objectives
* Understand JWT tokens vs Session Cookies and their security implications.
* Defend against OWASP Top 10 vulnerabilities (XSS, CSRF, SQL Injection).
* Master Production Build optimization: Code splitting, tree shaking, and CDN caching.

---

## [SLIDE 2] 🧠 Secure Authentication Token Flow
\`\`\`text
Client (Browser)                                    Server (API)
  │ 1. POST /api/auth/login (email, password)           │
  │────────────────────────────────────────────────────►│ Validate credentials
  │                                                     │ Generate Access & Refresh Tokens
  │ 2. Response: Set-Cookie: refreshToken (HttpOnly, Secure, SameSite=Strict)
  │              Body: { accessToken: "eyJhbGci..." }   │
  │◄────────────────────────────────────────────────────│
  │
  │ 3. Subsequent Request:
  │    Headers: Authorization: Bearer <accessToken>
  │    Cookies: refreshToken automatically attached
  │────────────────────────────────────────────────────►│ Verify JWT signature
\`\`\`

---

## [SLIDE 3] 🏗️ OWASP Web Vulnerability Defenses
| Threat | Attack Vector | Production Defense |
| :--- | :--- | :--- |
| **XSS (Cross-Site Scripting)** | Attacker injects malicious \`<script>\` into HTML | Sanitize inputs, avoid \`dangerouslySetInnerHTML\`, enforce strict CSP |
| **CSRF (Cross-Site Request Forgery)**| Malicious site triggers authenticated action | Use \`SameSite=Lax\` or \`Strict\` cookies, require CSRF tokens |
| **SQL Injection** | Attacker injects raw SQL strings | Use parameterized queries and ORMs (Drizzle / Prisma) |

---

## [SLIDE 4] 💻 Production Code: Secure JWT Verification Middleware
\`\`\`typescript
import { Context, Next } from "hono";
import { verify } from "hono/jwt";

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Missing or invalid authorization header" }, 401);
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verify(token, process.env.JWT_SECRET!);
    c.set("jwtPayload", payload);
    await next();
  } catch (err) {
    return c.json({ success: false, error: "Token expired or invalid" }, 401);
  }
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Storing JWT in \`localStorage\`:** Tokens in \`localStorage\` are accessible to ANY JavaScript code running on the page, making them vulnerable to XSS token theft! Store refresh tokens in \`HttpOnly\`, \`Secure\`, \`SameSite=Strict\` cookies.
2. **Missing Rate Limiting:** Exposing unauthenticated login endpoints without rate limiting allows attackers to brute-force user passwords.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What does the \`HttpOnly\` flag on a cookie do?
  * *Answer:* Prevents client-side JavaScript (\`document.cookie\`) from reading the cookie, protecting it from theft via Cross-Site Scripting (XSS).
* **Q2:** What is tree-shaking in modern bundlers (Vite, Webpack)?
  * *Answer:* The process of statically analyzing ES module imports and exports to remove unused dead code from the final production bundle.`
    }
  ],
  dailyLessons: [
    {
      dayNumber: 1,
      title: "Modern JS: ES6+, Arrow Functions, Destructuring & Modules",
      subtasks: [
        "Practice array and object destructuring with default fallback values",
        "Use spread (...) and rest operators for immutable state updates",
        "Configure modern ES modules (import/export) in package.json",
        "Explain this binding differences between regular functions and arrow functions"
      ],
      notes: "# Modern JavaScript Foundations\\n\\nES6+ provides concise syntax and structural immutability patterns."
    },
    {
      dayNumber: 2,
      title: "TypeScript Essentials: Types, Interfaces, Generics & Unions",
      subtasks: [
        "Define strict interfaces for domain models",
        "Implement discriminated union types for finite state representation",
        "Write generic functions with type parameter constraints (T extends object)",
        "Configure strict mode in tsconfig.json"
      ],
      notes: "# TypeScript in Modern Frontend\\n\\nStatic typing catches syntax and runtime bugs at compile time."
    },
    {
      dayNumber: 3,
      title: "Asynchronous JS: Event Loop, Promises & async/await",
      subtasks: [
        "Trace synchronous call stack vs microtask and macrotask queues",
        "Execute parallel promises using Promise.all() and Promise.allSettled()",
        "Handle asynchronous errors gracefully with try-catch and custom error types",
        "Construct abortable network requests using AbortController"
      ],
      notes: "# Asynchronous JavaScript\\n\\nThe Event Loop prioritizes microtasks over macrotasks when flushing the call stack."
    },
    {
      dayNumber: 4,
      title: "DOM Manipulation & Native Event Architecture",
      subtasks: [
        "Traverse and mutate the DOM tree using querySelector and classList",
        "Implement event delegation on parent container for dynamic lists",
        "Explain event bubbling vs event capturing phases",
        "Prevent default behaviors and stop event propagation idiomatically"
      ],
      notes: "# The Browser DOM\\n\\nEvent delegation captures events from dynamically generated child nodes."
    },
    {
      dayNumber: 5,
      title: "Toolchain: Vite, NPM Scripts & Modern Bundling",
      subtasks: [
        "Scaffold a high-speed React app using Vite",
        "Configure environment variables with VITE_ prefixes",
        "Inspect Hot Module Replacement (HMR) in development",
        "Build production bundle and inspect dist/ output asset sizes"
      ],
      notes: "# Modern Tooling\\n\\nVite leverages native ES modules in development for sub-second hot reload."
    },
    {
      dayNumber: 6,
      title: "TypeScript Drag-and-Drop Kanban Board Milestone",
      subtasks: [
        "Implement dragstart, dragover, and drop native HTML5 event handlers",
        "Persist board column state in localStorage",
        "Enforce strict TypeScript types on task cards and columns",
        "Complete Week 1 Project: Interactive Responsive Kanban Board"
      ],
      notes: "# DOM Project Review\\n\\nMastering native DOM events establishes core instincts for React state abstractions."
    },
    {
      dayNumber: 7,
      title: "React Fundamentals: JSX, Components, Props & Composition",
      subtasks: [
        "Explain why JSX compiles to React.createElement function calls",
        "Pass typed props and render conditional components cleanly",
        "Compose modular layouts using children props",
        "Deconstruct complex UI into single-responsibility presentational components"
      ],
      notes: "# React Architecture\\n\\nReact components are pure functions of props and state."
    },
    {
      dayNumber: 8,
      title: "React State: useState & Immutable Updates",
      subtasks: [
        "Declare primitive and complex state using useState hook",
        "Update state immutably using array filter/map and object spread",
        "Use functional state updates (prev => prev + 1) to eliminate stale closures",
        "Lift state up to common ancestor components when sharing state"
      ],
      notes: "# State & Immutability\\n\\nNever mutate state directly; always pass new references to trigger reconciliation."
    },
    {
      dayNumber: 9,
      title: "React Side Effects: useEffect Lifecycle & Cleanup",
      subtasks: [
        "Fetch data from REST API inside useEffect",
        "Implement cleanup function to abort network requests when unmounting",
        "Manage dependency arrays accurately to prevent infinite re-render loops",
        "Differentiate between component mount, update, and unmount lifecycles"
      ],
      notes: "# Side Effects\\n\\n`useEffect` synchronizes React components with external browser APIs."
    },
    {
      dayNumber: 10,
      title: "React References & Forms: useRef & Controlled Components",
      subtasks: [
        "Persist mutable instance variables without triggering re-renders via useRef",
        "Focus input elements and access direct DOM nodes using ref callbacks",
        "Build controlled form inputs with two-way value/onChange bindings",
        "Validate form submission with custom validation errors"
      ],
      notes: "# Refs & Forms\\n\\nControlled components maintain form input state inside React component memory."
    },
    {
      dayNumber: 11,
      title: "Custom React Hooks: Reusable State Abstractions",
      subtasks: [
        "Extract reusable logic into useLocalStorage custom hook",
        "Implement useWindowSize hook for responsive dynamic layouts",
        "Build useDebounce hook to throttle expensive search queries",
        "Write unit tests for custom hooks using React Testing Library"
      ],
      notes: "# Custom Hooks\\n\\nCustom hooks package stateful logic for reuse across multiple components."
    },
    {
      dayNumber: 12,
      title: "React Weather Dashboard Milestone",
      subtasks: [
        "Connect to live OpenWeather API with debounced search input",
        "Render animated weather icons and hourly temperature graphs",
        "Display skeleton loading states and network error banners",
        "Complete Week 2 Project: Real-Time Weather & Air Quality Dashboard"
      ],
      notes: "# Component Integration\\n\\nCombining custom hooks, debouncing, and skeleton loaders creates a polished user experience."
    },
    {
      dayNumber: 13,
      title: "React Optimization: useMemo, useCallback & React.memo",
      subtasks: [
        "Profile component renders using React DevTools Profiler",
        "Cache expensive calculations using useMemo",
        "Preserve callback function reference identity using useCallback",
        "Prevent child re-renders using React.memo on pure presentation components"
      ],
      notes: "# Performance Tuning\\n\\nMemoize expensive computations and callbacks passed to memoized children."
    },
    {
      dayNumber: 14,
      title: "Global State: Context API & useReducer",
      subtasks: [
        "Create typed React Context for application theme and user sessions",
        "Manage complex state transitions using useReducer dispatch actions",
        "Combine Context with useReducer for lightweight global state",
        "Avoid context performance pitfalls by splitting state and dispatch contexts"
      ],
      notes: "# Context API\\n\\nContext provides component tree-wide data access without prop drilling."
    },
    {
      dayNumber: 15,
      title: "Server State: TanStack React Query (useQuery & useMutation)",
      subtasks: [
        "Install and configure QueryClientProvider with cache settings",
        "Fetch and cache server data with useQuery using staleTime and gcTime",
        "Execute mutations with useMutation and invalidate cache on success",
        "Implement optimistic UI updates that roll back on network failure"
      ],
      notes: "# TanStack React Query\\n\\nSeparates remote server caching from local UI state."
    },
    {
      dayNumber: 16,
      title: "Client-Side Routing: React Router & Dynamic Nested Routes",
      subtasks: [
        "Configure browser routing with createBrowserRouter and RouterProvider",
        "Define dynamic URL parameters (/courses/:id) and read via useParams",
        "Implement nested layout routes with <Outlet />",
        "Protect authenticated routes with redirect guards"
      ],
      notes: "# Routing Architecture\\n\\nClient-side routers render appropriate component trees based on browser URL changes."
    },
    {
      dayNumber: 17,
      title: "Styling: Tailwind CSS, CSS Modules & Design Systems",
      subtasks: [
        "Build mobile-first responsive layouts using Tailwind utility classes",
        "Configure custom design system tokens in tailwind.config.js",
        "Compose reusable UI components using Class Variance Authority (CVA)",
        "Implement dark mode switching with CSS custom variables"
      ],
      notes: "# Design Systems\\n\\nTailwind CSS enables rapid, utility-first design without leaving JSX."
    },
    {
      dayNumber: 18,
      title: "Production E-Commerce Cart Milestone",
      subtasks: [
        "Build cart state management with persistent LocalStorage and Context",
        "Add optimistic item quantity increment/decrement with instant feedback",
        "Simulate checkout payment step with validation",
        "Complete Week 3 Project: Production E-Commerce Cart with Context API"
      ],
      notes: "# E-Commerce Architecture\\n\\nOptimistic updates provide instant perceived responsiveness."
    },
    {
      dayNumber: 19,
      title: "Backend Foundations: Node.js, Bun & RESTful API Design",
      subtasks: [
        "Compare Node.js and Bun runtime performance and package managers",
        "Design standard RESTful endpoints following HTTP verb semantics",
        "Return structured JSON envelopes with consistent error formats",
        "Implement request logging and CORS configuration"
      ],
      notes: "# Backend API Design\\n\\nUse correct HTTP methods and return standardized error envelopes."
    },
    {
      dayNumber: 20,
      title: "Hono Web Framework: Routing, Zod Validation & Middleware",
      subtasks: [
        "Create an edge-ready web server using Hono",
        "Validate JSON request bodies strictly using zValidator and Zod",
        "Write custom timing and authentication middleware",
        "Organize route modules cleanly with app.route()"
      ],
      notes: "# Modern API Frameworks\\n\\nHono provides lightweight, TypeScript-first routing across Node, Bun, and edge runtimes."
    },
    {
      dayNumber: 21,
      title: "WebSockets: Real-Time Bidirectional Communication",
      subtasks: [
        "Implement WebSocket server endpoint and handle client connections",
        "Broadcast messages to rooms and channels",
        "Build frontend React socket hook with automatic reconnection",
        "Handle heartbeat ping/pong frames to detect dead connections"
      ],
      notes: "# Real-Time WebSockets\\n\\nWebSockets enable persistent full-duplex communication for live collaboration."
    },
    {
      dayNumber: 22,
      title: "Authentication: JWTs, Passwords & HttpOnly Cookies",
      subtasks: [
        "Hash user passwords securely with bcrypt / argon2",
        "Generate signed JSON Web Tokens (JWT) with expiration times",
        "Store refresh tokens in HttpOnly, Secure, SameSite cookies",
        "Protect backend endpoints with JWT verification middleware"
      ],
      notes: "# Authentication & Security\\n\\nAlways hash passwords and store refresh tokens in secure HttpOnly cookies."
    },
    {
      dayNumber: 23,
      title: "Web Security: OWASP Hardening (CORS, CSRF, XSS & CSP)",
      subtasks: [
        "Configure Content Security Policy (CSP) headers",
        "Sanitize untrusted user input to prevent XSS attacks",
        "Mitigate CSRF by configuring SameSite cookie policies",
        "Implement rate limiting on authentication routes"
      ],
      notes: "# Production Security\\n\\nDefense-in-depth requires CSP headers, input sanitization, and rate limiting."
    },
    {
      dayNumber: 24,
      title: "Fullstack Capstone: Collaborative Study App & Cloud Deployment",
      subtasks: [
        "Connect React frontend with authenticated Hono backend",
        "Deploy frontend to Vercel/Render and backend to Render/Fly.io",
        "Verify HTTPS certificates, CORS origins, and environment variables",
        "Complete Week 4 Capstone: Fullstack Collaborative Study App with Auth"
      ],
      notes: "# Fullstack Mastery\\n\\nCongratulations! You have mastered fullstack development with modern React, TypeScript, and APIs."
    }
  ]
});

console.log('Finished writing Python, DSA, and Web/React catalogs.');
