import type { SubjectCurriculumPackage } from '../types.js';

export const cPackage: SubjectCurriculumPackage = {
  "id": "c-programming",
  "aliases": [
    "c",
    "c language",
    "c programming",
    "c-programming",
    "ansi c",
    "clang"
  ],
  "subject": {
    "name": "C Programming & Systems Foundations",
    "description": "Mastering C programming: memory models, pointers, data structures, and POSIX system I/O.",
    "color": "#6366F1",
    "icon": "code"
  },
  "assignments": [
    {
      "title": "Week 1 Project: Interactive CLI Unit Converter & Calculator in C",
      "description": "Build a modular command-line calculator in C supporting arithmetic, trigonometry, and input validation using functions, switch-case, and format specifiers.",
      "daysDue": 7
    },
    {
      "title": "Week 2 Project: Text Analyzer & 2D Matrix Engine in C",
      "description": "Implement string manipulation algorithms (word frequency, palindrome detector) and 2D matrix multiplication with row-major memory indexing.",
      "daysDue": 14
    },
    {
      "title": "Week 3 Project: Dynamic Memory Singly-Linked List & Pointer Math",
      "description": "Implement a robust singly-linked list in C using malloc, free, and pointer references with zero memory leaks verified via Valgrind.",
      "daysDue": 21
    },
    {
      "title": "Week 4 Capstone: Persistent CLI Task & Student Database in C",
      "description": "Architect a full console application with struct records, binary file persistence (fopen, fread, fwrite), search, update, and sorting.",
      "daysDue": 28
    }
  ],
  "resources": [
    {
      "type": "youtube",
      "title": "C Programming Tutorial for Beginners - Full Course (freeCodeCamp)",
      "url": "https://www.youtube.com/watch?v=KJgsSFOSQv0",
      "providerItemId": "KJgsSFOSQv0"
    },
    {
      "type": "youtube",
      "title": "CS50 Lecture 1: C Programming & Computational Thinking (Harvard)",
      "url": "https://www.youtube.com/watch?v=LfaMVlDaQ24",
      "providerItemId": "LfaMVlDaQ24"
    },
    {
      "type": "youtube",
      "title": "C Programming Full Course 🕹️ (Bro Code)",
      "url": "https://www.youtube.com/watch?v=87SH2Cn0s9A",
      "providerItemId": "87SH2Cn0s9A"
    },
    {
      "type": "youtube",
      "title": "Pointers in C / C++ Complete Masterclass (mycodeschool)",
      "url": "https://www.youtube.com/watch?v=zuegQmMdy8M",
      "providerItemId": "zuegQmMdy8M"
    },
    {
      "type": "youtube",
      "title": "C Programming – Features & The First C Program (Neso Academy)",
      "url": "https://www.youtube.com/watch?v=rLf3jnHxSmU",
      "providerItemId": "rLf3jnHxSmU"
    },
    {
      "type": "youtube",
      "title": "C Language Full Course with Notes & Practice (Apna College)",
      "url": "https://www.youtube.com/watch?v=irqbmMNs2Bo",
      "providerItemId": "irqbmMNs2Bo"
    },
    {
      "type": "web",
      "title": "Cppreference - C Language Documentation & Standard Library Reference",
      "url": "https://en.cppreference.com/w/c",
      "providerItemId": null
    },
    {
      "type": "web",
      "title": "Harvard CS50 Manual Pages & C Library Reference",
      "url": "https://manual.cs50.io/",
      "providerItemId": null
    }
  ],
  "lectureDecks": [
    {
      "title": "Lecture 1: C Architecture, Compilation Pipeline & Toolchain (GCC/Clang)",
      "body": "## [SLIDE 1] 🎯 Course Objectives & Systems Motivation\nWelcome to the C Systems Programming Series! C is the foundation of modern computing—powering the Linux kernel, Windows OS, Git, Postgres, Python's runtime (CPython), and NASA's flight systems.\n\n### 🎯 Key Learning Objectives\n* Understand why C offers unmatched hardware control and execution speed.\n* Master the 4 stages of the GCC/Clang compilation pipeline.\n* Visualize how a program is mapped into Virtual Memory.\n\n💡 **Professor's Tip:** In higher-level languages (Python, Java), memory is managed by garbage collectors. In C, **you are the operating system's partner**—you have direct access to memory addresses and hardware registers.\n\n---\n\n## [SLIDE 2] 🧠 The 4-Stage Compilation Pipeline\nWhen you execute `gcc -Wall -Wextra main.c -o app`, the toolchain runs 4 distinct processors:\n\n```text\nSource Code (main.c)\n      │ 1. Preprocessor (cpp)\n      │    - Evaluates #include <stdio.h> and #define\n      │    - Strips comments\n      ▼\nExpanded Source (main.i)\n      │ 2. Compiler (cc1)\n      │    - Syntax analysis, AST generation & Optimization\n      │    - Generates x86-64 / ARM assembly instructions\n      ▼\nAssembly File (main.s)\n      │ 3. Assembler (as)\n      │    - Translates assembly into binary machine opcodes\n      ▼\nRelocatable Object File (main.o)\n      │ 4. Linker (ld)\n      │    - Combines object files with C Runtime Library (libc)\n      ▼\nFinal Executable Binary (app / app.exe)\n```\n\n---\n\n## [SLIDE 3] 🏗️ Virtual Process Memory Layout\nWhen the operating system launches your binary, it creates a virtual address space partitioned into 5 key segments:\n\n| Memory Segment | Growth Direction | Lifetime | Contents |\n| :--- | :--- | :--- | :--- |\n| **Stack** | Grows Downward (↓) | Automatic (per function frame) | Local variables, function arguments, return addresses |\n| **Heap** | Grows Upward (↑) | Manual (`malloc` → `free`) | Dynamic memory allocations requested at runtime |\n| **BSS Segment** | Fixed | Entire program run | Uninitialized global & `static` variables (auto-zeroed) |\n| **Data Segment**| Fixed | Entire program run | Initialized global & `static` variables (e.g. `int g = 42;`) |\n| **Text Segment**| Fixed (Read-Only) | Permanent | Machine instructions & string literals (e.g. `\"Hello\"`) |\n\n⚠️ **Teacher's Warning:** Writing to the Read-Only Text Segment (e.g. modifying a string literal `char *s = \"hi\"; s[0] = 'b';`) triggers an instant **Segmentation Fault (SIGSEGV)**!\n\n---\n\n## [SLIDE 4] 💻 Working Code & Line-by-Line Breakdown\nHere is the canonical, standard-compliant entry point:\n\n```c\n#include <stdio.h>\n\n/**\n * Main Entry Point\n * @param argc Number of CLI arguments\n * @param argv Array of CLI argument strings\n * @return 0 on success, non-zero on system failure\n */\nint main(int argc, char *argv[]) {\n    printf(\"StudyOS Systems Series: GCC v14.2 Initialized!\\n\");\n    printf(\"Arguments Count: %d\\n\", argc);\n    \n    for (int i = 0; i < argc; i++) {\n        printf(\"  argv[%d] = %s\\n\", i, argv[i]);\n    }\n    \n    return 0; // Return code 0 signals SUCCESS to the shell\n}\n```\n\n### 🛠️ Strict Compilation Flags\nAlways build with strict diagnostic flags:\n```bash\ngcc -std=c17 -Wall -Wextra -Werror -pedantic -g main.c -o app\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\nHere are the 3 most frequent mistakes on university exams:\n\n1. **Missing `#include <stdio.h>`:** In older C standards, `printf` was assumed to return `int`. In C17/C23, this is an error or severe warning.\n2. **Missing `return 0;` in non-main functions:** While C99 allows omitting `return 0` in `main()`, omitting a return value in any other function produces **Undefined Behavior**.\n3. **Capitalization in `Main`:** C is case-sensitive! `Main()` will compile into an object file but the Linker will fail with `undefined reference to 'main'`.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\nTest your understanding before moving to Lecture 2:\n\n* **Q1:** Which toolchain stage is responsible for resolving external functions like `printf`?\n  * *Answer:* The Linker (`ld`).\n* **Q2:** Where are local function variables allocated?\n  * *Answer:* On the Stack inside the active stack frame.\n* **Q3:** What does `gcc -Wall` do?\n  * *Answer:* Enables \"all standard compiler warnings\" to catch bugs before execution."
    },
    {
      "title": "Lecture 2: Variables, Primitive Types, Memory Sizes & Format Specifiers",
      "body": "## [SLIDE 1] 🎯 Course Objectives & Core Concept\nIn C, every variable is a named memory location with a fixed byte width. Understanding exact memory representations is critical for systems programming and embedded engineering.\n\n### 🎯 Key Learning Objectives\n* Memorize standard byte widths and integer ranges.\n* Use portable fixed-width integers from `<stdint.h>`.\n* Understand Two's Complement signed representation.\n* Master format specifiers to avoid memory corruption in `printf` and `scanf`.\n\n---\n\n## [SLIDE 2] 🧠 Primitive Data Types & Exact Memory Sizing\n\n| Type Name | Byte Size | Minimum Value | Maximum Value | Format Specifier |\n| :--- | :--- | :--- | :--- | :--- |\n| `char` | 1 byte (8 bits) | -128 | +127 | `%c` or `%d` |\n| `unsigned char` | 1 byte | 0 | 255 | `%u` |\n| `short` | 2 bytes (16 bits) | -32,768 | +32,767 | `%hd` |\n| `int` | 4 bytes (32 bits) | -2,147,483,648 | +2,147,483,647 | `%d` or `%i` |\n| `unsigned int`| 4 bytes | 0 | 4,294,967,295 | `%u` |\n| `long long` | 8 bytes (64 bits)| -9.22 × 10¹⁸ | +9.22 × 10¹⁸ | `%lld` |\n| `float` | 4 bytes (IEEE 754)| ~1.2 × 10⁻³⁸ | ~3.4 × 10³⁸ (6 sig figs) | `%f` |\n| `double` | 8 bytes (IEEE 754)| ~2.2 × 10⁻³⁰⁸ | ~1.8 × 10³⁰⁸ (15 sig figs)| `%lf` |\n| `void*` (Pointer)| 8 bytes (on 64-bit)| `0x0000000000000000` | `0xFFFFFFFFFFFFFFFF` | `%p` |\n\n---\n\n## [SLIDE 3] 🏗️ Portable Fixed-Width Types (`<stdint.h>`)\nBecause the size of `int` and `long` varies between platforms (32-bit vs 64-bit, Windows vs Linux), professional systems engineers use `<stdint.h>`:\n\n```c\n#include <stdio.h>\n#include <stdint.h>\n#include <inttypes.h>\n\nint main(void) {\n    int8_t   smallByte   = -128;         // Exactly 8 bits signed\n    uint8_t  pixelAlpha  = 255;          // Exactly 8 bits unsigned (0-255)\n    int32_t  packetId    = 1048576;      // Exactly 32 bits signed\n    uint64_t memoryLimit = 0xFFFFFFFF;   // Exactly 64 bits unsigned\n\n    printf(\"Pixel: %u\\n\", pixelAlpha);\n    printf(\"64-bit hex: 0x%\" PRIx64 \"\\n\", memoryLimit);\n    return 0;\n}\n```\n\n💡 **Professor's Tip:** When writing network protocols or device drivers, always use `uint8_t` and `uint32_t` so your code never breaks when compiled on a different architecture!\n\n---\n\n## [SLIDE 4] 💻 Type Casting: Implicit Promotion vs Explicit Casts\n```c\n#include <stdio.h>\n\nint main(void) {\n    int totalQuestions = 5;\n    int correctAnswers = 4;\n\n    // ❌ TRUNCATED INTEGER DIVISION BUG:\n    // Both operands are int, so 4 / 5 yields 0. Result is 0.00!\n    double badGrade = correctAnswers / totalQuestions; \n\n    // ✅ CORRECT EXPLICIT CAST:\n    // Casting one operand to double forces floating-point division: 4.0 / 5 = 0.80\n    double goodGrade = (double)correctAnswers / totalQuestions;\n\n    printf(\"Bad calculation:  %.2f%%\\n\", badGrade * 100);  // 0.00%\n    printf(\"Good calculation: %.2f%%\\n\", goodGrade * 100); // 80.00%\n    return 0;\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **The `scanf` Address Trap:**\n   * ❌ `scanf(\"%d\", num);`: Crashes! `scanf` expects a pointer to memory, not the value!\n   * ✅ `scanf(\"%d\", &num);`: Passes the memory address using the `&` operator.\n2. **Integer Overflow:**\n   * If an 8-bit signed integer has value `127` (`01111111`) and you add `1`, it overflows to `-128` (`10000000`) in Two's Complement arithmetic!\n3. **Float Precision Loss:**\n   * Never compare floating-point numbers with `==` (`if (f == 0.1)`) due to binary rounding errors. Always compare with an epsilon: `fabs(a - b) < 0.00001`.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the byte size of `double` on modern 64-bit systems?\n  * *Answer:* 8 bytes (64 bits).\n* **Q2:** Why does `(double)(5 / 2)` evaluate to `2.0` instead of `2.5`?\n  * *Answer:* The parentheses evaluate integer division `5 / 2 = 2` first, before the cast is applied!"
    },
    {
      "title": "Lecture 3: Operators, Boolean Logic & Control Flow (if-else, switch)",
      "body": "## [SLIDE 1] 🎯 Course Objectives & Core Concept\nControl flow directs the CPU's instruction pointer through conditional branches. In C, decisions are executed using boolean logic, bitmasking, and jump tables.\n\n### 🎯 Key Learning Objectives\n* Understand short-circuit evaluation in `&&` and `||`.\n* Manipulate hardware flags using bitwise operators (`&`, `|`, `^`, `~`, `<<`, `>>`).\n* Utilize the `switch` jump table for O(1) multi-way branch dispatch.\n\n---\n\n## [SLIDE 2] 🧠 Short-Circuit Boolean Evaluation\nIn C, boolean logic is optimized:\n* In `A && B`: If `A` is `false`, `B` is **NEVER executed**.\n* In `A || B`: If `A` is `true`, `B` is **NEVER executed**.\n\n```c\n#include <stdio.h>\n#include <stdbool.h>\n\nbool pingDatabase(void) {\n    printf(\"[NETWORK] Contacting database...\\n\");\n    return true;\n}\n\nint main(void) {\n    bool hasCachedCredentials = true;\n\n    // Because left operand is TRUE, pingDatabase() is NEVER called!\n    if (hasCachedCredentials || pingDatabase()) {\n        printf(\"Access granted instantly via short-circuit cache!\\n\");\n    }\n    return 0;\n}\n```\n\n---\n\n## [SLIDE 3] 🏗️ Bitwise Operators & Hardware Bitmasking\nIn embedded microcontrollers and OS kernels, memory is conserved by packing multiple boolean flags into a single byte:\n\n```c\n#include <stdio.h>\n#include <stdint.h>\n\n#define PERMISSION_READ    (1 << 0) // 0b00000001\n#define PERMISSION_WRITE   (1 << 1) // 0b00000010\n#define PERMISSION_EXECUTE (1 << 2) // 0b00000100\n\nint main(void) {\n    uint8_t fileFlags = 0;\n\n    // Enable READ and WRITE permissions using bitwise OR (|)\n    fileFlags |= (PERMISSION_READ | PERMISSION_WRITE);\n\n    // Test permission using bitwise AND (&)\n    if (fileFlags & PERMISSION_WRITE) {\n        printf(\"Write permission is active.\\n\");\n    }\n\n    // Revoke WRITE permission using bitwise AND with NOT (& ~)\n    fileFlags &= ~PERMISSION_WRITE;\n\n    return 0;\n}\n```\n\n---\n\n## [SLIDE 4] 💻 High-Speed Switch Branching & Jump Tables\nWhen you have multiple discrete integer branches, a `switch` statement is compiled into an O(1) **jump table** in assembly, far outperforming chained `if-else` ladders:\n\n```c\ntypedef enum {\n    LOG_INFO,\n    LOG_WARNING,\n    LOG_ERROR,\n    LOG_FATAL\n} LogSeverity;\n\nvoid dispatchLog(LogSeverity level, const char *msg) {\n    switch (level) {\n        case LOG_INFO:\n            printf(\"[INFO] %s\\n\", msg);\n            break;\n        case LOG_WARNING:\n            printf(\"[WARN] %s\\n\", msg);\n            break;\n        case LOG_ERROR:\n        case LOG_FATAL: // Intentional fall-through\n            fprintf(stderr, \"[CRITICAL] %s\\n\", msg);\n            break;\n        default:\n            printf(\"[UNKNOWN] %s\\n\", msg);\n            break;\n    }\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Assignment in `if` condition:**\n   * ❌ `if (status = 1)`: Sets `status` to 1 and evaluates to true!\n   * ✅ `if (status == 1)`: Compares for equality.\n   * 💡 *Yoda Conditions:* Writing `if (1 == status)` prevents accidental assignment because `1 = status` will cause a compile-time error!\n2. **Missing `break` in `switch`:**\n   * Omitting `break` causes execution to fall through to subsequent cases, a common source of exam point loss.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the result of `5 & 3` in binary?\n  * *Answer:* `5` is `101_2`, `3` is `011_2`. `101 & 011 = 001_2 = 1`.\n* **Q2:** What happens if the first condition in `if (ptr != NULL && *ptr == 42)` is false?\n  * *Answer:* Short-circuit evaluation halts check immediately, safely preventing a NULL dereference crash!"
    },
    {
      "title": "Lecture 4: Loops & Iterative Algorithms (for, while, do-while)",
      "body": "## [SLIDE 1] 🎯 Course Objectives & Core Concept\nLoops allow repeated execution of code blocks. In C, choosing the right loop construct ensures algorithm efficiency and robust handling of input edge cases.\n\n### 🎯 Key Learning Objectives\n* Compare execution guarantees: `while` vs `for` vs `do-while`.\n* Build fail-safe input loops that clean standard input buffers.\n* Understand time complexity in nested loop algorithms.\n\n---\n\n## [SLIDE 2] 🧠 Loop Construct Comparison\n\n| Loop Construct | Condition Check | Minimum Runs | Typical Industry Application |\n| :--- | :--- | :--- | :--- |\n| `while (cond)` | Pre-test (entry) | **0 times** | File stream reading (`while (ch != EOF)`), network polling |\n| `for (init; cond; step)` | Pre-test (entry) | **0 times** | Fixed-count iteration, array traversal, matrix operations |\n| `do { ... } while (cond);` | Post-test (exit) | **At least 1 time** | User prompt validation, menu drivers, transaction retries |\n\n---\n\n## [SLIDE 3] 🏗️ Bulletproof Stdin Validation with `do-while`\nA major source of student program crashes is non-numeric input into `scanf`. Here is the industry-standard validation loop:\n\n```c\n#include <stdio.h>\n\nint promptValidatedAge(void) {\n    int age = -1;\n    int itemsScanned = 0;\n\n    do {\n        printf(\"Enter age (1 to 120): \");\n        itemsScanned = scanf(\"%d\", &age);\n\n        // If user typed letters, scanf fails and leaves characters in stdin!\n        if (itemsScanned != 1) {\n            int ch;\n            // Flush remaining characters until newline\n            while ((ch = getchar()) != '\\n' && ch != EOF);\n            printf(\"Invalid character entered. Numbers only!\\n\");\n            age = -1;\n        }\n    } while (age < 1 || age > 120);\n\n    return age;\n}\n```\n\n---\n\n## [SLIDE 4] 💻 Matrix Operations & Algorithmic Complexity\n```c\n#define ROWS 3\n#define COLS 3\n\nvoid printMatrixDiagonal(int matrix[ROWS][COLS]) {\n    // Nested loop: Outer runs ROWS times, Inner runs COLS times -> O(ROWS * COLS)\n    for (int r = 0; r < ROWS; r++) {\n        for (int c = 0; c < COLS; c++) {\n            if (r == c) {\n                printf(\"[%d]\", matrix[r][c]); // Diagonal element\n            } else {\n                printf(\" . \");\n            }\n        }\n        printf(\"\\n\");\n    }\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Off-by-One Errors (`OBOE`):**\n   * An array of size `N` has valid indices from `0` to `N - 1`. Writing `for (int i = 0; i <= N; i++)` accesses out-of-bounds memory on the final iteration!\n2. **Infinite Loops with `unsigned` Counters:**\n   * ❌ `for (unsigned int i = 10; i >= 0; i--)`: Because an unsigned int is ALWAYS `>= 0`, when `i` is 0 and decrements, it underflows to `4,294,967,295`, looping infinitely!\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** Which loop is guaranteed to execute its body at least once?\n  * *Answer:* The `do-while` loop.\n* **Q2:** How do you exit a loop immediately before the condition is met?\n  * *Answer:* The `break;` statement."
    },
    {
      "title": "Lecture 5: Functions, Call Stack, Variable Scope & Recursion",
      "body": "## [SLIDE 1] 🎯 Course Objectives & Core Concept\nFunctions are the modular building blocks of C. In C, all arguments are strictly passed by value. Understanding stack frame allocation is essential for debugging and recursion.\n\n### 🎯 Key Learning Objectives\n* Understand Call-by-Value semantics and why pointers are required for mutations.\n* Inspect the Activation Record (Stack Frame) created on each function call.\n* Contrast storage classes: `auto`, `static`, `extern`.\n* Formulate robust recursive functions with base cases.\n\n---\n\n## [SLIDE 2] 🧠 Call-by-Value vs Pointers (The Swap Problem)\nIn C, when you pass an argument to a function, the runtime creates a **copy** of the variable on the function's stack frame:\n\n```c\n// ❌ FAILS: Modifies local stack copies only!\nvoid badSwap(int a, int b) {\n    int temp = a;\n    a = b;\n    b = temp;\n}\n\n// ✅ SUCCEEDS: Receives pointers (memory addresses) to the original variables\nvoid goodSwap(int *a, int *b) {\n    int temp = *a;\n    *a = *b;\n    *b = temp;\n}\n```\n\n---\n\n## [SLIDE 3] 🏗️ Variable Scope & The `static` Keyword\nThe `static` keyword changes variable lifetime and symbol visibility:\n\n```c\n#include <stdio.h>\n\nvoid executeRequest(void) {\n    auto int localId = 0;          // Recreated and destroyed on every call\n    static int persistentCounter = 0; // Initialized ONCE in Data Segment, persists forever!\n\n    localId++;\n    persistentCounter++;\n\n    printf(\"Local: %d, Persistent: %d\\n\", localId, persistentCounter);\n}\n\nint main(void) {\n    executeRequest(); // Local: 1, Persistent: 1\n    executeRequest(); // Local: 1, Persistent: 2\n    executeRequest(); // Local: 1, Persistent: 3\n    return 0;\n}\n```\n\n---\n\n## [SLIDE 4] 💻 Recursion Anatomy: Base Case vs Recursive Call\n```c\n#include <stdio.h>\n\n/**\n * Computes Factorial: N! = N * (N - 1)!\n * Time: O(N), Space: O(N) stack frames\n */\nlong long factorial(int n) {\n    // 1. Mandatory Base Case: Stops the recursion\n    if (n <= 1) {\n        return 1;\n    }\n    // 2. Recursive Step: Solves smaller sub-problem\n    return n * factorial(n - 1);\n}\n```\n\n⚠️ **Teacher's Warning:** If the base case is omitted or unreachable, the function pushes stack frames until process stack memory is exhausted, causing an unrecoverable **Stack Overflow crash**!\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Returning a Pointer to a Local Stack Variable:**\n   * ❌ `int* getScore() { int s = 100; return &s; }`: The variable `s` is destroyed when the function returns! The returned pointer is a **Dangling Pointer** pointing to corrupted memory.\n2. **Missing Function Prototype:**\n   * Calling a function defined later in the file without a preceding forward declaration (`int compute(int x);`) triggers compiler warnings or errors in C17.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What happens to an `auto` local variable when its function returns?\n  * *Answer:* Its stack frame is popped and the memory is reclaimed.\n* **Q2:** Where is a `static` local variable stored in process memory?\n  * *Answer:* In the Data Segment (or BSS), NOT on the Stack."
    },
    {
      "title": "Lecture 6: 1D & 2D Arrays, Matrices, and String Manipulation",
      "body": "## [SLIDE 1] 🎯 Course Objectives & Core Concept\nArrays provide contiguous memory for indexed data. In C, strings are simply null-terminated character arrays. Mastering bounds safety and standard string algorithms is fundamental.\n\n### 🎯 Key Learning Objectives\n* Master row-major order memory indexing in multi-dimensional arrays.\n* Understand the role of the null terminator (`'\\\\0'`).\n* Utilize safe string functions from `<string.h>` to prevent Buffer Overflows.\n\n---\n\n## [SLIDE 2] 🧠 Array Decay & Contiguous Memory\nAn array name `arr` decays into a pointer to its first element (`&arr[0]`) when passed into functions:\n\n```c\n#include <stdio.h>\n\n// When passed to a function, arr[] is actually int *arr!\nvoid printArray(const int arr[], size_t length) {\n    // sizeof(arr) here returns 8 (pointer size), NOT total bytes of array!\n    for (size_t i = 0; i < length; i++) {\n        printf(\"arr[%zu] = %d (address: %p)\\n\", i, arr[i], (void*)&arr[i]);\n    }\n}\n```\n\n💡 **Professor's Tip:** In C, arrays do NOT know their own length! You must **always pass the length** as an explicit argument.\n\n---\n\n## [SLIDE 3] 🏗️ C Strings & The Null Terminator (`'\\\\0'`)\nA C string is an array of characters terminated by the null byte `0` (`'\\\\0'`):\n\n```text\nchar str[6] = \"Study\";\nMemory: [ 'S' ][ 't' ][ 'u' ][ 'd' ][ 'y' ][ '\\\\0' ]\nIndex:     0      1      2      3      4      5\n```\n\n```c\n#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    char greeting[32] = \"StudyOS\";\n    \n    // strlen measures count up to '\\0' (excludes null terminator): 7\n    printf(\"String length: %zu\\n\", strlen(greeting));\n    // sizeof returns total allocated buffer capacity: 32 bytes\n    printf(\"Buffer capacity: %zu\\n\", sizeof(greeting));\n    \n    return 0;\n}\n```\n\n---\n\n## [SLIDE 4] 💻 Safe String Operations vs Dangerous Legacy Functions\nBuffer overflows occur when a program writes beyond an array's boundary. They account for some of history's most severe cybersecurity vulnerabilities.\n\n```c\n#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    char source[] = \"University Engineering\";\n    char safeBuffer[16];\n\n    // ❌ BANNED: strcpy(safeBuffer, source); // Overflows safeBuffer (22 bytes into 16)!\n\n    // ✅ SAFE: strncpy with explicit bound enforcement\n    strncpy(safeBuffer, source, sizeof(safeBuffer) - 1);\n    safeBuffer[sizeof(safeBuffer) - 1] = '\\\\0'; // Guarantee null-termination\n\n    printf(\"Safely truncated: %s\\n\", safeBuffer);\n    return 0;\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Using `gets()`:**\n   * Never use `gets()`—it has no boundary check and was officially removed in C11. Always use `fgets(buffer, sizeof(buffer), stdin)`.\n2. **Comparing Strings with `==`:**\n   * ❌ `if (str1 == str2)`: Compares pointer addresses, NOT character content!\n   * ✅ `if (strcmp(str1, str2) == 0)`: Returns 0 when characters match.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is stored at the final index of every valid C string?\n  * *Answer:* The null terminator character `'\\\\0'` (byte value 0).\n* **Q2:** What does `strcmp(\"apple\", \"banana\")` return?\n  * *Answer:* A negative integer (because `'a'` has a lower ASCII code than `'b'`)."
    },
    {
      "title": "Lecture 7: Pointers, Memory Addresses & Dynamic Allocation (malloc/free/valgrind)",
      "body": "## [SLIDE 1] 🎯 Course Objectives & Core Concept\nPointers are the defining superpower of C. A pointer variable stores the numeric memory address of another variable in RAM.\n\n### 🎯 Key Learning Objectives\n* Understand the address-of (`&`) and dereference (`*`) operators.\n* Compute pointer arithmetic scaled by `sizeof(T)`.\n* Allocate runtime Heap memory using `malloc()`, `calloc()`, `realloc()`, and `free()`.\n* Prevent Memory Leaks, Dangling Pointers, and Double-Frees using Valgrind.\n\n---\n\n## [SLIDE 2] 🧠 The Two Pointer Operators\n* **Address-of Operator (`&`):** Retrieves the physical memory address of a variable.\n* **Dereference Operator (`*`):** Accesses or mutates the value stored at that address.\n\n```c\n#include <stdio.h>\n\nint main(void) {\n    int target = 42;\n    int *ptr = &target; // ptr holds the address of target\n\n    printf(\"Value of target:           %d\\n\", target);\n    printf(\"Address of target (&target): %p\\n\", (void*)&target);\n    printf(\"Value stored in ptr:       %p\\n\", (void*)ptr);\n    printf(\"Dereferenced value (*ptr): %d\\n\", *ptr);\n\n    // Mutate the original variable through the pointer!\n    *ptr = 99;\n    printf(\"New value of target:       %d\\n\", target); // Prints 99\n\n    return 0;\n}\n```\n\n---\n\n## [SLIDE 3] 🏗️ Pointer Arithmetic Mechanics\nWhen you add an integer `k` to a pointer `ptr`, the address is shifted by `k * sizeof(*ptr)` bytes:\n\n```c\nint numbers[3] = {10, 20, 30};\nint *p = numbers; // Points to numbers[0] (e.g. 0x1000)\n\np = p + 1; // Advances by 4 bytes (sizeof(int))! Points to 0x1004 (numbers[1])\nprintf(\"Value: %d\\n\", *p); // 20\n```\n\n---\n\n## [SLIDE 4] 💻 Dynamic Memory Allocation on the Heap\nStack variables are bound to their function lifetime. When data must survive across function returns or has a runtime-determined size, allocate on the Heap:\n\n```c\n#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    int count = 5;\n\n    // calloc allocates memory AND zeroes every byte (prevents garbage values)\n    int *scores = (int*)calloc(count, sizeof(int));\n    \n    // 1. Mandatory NULL check: Protects against out-of-memory errors\n    if (scores == NULL) {\n        fprintf(stderr, \"Fatal: Out of memory!\\n\");\n        return 1;\n    }\n\n    for (int i = 0; i < count; i++) {\n        scores[i] = (i + 1) * 20;\n    }\n\n    // 2. Mandatory Cleanup: Prevent memory leak\n    free(scores);\n    \n    // 3. Prevent dangling pointer\n    scores = NULL; \n\n    return 0;\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps: The 3 Cardinal Memory Sins\n1. **Memory Leak:** Allocating with `malloc` without calling `free()`. Memory remains occupied until process termination.\n2. **Dangling Pointer:** Accessing memory after calling `free(ptr)` (Use-After-Free).\n3. **Double Free:** Calling `free()` twice on the same memory address, corrupting the heap manager.\n\n💡 **Detection:** Compile with AddressSanitizer: `gcc -fsanitize=address -g main.c` or run under `valgrind --leak-check=full ./app`.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the difference between `malloc` and `calloc`?\n  * *Answer:* `malloc` leaves memory uninitialized (filled with garbage), while `calloc` zeroes every byte.\n* **Q2:** If `int *p = (int*)0x1000`, what is the address of `p + 2` on a 32-bit int system?\n  * *Answer:* `0x1000 + (2 * 4) = 0x1008`."
    },
    {
      "title": "Lecture 8: Structures, Typedef, Enums, and File I/O Serialization",
      "body": "## [SLIDE 1] 🎯 Course Objectives & Core Concept\nReal-world systems model complex entities (students, tasks, packets) by composing heterogeneous primitive types into `struct` objects and serializing them to disk.\n\n### 🎯 Key Learning Objectives\n* Define clean compound models using `typedef struct`.\n* Understand memory alignment and byte padding.\n* Master the arrow operator (`->`) vs dot operator (`.`).\n* Read and write persistent records to disk using `<stdio.h>` streams.\n\n---\n\n## [SLIDE 2] 🧠 Structs & The Arrow Operator (`->`)\nA struct bundles disparate variables into a single continuous memory layout:\n\n```c\n#include <stdio.h>\n#include <string.h>\n\ntypedef struct {\n    int id;\n    char title[64];\n    double score;\n    int isCompleted;\n} TaskRecord;\n\n// Pass by const pointer to avoid copying 80+ bytes on each function call!\nvoid displayTask(const TaskRecord *t) {\n    // The arrow operator (->) dereferences the pointer: (*t).title\n    printf(\"[%c] Task #%d: %s (Score: %.1f)\\n\",\n           t->isCompleted ? 'X' : ' ',\n           t->id,\n           t->title,\n           t->score);\n}\n```\n\n---\n\n## [SLIDE 3] 🏗️ Struct Memory Alignment & Padding\nThe CPU reads memory more efficiently when 4-byte integers align on 4-byte boundaries:\n\n```c\nstruct BadPadding {\n    char a;   // 1 byte\n    // 3 bytes of compiler padding inserted here!\n    int b;    // 4 bytes\n    char c;   // 1 byte\n    // 3 bytes of compiler padding inserted here!\n}; // Total size = 12 bytes!\n\nstruct OptimizedPadding {\n    int b;    // 4 bytes\n    char a;   // 1 byte\n    char c;   // 1 byte\n    // 2 bytes of compiler padding\n}; // Total size = 8 bytes! (33% memory saved)\n```\n\n---\n\n## [SLIDE 4] 💻 Persistent File Serialization to Disk\n```c\n#include <stdio.h>\n#include <stdlib.h>\n\nvoid saveTaskToFile(const TaskRecord *t, const char *filename) {\n    FILE *fp = fopen(filename, \"w\"); // Open for writing\n    if (!fp) {\n        perror(\"Error opening file\");\n        return;\n    }\n    \n    // Write pipe-delimited record\n    fprintf(fp, \"%d|%s|%.2f|%d\\n\", t->id, t->title, t->score, t->isCompleted);\n    fclose(fp); // Always flush and close file descriptor!\n}\n\nint loadTaskFromFile(TaskRecord *t, const char *filename) {\n    FILE *fp = fopen(filename, \"r\"); // Open for reading\n    if (!fp) return 0;\n\n    int matched = fscanf(fp, \"%d|%63[^|]|%lf|%d\\n\",\n                         &t->id, t->title, &t->score, &t->isCompleted);\n    fclose(fp);\n    return matched == 4; // Returns true if all 4 fields parsed successfully\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Forgetting to check `fopen`:**\n   * If a file cannot be opened (permissions, missing path), `fopen` returns `NULL`. Dereferencing a NULL file pointer crashes the program.\n2. **Buffer size specifier in `fscanf`:**\n   * Always write `%63[^|]` rather than `%s` so `fscanf` never writes more than 63 characters into a 64-character buffer!\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz & Capstone Guide\n* **Q1:** What does `t->id` do?\n  * *Answer:* Dereferences pointer `t` and accesses member `id` (shorthand for `(*t).id`).\n* **Q2:** Why should large structs always be passed by pointer rather than by value?\n  * *Answer:* Passing by value copies the entire struct byte-for-byte to the stack, wasting CPU cycles and memory."
    }
  ],
  "dailyLessons": [
    {
      "dayNumber": 1,
      "title": "C Setup: GCC, Clang & First Hello World",
      "subtasks": [
        "Install GCC or Clang toolchain and verify with gcc --version",
        "Write and compile main.c with strict flags (-Wall -Wextra -Werror)",
        "Inspect the 4 stages of compilation using gcc -E, -S, and -c flags",
        "Run the compiled binary from terminal and verify return code with echo $?"
      ],
      "notes": "# C Setup & Compilation Pipeline\\n\\n Dennis Ritchie created C in 1972 at Bell Labs. C code maps directly into assembly instructions with zero runtime overhead.\\n\\n```c\\n#include <stdio.h>\\n\\nint main(void) {\\n    printf(\\\"StudyOS Kernel Initialized\\\\n\\\");\\n    return 0;\\n}\\n```"
    },
    {
      "dayNumber": 2,
      "title": "C Data Types: int, float, char & %d %f %c",
      "subtasks": [
        "Declare variables of type char, int, float, and double",
        "Print exact byte sizes using sizeof() operator across types",
        "Experiment with format specifiers (%d, %f, %.2f, %c, %p)",
        "Demonstrate integer overflow behavior using limits.h constants"
      ],
      "notes": "# C Data Types & Memory Representation\\n\\nVariables occupy fixed memory sizes determined by architecture.\\n\\n- `char`: 1 byte\\n- `int`: 4 bytes\\n- `float`: 4 bytes (IEEE 754)\\n- `double`: 8 bytes"
    },
    {
      "dayNumber": 3,
      "title": "C Logic: Arithmetic & Relational Operators",
      "subtasks": [
        "Implement arithmetic operations (+, -, *, /, %) with type casting",
        "Test integer division vs floating-point division pitfalls",
        "Demonstrate boolean logic using logical operators (&&, ||, !)",
        "Analyze operator precedence using parentheses for deterministic order"
      ],
      "notes": "# Arithmetic & Relational Logic in C\\n\\nC treats non-zero values as TRUE and 0 as FALSE. Short-circuit evaluation guarantees that in `A && B`, if `A` is false, `B` is never evaluated."
    },
    {
      "dayNumber": 4,
      "title": "C Control: if, else if & Switch Statements",
      "subtasks": [
        "Write nested if-else statements for multi-condition branching",
        "Implement a clean switch-case dispatch menu for user options",
        "Verify break statement necessity to prevent accidental fallthrough",
        "Use default case for robust invalid input handling"
      ],
      "notes": "# Control Flow: Branches & Jump Tables\\n\\n`switch` constructs generate O(1) jump tables in machine code when cases are contiguous integers, providing faster branching than cascading `if-else`."
    },
    {
      "dayNumber": 5,
      "title": "C Loops: while & do-while Loops",
      "subtasks": [
        "Write a sentinel-controlled while loop for dynamic input processing",
        "Implement a do-while loop to guarantee at least one execution for user menus",
        "Add break and continue statements with condition boundaries",
        "Prevent infinite loops by asserting loop variant decrements"
      ],
      "notes": "# Iteration: while vs do-while\\n\\n- `while`: Entry-checked (evaluates condition before executing body).\\n- `do-while`: Exit-checked (guarantees execution of body at least once)."
    },
    {
      "dayNumber": 6,
      "title": "C Loops: for Loops & Nested Patterns",
      "subtasks": [
        "Construct for loops with initialization, condition, and increment expressions",
        "Build nested for loops to render 2D geometric patterns and matrices",
        "Optimize loop bounds to eliminate redundant computations",
        "Complete Week 1 milestone review and self-test quiz"
      ],
      "notes": "# Nested Loops & Complexity\\n\\nNested loops run in $O(N \\times M)$ complexity. Cache locality is preserved by traversing 2D data in row-major order (`arr[row][col]`)."
    },
    {
      "dayNumber": 7,
      "title": "C Functions: Prototypes & Return Values",
      "subtasks": [
        "Declare header function prototypes before main()",
        "Implement functions with typed parameters and explicit return types",
        "Test pure functions without side effects for modular design",
        "Analyze stack frame creation and teardown during function calls"
      ],
      "notes": "# Functions & Modular Design\\n\\nFunction prototypes allow the compiler to enforce type safety before the linker resolves symbol addresses across translation units."
    },
    {
      "dayNumber": 8,
      "title": "C Scope: Call-by-Value & Local Variables",
      "subtasks": [
        "Demonstrate call-by-value behavior when passing primitives",
        "Trace local variable lifetime and automatic stack deallocation",
        "Compare static local variables vs automatic local variables",
        "Examine the extern keyword for multi-file symbol linkage"
      ],
      "notes": "# Scope & Storage Classes\\n\\nParameters in C are strictly passed by value. Modifying a parameter inside a function only mutates the local stack copy, leaving caller state untouched."
    },
    {
      "dayNumber": 9,
      "title": "C Arrays: 1D Arrays & Contiguous Memory",
      "subtasks": [
        "Declare and initialize 1D arrays with static sizes",
        "Verify contiguous address spacing using printf with %p and &arr[i]",
        "Implement linear search and array reversal algorithms",
        "Guard against buffer overruns and out-of-bounds indexing bugs"
      ],
      "notes": "# 1D Arrays & Memory Layout\\n\\nArray indexing `arr[i]` is syntactic sugar for `*(arr + i)`. All elements are stored in contiguous bytes."
    },
    {
      "dayNumber": 10,
      "title": "C Arrays: 2D Arrays & Matrix Operations",
      "subtasks": [
        "Declare 2D matrices and initialize with nested brace syntax",
        "Perform matrix addition and matrix transpose in row-major order",
        "Implement matrix multiplication with boundary validation",
        "Calculate memory offsets manually: index = row * COLS + col"
      ],
      "notes": "# 2D Arrays & Matrix Math\\n\\nIn C, multidimensional arrays are laid out in Row-Major order. Accessing row by row optimizes CPU L1/L2 cache line hits."
    },
    {
      "dayNumber": 11,
      "title": "C Strings: char arrays & null terminator '\\0'",
      "subtasks": [
        "Declare string as null-terminated character array: char str[32]",
        "Verify why omitting '\\0' causes printf to print garbage memory",
        "Implement manual string length calculation without strlen()",
        "Read user string safely using fgets(buf, sizeof(buf), stdin)"
      ],
      "notes": "# Null-Terminated Strings in C\\n\\nC has no native string primitive. Strings are character arrays ending in ASCII 0 (`\\\\0`). Always ensure buffers allocate space for the null terminator."
    },
    {
      "dayNumber": 12,
      "title": "C Strings: string.h (strlen, strcpy, strcmp)",
      "subtasks": [
        "Master string comparison using strcmp() and explain return values (<0, 0, >0)",
        "Use safe string functions (strncpy, snprintf) over dangerous strcpy/strcat",
        "Tokenize CSV strings using strtok_r for reentrant parsing",
        "Complete Week 2 project: Text Analyzer & 2D Matrix Engine"
      ],
      "notes": "# String Utilities & Buffer Safety\\n\\nNever use `strcpy` or `gets` in production C code! Use `snprintf` or `strncpy` with explicit destination sizes to prevent buffer overflows."
    },
    {
      "dayNumber": 13,
      "title": "C Pointers: Memory Addresses & & Operator",
      "subtasks": [
        "Declare pointer variables using syntax: int *ptr = &val",
        "Print memory address using & and %p format specifier",
        "Verify pointer size on 64-bit architecture (8 bytes)",
        "Diagram memory pointer relations on paper or visualizer"
      ],
      "notes": "# Pointers: Memory Addresses\\n\\nA pointer stores the hexadecimal memory address of another variable. The address-of operator `&` extracts this location."
    },
    {
      "dayNumber": 14,
      "title": "C Pointers: Dereference * & Pointer Math",
      "subtasks": [
        "Modify original variable value by dereferencing: *ptr = 99",
        "Perform pointer arithmetic (ptr++, ptr + 2) and observe byte increments",
        "Explain relation between pointer addition and sizeof(type)",
        "Demonstrate void* generic pointers and type casting"
      ],
      "notes": "# Dereferencing & Pointer Arithmetic\\n\\n`ptr + 1` increments the address by `sizeof(*ptr)` bytes (e.g., +4 for `int*`, +8 for `double*`). Dereferencing `*ptr` accesses the value at that address."
    },
    {
      "dayNumber": 15,
      "title": "C Pointers: Passing Pointers to Functions",
      "subtasks": [
        "Implement classic swap(int *a, int *b) function via pointers",
        "Pass arrays to functions as (type *arr, size_t size) pairs",
        "Use const pointers (const int *p) to enforce read-only semantics",
        "Trace caller stack modifications during pointer function execution"
      ],
      "notes": "# Pass-by-Reference Simulation\\n\\nBy passing pointer addresses into functions, C functions can directly mutate variables allocated in the caller's stack frame."
    },
    {
      "dayNumber": 16,
      "title": "C Memory: Dynamic Allocation (malloc & calloc)",
      "subtasks": [
        "Allocate heap memory using malloc(n * sizeof(int))",
        "Allocate zero-initialized heap memory using calloc(n, sizeof(int))",
        "Check return value for NULL to handle out-of-memory states safely",
        "Resize dynamic buffer using realloc() without memory corruption"
      ],
      "notes": "# Dynamic Memory Allocation\\n\\nDynamic memory is allocated on the Heap via `malloc()` or `calloc()`. Unlike the stack, heap memory persists until explicitly freed."
    },
    {
      "dayNumber": 17,
      "title": "C Memory: free() & Preventing Memory Leaks",
      "subtasks": [
        "Release allocated heap memory using free(ptr)",
        "Assign ptr = NULL immediately after free() to prevent dangling pointers",
        "Compile with -fsanitize=address or run Valgrind to verify zero memory leaks",
        "Identify and fix double-free error conditions"
      ],
      "notes": "# Memory Safety: Leaks & Dangling Pointers\\n\\nEvery `malloc()` MUST have a matching `free()`. Set pointers to `NULL` after freeing to prevent use-after-free bugs."
    },
    {
      "dayNumber": 18,
      "title": "C Structs: User-Defined Types & typedef",
      "subtasks": [
        "Define custom struct with heterogeneous fields (id, name, score)",
        "Create clean type aliases using typedef struct syntax",
        "Access struct members using dot operator (.): student.score = 95.5",
        "Calculate struct memory padding and alignment using sizeof()"
      ],
      "notes": "# Structures & Memory Alignment\\n\\nStructs allow bundling heterogeneous fields into a single record. Compilers insert padding bytes to ensure CPU word alignment."
    },
    {
      "dayNumber": 19,
      "title": "C Structs: Pointers to Structs & -> Operator",
      "subtasks": [
        "Allocate struct dynamically on the heap via malloc",
        "Access struct members through pointers using arrow operator (->)",
        "Pass struct pointers to functions to avoid expensive stack copies",
        "Free dynamic struct memory and all nested dynamic pointers"
      ],
      "notes": "# Struct Pointers & The Arrow Operator\\n\\n`ptr->field` is equivalent to `(*ptr).field`. Passing pointers to structs avoids copying large memory buffers on the call stack."
    },
    {
      "dayNumber": 20,
      "title": "C Files: fopen, fclose, fprintf, fscanf",
      "subtasks": [
        "Open text file in write mode ('w') and check for NULL handle",
        "Write formatted structured records using fprintf()",
        "Open file in read mode ('r') and parse data using fscanf() / fgets()",
        "Ensure fclose() is called on all code paths to flush buffers"
      ],
      "notes": "# File I/O in C\\n\\nFile streams are represented by `FILE*`. Always verify `f != NULL` before reading/writing and close every stream with `fclose()`."
    },
    {
      "dayNumber": 21,
      "title": "C Preprocessor: #define, #include & Macros",
      "subtasks": [
        "Define compile-time constants and inline function-like macros",
        "Implement header include guards using #ifndef, #define, #endif",
        "Test conditional compilation flags (#ifdef DEBUG, #endif)",
        "Explain pitfalls of macro parameter evaluation without parentheses"
      ],
      "notes": "# The C Preprocessor\\n\\nThe preprocessor runs before the compiler. Always wrap macro parameters in parentheses: `#define SQUARE(x) ((x) * (x))`."
    },
    {
      "dayNumber": 22,
      "title": "C Project: CLI Student / Task Manager Part 1",
      "subtasks": [
        "Design core domain struct (Task / Student) with dynamic resizing array",
        "Implement CLI command loop (Create, List, Search, Delete)",
        "Validate user inputs with defensive bounds checking",
        "Handle dynamic reallocation smoothly when capacity threshold is reached"
      ],
      "notes": "# Capstone Architecture: CLI Engine\\n\\nBuild modular separation: Domain models in headers (`tasks.h`), implementation in `tasks.c`, and CLI interface in `main.c`."
    },
    {
      "dayNumber": 23,
      "title": "C Project: File Storage & Search Part 2",
      "subtasks": [
        "Serialize all records to disk on shutdown using binary/text file I/O",
        "Deserialize records automatically upon application startup",
        "Add binary search algorithm over sorted records for instant retrieval",
        "Run Valgrind address sanitizer to guarantee zero memory leaks"
      ],
      "notes": "# Persistence & Algorithmic Search\\n\\nPersist records sequentially with explicit separators or binary structures (`fwrite`). Verify zero memory leaks using `-fsanitize=address`."
    },
    {
      "dayNumber": 24,
      "title": "C Review: Final Mock Exam & Comprehensive Debugging",
      "subtasks": [
        "Complete 30-question C systems and pointers mock exam",
        "Debug complex GDB stack traces and segfault memory dumps",
        "Refactor capstone codebase adhering to Linux kernel coding standards",
        "Export polished PDF lecture summary and certification checklist"
      ],
      "notes": "# Final Comprehensive Review\\n\\nCongratulations on mastering C! You understand virtual memory, the compilation toolchain, pointer arithmetic, and heap allocation."
    }
  ]
};
