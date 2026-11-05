import { getDb, studyNotes, subjects, eq, and } from '@open-sunsama/database';

export const C_LECTURE_DECKS = [
  {
    title: "Lecture 1: C Architecture, Compilation Pipeline & Toolchain (GCC/Clang)",
    body: `## [SLIDE 1] 🎯 Course Objectives & Systems Motivation
Welcome to the C Systems Programming Series! C is the foundation of modern computing—powering the Linux kernel, Windows OS, Git, Postgres, Python's runtime (CPython), and NASA's flight systems.

### 🎯 Key Learning Objectives
* Understand why C offers unmatched hardware control and execution speed.
* Master the 4 stages of the GCC/Clang compilation pipeline.
* Visualize how a program is mapped into Virtual Memory.

💡 **Professor's Tip:** In higher-level languages (Python, Java), memory is managed by garbage collectors. In C, **you are the operating system's partner**—you have direct access to memory addresses and hardware registers.

---

## [SLIDE 2] 🧠 The 4-Stage Compilation Pipeline
When you execute \`gcc -Wall -Wextra main.c -o app\`, the toolchain runs 4 distinct processors:

\`\`\`text
Source Code (main.c)
      │ 1. Preprocessor (cpp)
      │    - Evaluates #include <stdio.h> and #define
      │    - Strips comments
      ▼
Expanded Source (main.i)
      │ 2. Compiler (cc1)
      │    - Syntax analysis, AST generation & Optimization
      │    - Generates x86-64 / ARM assembly instructions
      ▼
Assembly File (main.s)
      │ 3. Assembler (as)
      │    - Translates assembly into binary machine opcodes
      ▼
Relocatable Object File (main.o)
      │ 4. Linker (ld)
      │    - Combines object files with C Runtime Library (libc)
      ▼
Final Executable Binary (app / app.exe)
\`\`\`

---

## [SLIDE 3] 🏗️ Virtual Process Memory Layout
When the operating system launches your binary, it creates a virtual address space partitioned into 5 key segments:

| Memory Segment | Growth Direction | Lifetime | Contents |
| :--- | :--- | :--- | :--- |
| **Stack** | Grows Downward (↓) | Automatic (per function frame) | Local variables, function arguments, return addresses |
| **Heap** | Grows Upward (↑) | Manual (\`malloc\` → \`free\`) | Dynamic memory allocations requested at runtime |
| **BSS Segment** | Fixed | Entire program run | Uninitialized global & \`static\` variables (auto-zeroed) |
| **Data Segment**| Fixed | Entire program run | Initialized global & \`static\` variables (e.g. \`int g = 42;\`) |
| **Text Segment**| Fixed (Read-Only) | Permanent | Machine instructions & string literals (e.g. \`"Hello"\`) |

⚠️ **Teacher's Warning:** Writing to the Read-Only Text Segment (e.g. modifying a string literal \`char *s = "hi"; s[0] = 'b';\`) triggers an instant **Segmentation Fault (SIGSEGV)**!

---

## [SLIDE 4] 💻 Working Code & Line-by-Line Breakdown
Here is the canonical, standard-compliant entry point:

\`\`\`c
#include <stdio.h>

/**
 * Main Entry Point
 * @param argc Number of CLI arguments
 * @param argv Array of CLI argument strings
 * @return 0 on success, non-zero on system failure
 */
int main(int argc, char *argv[]) {
    printf("StudyOS Systems Series: GCC v14.2 Initialized!\\n");
    printf("Arguments Count: %d\\n", argc);
    
    for (int i = 0; i < argc; i++) {
        printf("  argv[%d] = %s\\n", i, argv[i]);
    }
    
    return 0; // Return code 0 signals SUCCESS to the shell
}
\`\`\`

### 🛠️ Strict Compilation Flags
Always build with strict diagnostic flags:
\`\`\`bash
gcc -std=c17 -Wall -Wextra -Werror -pedantic -g main.c -o app
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
Here are the 3 most frequent mistakes on university exams:

1. **Missing \`#include <stdio.h>\`:** In older C standards, \`printf\` was assumed to return \`int\`. In C17/C23, this is an error or severe warning.
2. **Missing \`return 0;\` in non-main functions:** While C99 allows omitting \`return 0\` in \`main()\`, omitting a return value in any other function produces **Undefined Behavior**.
3. **Capitalization in \`Main\`:** C is case-sensitive! \`Main()\` will compile into an object file but the Linker will fail with \`undefined reference to 'main'\`.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
Test your understanding before moving to Lecture 2:

* **Q1:** Which toolchain stage is responsible for resolving external functions like \`printf\`?
  * *Answer:* The Linker (\`ld\`).
* **Q2:** Where are local function variables allocated?
  * *Answer:* On the Stack inside the active stack frame.
* **Q3:** What does \`gcc -Wall\` do?
  * *Answer:* Enables "all standard compiler warnings" to catch bugs before execution.`
  },
  {
    title: "Lecture 2: Variables, Primitive Types, Memory Sizes & Format Specifiers",
    body: `## [SLIDE 1] 🎯 Course Objectives & Core Concept
In C, every variable is a named memory location with a fixed byte width. Understanding exact memory representations is critical for systems programming and embedded engineering.

### 🎯 Key Learning Objectives
* Memorize standard byte widths and integer ranges.
* Use portable fixed-width integers from \`<stdint.h>\`.
* Understand Two's Complement signed representation.
* Master format specifiers to avoid memory corruption in \`printf\` and \`scanf\`.

---

## [SLIDE 2] 🧠 Primitive Data Types & Exact Memory Sizing

| Type Name | Byte Size | Minimum Value | Maximum Value | Format Specifier |
| :--- | :--- | :--- | :--- | :--- |
| \`char\` | 1 byte (8 bits) | -128 | +127 | \`%c\` or \`%d\` |
| \`unsigned char\` | 1 byte | 0 | 255 | \`%u\` |
| \`short\` | 2 bytes (16 bits) | -32,768 | +32,767 | \`%hd\` |
| \`int\` | 4 bytes (32 bits) | -2,147,483,648 | +2,147,483,647 | \`%d\` or \`%i\` |
| \`unsigned int\`| 4 bytes | 0 | 4,294,967,295 | \`%u\` |
| \`long long\` | 8 bytes (64 bits)| -9.22 × 10¹⁸ | +9.22 × 10¹⁸ | \`%lld\` |
| \`float\` | 4 bytes (IEEE 754)| ~1.2 × 10⁻³⁸ | ~3.4 × 10³⁸ (6 sig figs) | \`%f\` |
| \`double\` | 8 bytes (IEEE 754)| ~2.2 × 10⁻³⁰⁸ | ~1.8 × 10³⁰⁸ (15 sig figs)| \`%lf\` |
| \`void*\` (Pointer)| 8 bytes (on 64-bit)| \`0x0000000000000000\` | \`0xFFFFFFFFFFFFFFFF\` | \`%p\` |

---

## [SLIDE 3] 🏗️ Portable Fixed-Width Types (\`<stdint.h>\`)
Because the size of \`int\` and \`long\` varies between platforms (32-bit vs 64-bit, Windows vs Linux), professional systems engineers use \`<stdint.h>\`:

\`\`\`c
#include <stdio.h>
#include <stdint.h>
#include <inttypes.h>

int main(void) {
    int8_t   smallByte   = -128;         // Exactly 8 bits signed
    uint8_t  pixelAlpha  = 255;          // Exactly 8 bits unsigned (0-255)
    int32_t  packetId    = 1048576;      // Exactly 32 bits signed
    uint64_t memoryLimit = 0xFFFFFFFF;   // Exactly 64 bits unsigned

    printf("Pixel: %u\\n", pixelAlpha);
    printf("64-bit hex: 0x%" PRIx64 "\\n", memoryLimit);
    return 0;
}
\`\`\`

💡 **Professor's Tip:** When writing network protocols or device drivers, always use \`uint8_t\` and \`uint32_t\` so your code never breaks when compiled on a different architecture!

---

## [SLIDE 4] 💻 Type Casting: Implicit Promotion vs Explicit Casts
\`\`\`c
#include <stdio.h>

int main(void) {
    int totalQuestions = 5;
    int correctAnswers = 4;

    // ❌ TRUNCATED INTEGER DIVISION BUG:
    // Both operands are int, so 4 / 5 yields 0. Result is 0.00!
    double badGrade = correctAnswers / totalQuestions; 

    // ✅ CORRECT EXPLICIT CAST:
    // Casting one operand to double forces floating-point division: 4.0 / 5 = 0.80
    double goodGrade = (double)correctAnswers / totalQuestions;

    printf("Bad calculation:  %.2f%%\\n", badGrade * 100);  // 0.00%
    printf("Good calculation: %.2f%%\\n", goodGrade * 100); // 80.00%
    return 0;
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **The \`scanf\` Address Trap:**
   * ❌ \`scanf("%d", num);\`: Crashes! \`scanf\` expects a pointer to memory, not the value!
   * ✅ \`scanf("%d", &num);\`: Passes the memory address using the \`&\` operator.
2. **Integer Overflow:**
   * If an 8-bit signed integer has value \`127\` (\`01111111\`) and you add \`1\`, it overflows to \`-128\` (\`10000000\`) in Two's Complement arithmetic!
3. **Float Precision Loss:**
   * Never compare floating-point numbers with \`==\` (\`if (f == 0.1)\`) due to binary rounding errors. Always compare with an epsilon: \`fabs(a - b) < 0.00001\`.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the byte size of \`double\` on modern 64-bit systems?
  * *Answer:* 8 bytes (64 bits).
* **Q2:** Why does \`(double)(5 / 2)\` evaluate to \`2.0\` instead of \`2.5\`?
  * *Answer:* The parentheses evaluate integer division \`5 / 2 = 2\` first, before the cast is applied!`
  },
  {
    title: "Lecture 3: Operators, Boolean Logic & Control Flow (if-else, switch)",
    body: `## [SLIDE 1] 🎯 Course Objectives & Core Concept
Control flow directs the CPU's instruction pointer through conditional branches. In C, decisions are executed using boolean logic, bitmasking, and jump tables.

### 🎯 Key Learning Objectives
* Understand short-circuit evaluation in \`&&\` and \`||\`.
* Manipulate hardware flags using bitwise operators (\`&\`, \`|\`, \`^\`, \`~\`, \`<<\`, \`>>\`).
* Utilize the \`switch\` jump table for O(1) multi-way branch dispatch.

---

## [SLIDE 2] 🧠 Short-Circuit Boolean Evaluation
In C, boolean logic is optimized:
* In \`A && B\`: If \`A\` is \`false\`, \`B\` is **NEVER executed**.
* In \`A || B\`: If \`A\` is \`true\`, \`B\` is **NEVER executed**.

\`\`\`c
#include <stdio.h>
#include <stdbool.h>

bool pingDatabase(void) {
    printf("[NETWORK] Contacting database...\\n");
    return true;
}

int main(void) {
    bool hasCachedCredentials = true;

    // Because left operand is TRUE, pingDatabase() is NEVER called!
    if (hasCachedCredentials || pingDatabase()) {
        printf("Access granted instantly via short-circuit cache!\\n");
    }
    return 0;
}
\`\`\`

---

## [SLIDE 3] 🏗️ Bitwise Operators & Hardware Bitmasking
In embedded microcontrollers and OS kernels, memory is conserved by packing multiple boolean flags into a single byte:

\`\`\`c
#include <stdio.h>
#include <stdint.h>

#define PERMISSION_READ    (1 << 0) // 0b00000001
#define PERMISSION_WRITE   (1 << 1) // 0b00000010
#define PERMISSION_EXECUTE (1 << 2) // 0b00000100

int main(void) {
    uint8_t fileFlags = 0;

    // Enable READ and WRITE permissions using bitwise OR (|)
    fileFlags |= (PERMISSION_READ | PERMISSION_WRITE);

    // Test permission using bitwise AND (&)
    if (fileFlags & PERMISSION_WRITE) {
        printf("Write permission is active.\\n");
    }

    // Revoke WRITE permission using bitwise AND with NOT (& ~)
    fileFlags &= ~PERMISSION_WRITE;

    return 0;
}
\`\`\`

---

## [SLIDE 4] 💻 High-Speed Switch Branching & Jump Tables
When you have multiple discrete integer branches, a \`switch\` statement is compiled into an O(1) **jump table** in assembly, far outperforming chained \`if-else\` ladders:

\`\`\`c
typedef enum {
    LOG_INFO,
    LOG_WARNING,
    LOG_ERROR,
    LOG_FATAL
} LogSeverity;

void dispatchLog(LogSeverity level, const char *msg) {
    switch (level) {
        case LOG_INFO:
            printf("[INFO] %s\\n", msg);
            break;
        case LOG_WARNING:
            printf("[WARN] %s\\n", msg);
            break;
        case LOG_ERROR:
        case LOG_FATAL: // Intentional fall-through
            fprintf(stderr, "[CRITICAL] %s\\n", msg);
            break;
        default:
            printf("[UNKNOWN] %s\\n", msg);
            break;
    }
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Assignment in \`if\` condition:**
   * ❌ \`if (status = 1)\`: Sets \`status\` to 1 and evaluates to true!
   * ✅ \`if (status == 1)\`: Compares for equality.
   * 💡 *Yoda Conditions:* Writing \`if (1 == status)\` prevents accidental assignment because \`1 = status\` will cause a compile-time error!
2. **Missing \`break\` in \`switch\`:**
   * Omitting \`break\` causes execution to fall through to subsequent cases, a common source of exam point loss.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the result of \`5 & 3\` in binary?
  * *Answer:* \`5\` is \`101_2\`, \`3\` is \`011_2\`. \`101 & 011 = 001_2 = 1\`.
* **Q2:** What happens if the first condition in \`if (ptr != NULL && *ptr == 42)\` is false?
  * *Answer:* Short-circuit evaluation halts check immediately, safely preventing a NULL dereference crash!`
  },
  {
    title: "Lecture 4: Loops & Iterative Algorithms (for, while, do-while)",
    body: `## [SLIDE 1] 🎯 Course Objectives & Core Concept
Loops allow repeated execution of code blocks. In C, choosing the right loop construct ensures algorithm efficiency and robust handling of input edge cases.

### 🎯 Key Learning Objectives
* Compare execution guarantees: \`while\` vs \`for\` vs \`do-while\`.
* Build fail-safe input loops that clean standard input buffers.
* Understand time complexity in nested loop algorithms.

---

## [SLIDE 2] 🧠 Loop Construct Comparison

| Loop Construct | Condition Check | Minimum Runs | Typical Industry Application |
| :--- | :--- | :--- | :--- |
| \`while (cond)\` | Pre-test (entry) | **0 times** | File stream reading (\`while (ch != EOF)\`), network polling |
| \`for (init; cond; step)\` | Pre-test (entry) | **0 times** | Fixed-count iteration, array traversal, matrix operations |
| \`do { ... } while (cond);\` | Post-test (exit) | **At least 1 time** | User prompt validation, menu drivers, transaction retries |

---

## [SLIDE 3] 🏗️ Bulletproof Stdin Validation with \`do-while\`
A major source of student program crashes is non-numeric input into \`scanf\`. Here is the industry-standard validation loop:

\`\`\`c
#include <stdio.h>

int promptValidatedAge(void) {
    int age = -1;
    int itemsScanned = 0;

    do {
        printf("Enter age (1 to 120): ");
        itemsScanned = scanf("%d", &age);

        // If user typed letters, scanf fails and leaves characters in stdin!
        if (itemsScanned != 1) {
            int ch;
            // Flush remaining characters until newline
            while ((ch = getchar()) != '\\n' && ch != EOF);
            printf("Invalid character entered. Numbers only!\\n");
            age = -1;
        }
    } while (age < 1 || age > 120);

    return age;
}
\`\`\`

---

## [SLIDE 4] 💻 Matrix Operations & Algorithmic Complexity
\`\`\`c
#define ROWS 3
#define COLS 3

void printMatrixDiagonal(int matrix[ROWS][COLS]) {
    // Nested loop: Outer runs ROWS times, Inner runs COLS times -> O(ROWS * COLS)
    for (int r = 0; r < ROWS; r++) {
        for (int c = 0; c < COLS; c++) {
            if (r == c) {
                printf("[%d]", matrix[r][c]); // Diagonal element
            } else {
                printf(" . ");
            }
        }
        printf("\\n");
    }
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Off-by-One Errors (\`OBOE\`):**
   * An array of size \`N\` has valid indices from \`0\` to \`N - 1\`. Writing \`for (int i = 0; i <= N; i++)\` accesses out-of-bounds memory on the final iteration!
2. **Infinite Loops with \`unsigned\` Counters:**
   * ❌ \`for (unsigned int i = 10; i >= 0; i--)\`: Because an unsigned int is ALWAYS \`>= 0\`, when \`i\` is 0 and decrements, it underflows to \`4,294,967,295\`, looping infinitely!

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** Which loop is guaranteed to execute its body at least once?
  * *Answer:* The \`do-while\` loop.
* **Q2:** How do you exit a loop immediately before the condition is met?
  * *Answer:* The \`break;\` statement.`
  },
  {
    title: "Lecture 5: Functions, Call Stack, Variable Scope & Recursion",
    body: `## [SLIDE 1] 🎯 Course Objectives & Core Concept
Functions are the modular building blocks of C. In C, all arguments are strictly passed by value. Understanding stack frame allocation is essential for debugging and recursion.

### 🎯 Key Learning Objectives
* Understand Call-by-Value semantics and why pointers are required for mutations.
* Inspect the Activation Record (Stack Frame) created on each function call.
* Contrast storage classes: \`auto\`, \`static\`, \`extern\`.
* Formulate robust recursive functions with base cases.

---

## [SLIDE 2] 🧠 Call-by-Value vs Pointers (The Swap Problem)
In C, when you pass an argument to a function, the runtime creates a **copy** of the variable on the function's stack frame:

\`\`\`c
// ❌ FAILS: Modifies local stack copies only!
void badSwap(int a, int b) {
    int temp = a;
    a = b;
    b = temp;
}

// ✅ SUCCEEDS: Receives pointers (memory addresses) to the original variables
void goodSwap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}
\`\`\`

---

## [SLIDE 3] 🏗️ Variable Scope & The \`static\` Keyword
The \`static\` keyword changes variable lifetime and symbol visibility:

\`\`\`c
#include <stdio.h>

void executeRequest(void) {
    auto int localId = 0;          // Recreated and destroyed on every call
    static int persistentCounter = 0; // Initialized ONCE in Data Segment, persists forever!

    localId++;
    persistentCounter++;

    printf("Local: %d, Persistent: %d\\n", localId, persistentCounter);
}

int main(void) {
    executeRequest(); // Local: 1, Persistent: 1
    executeRequest(); // Local: 1, Persistent: 2
    executeRequest(); // Local: 1, Persistent: 3
    return 0;
}
\`\`\`

---

## [SLIDE 4] 💻 Recursion Anatomy: Base Case vs Recursive Call
\`\`\`c
#include <stdio.h>

/**
 * Computes Factorial: N! = N * (N - 1)!
 * Time: O(N), Space: O(N) stack frames
 */
long long factorial(int n) {
    // 1. Mandatory Base Case: Stops the recursion
    if (n <= 1) {
        return 1;
    }
    // 2. Recursive Step: Solves smaller sub-problem
    return n * factorial(n - 1);
}
\`\`\`

⚠️ **Teacher's Warning:** If the base case is omitted or unreachable, the function pushes stack frames until process stack memory is exhausted, causing an unrecoverable **Stack Overflow crash**!

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Returning a Pointer to a Local Stack Variable:**
   * ❌ \`int* getScore() { int s = 100; return &s; }\`: The variable \`s\` is destroyed when the function returns! The returned pointer is a **Dangling Pointer** pointing to corrupted memory.
2. **Missing Function Prototype:**
   * Calling a function defined later in the file without a preceding forward declaration (\`int compute(int x);\`) triggers compiler warnings or errors in C17.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What happens to an \`auto\` local variable when its function returns?
  * *Answer:* Its stack frame is popped and the memory is reclaimed.
* **Q2:** Where is a \`static\` local variable stored in process memory?
  * *Answer:* In the Data Segment (or BSS), NOT on the Stack.`
  },
  {
    title: "Lecture 6: 1D & 2D Arrays, Matrices, and String Manipulation",
    body: `## [SLIDE 1] 🎯 Course Objectives & Core Concept
Arrays provide contiguous memory for indexed data. In C, strings are simply null-terminated character arrays. Mastering bounds safety and standard string algorithms is fundamental.

### 🎯 Key Learning Objectives
* Master row-major order memory indexing in multi-dimensional arrays.
* Understand the role of the null terminator (\`'\\\\0'\`).
* Utilize safe string functions from \`<string.h>\` to prevent Buffer Overflows.

---

## [SLIDE 2] 🧠 Array Decay & Contiguous Memory
An array name \`arr\` decays into a pointer to its first element (\`&arr[0]\`) when passed into functions:

\`\`\`c
#include <stdio.h>

// When passed to a function, arr[] is actually int *arr!
void printArray(const int arr[], size_t length) {
    // sizeof(arr) here returns 8 (pointer size), NOT total bytes of array!
    for (size_t i = 0; i < length; i++) {
        printf("arr[%zu] = %d (address: %p)\\n", i, arr[i], (void*)&arr[i]);
    }
}
\`\`\`

💡 **Professor's Tip:** In C, arrays do NOT know their own length! You must **always pass the length** as an explicit argument.

---

## [SLIDE 3] 🏗️ C Strings & The Null Terminator (\`'\\\\0'\`)
A C string is an array of characters terminated by the null byte \`0\` (\`'\\\\0'\`):

\`\`\`text
char str[6] = "Study";
Memory: [ 'S' ][ 't' ][ 'u' ][ 'd' ][ 'y' ][ '\\\\0' ]
Index:     0      1      2      3      4      5
\`\`\`

\`\`\`c
#include <stdio.h>
#include <string.h>

int main(void) {
    char greeting[32] = "StudyOS";
    
    // strlen measures count up to '\\0' (excludes null terminator): 7
    printf("String length: %zu\\n", strlen(greeting));
    // sizeof returns total allocated buffer capacity: 32 bytes
    printf("Buffer capacity: %zu\\n", sizeof(greeting));
    
    return 0;
}
\`\`\`

---

## [SLIDE 4] 💻 Safe String Operations vs Dangerous Legacy Functions
Buffer overflows occur when a program writes beyond an array's boundary. They account for some of history's most severe cybersecurity vulnerabilities.

\`\`\`c
#include <stdio.h>
#include <string.h>

int main(void) {
    char source[] = "University Engineering";
    char safeBuffer[16];

    // ❌ BANNED: strcpy(safeBuffer, source); // Overflows safeBuffer (22 bytes into 16)!

    // ✅ SAFE: strncpy with explicit bound enforcement
    strncpy(safeBuffer, source, sizeof(safeBuffer) - 1);
    safeBuffer[sizeof(safeBuffer) - 1] = '\\\\0'; // Guarantee null-termination

    printf("Safely truncated: %s\\n", safeBuffer);
    return 0;
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Using \`gets()\`:**
   * Never use \`gets()\`—it has no boundary check and was officially removed in C11. Always use \`fgets(buffer, sizeof(buffer), stdin)\`.
2. **Comparing Strings with \`==\`:**
   * ❌ \`if (str1 == str2)\`: Compares pointer addresses, NOT character content!
   * ✅ \`if (strcmp(str1, str2) == 0)\`: Returns 0 when characters match.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is stored at the final index of every valid C string?
  * *Answer:* The null terminator character \`'\\\\0'\` (byte value 0).
* **Q2:** What does \`strcmp("apple", "banana")\` return?
  * *Answer:* A negative integer (because \`'a'\` has a lower ASCII code than \`'b'\`).`
  },
  {
    title: "Lecture 7: Pointers, Memory Addresses & Dynamic Allocation (malloc/free/valgrind)",
    body: `## [SLIDE 1] 🎯 Course Objectives & Core Concept
Pointers are the defining superpower of C. A pointer variable stores the numeric memory address of another variable in RAM.

### 🎯 Key Learning Objectives
* Understand the address-of (\`&\`) and dereference (\`*\`) operators.
* Compute pointer arithmetic scaled by \`sizeof(T)\`.
* Allocate runtime Heap memory using \`malloc()\`, \`calloc()\`, \`realloc()\`, and \`free()\`.
* Prevent Memory Leaks, Dangling Pointers, and Double-Frees using Valgrind.

---

## [SLIDE 2] 🧠 The Two Pointer Operators
* **Address-of Operator (\`&\`):** Retrieves the physical memory address of a variable.
* **Dereference Operator (\`*\`):** Accesses or mutates the value stored at that address.

\`\`\`c
#include <stdio.h>

int main(void) {
    int target = 42;
    int *ptr = &target; // ptr holds the address of target

    printf("Value of target:           %d\\n", target);
    printf("Address of target (&target): %p\\n", (void*)&target);
    printf("Value stored in ptr:       %p\\n", (void*)ptr);
    printf("Dereferenced value (*ptr): %d\\n", *ptr);

    // Mutate the original variable through the pointer!
    *ptr = 99;
    printf("New value of target:       %d\\n", target); // Prints 99

    return 0;
}
\`\`\`

---

## [SLIDE 3] 🏗️ Pointer Arithmetic Mechanics
When you add an integer \`k\` to a pointer \`ptr\`, the address is shifted by \`k * sizeof(*ptr)\` bytes:

\`\`\`c
int numbers[3] = {10, 20, 30};
int *p = numbers; // Points to numbers[0] (e.g. 0x1000)

p = p + 1; // Advances by 4 bytes (sizeof(int))! Points to 0x1004 (numbers[1])
printf("Value: %d\\n", *p); // 20
\`\`\`

---

## [SLIDE 4] 💻 Dynamic Memory Allocation on the Heap
Stack variables are bound to their function lifetime. When data must survive across function returns or has a runtime-determined size, allocate on the Heap:

\`\`\`c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int count = 5;

    // calloc allocates memory AND zeroes every byte (prevents garbage values)
    int *scores = (int*)calloc(count, sizeof(int));
    
    // 1. Mandatory NULL check: Protects against out-of-memory errors
    if (scores == NULL) {
        fprintf(stderr, "Fatal: Out of memory!\\n");
        return 1;
    }

    for (int i = 0; i < count; i++) {
        scores[i] = (i + 1) * 20;
    }

    // 2. Mandatory Cleanup: Prevent memory leak
    free(scores);
    
    // 3. Prevent dangling pointer
    scores = NULL; 

    return 0;
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps: The 3 Cardinal Memory Sins
1. **Memory Leak:** Allocating with \`malloc\` without calling \`free()\`. Memory remains occupied until process termination.
2. **Dangling Pointer:** Accessing memory after calling \`free(ptr)\` (Use-After-Free).
3. **Double Free:** Calling \`free()\` twice on the same memory address, corrupting the heap manager.

💡 **Detection:** Compile with AddressSanitizer: \`gcc -fsanitize=address -g main.c\` or run under \`valgrind --leak-check=full ./app\`.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the difference between \`malloc\` and \`calloc\`?
  * *Answer:* \`malloc\` leaves memory uninitialized (filled with garbage), while \`calloc\` zeroes every byte.
* **Q2:** If \`int *p = (int*)0x1000\`, what is the address of \`p + 2\` on a 32-bit int system?
  * *Answer:* \`0x1000 + (2 * 4) = 0x1008\`.`
  },
  {
    title: "Lecture 8: Structures, Typedef, Enums, and File I/O Serialization",
    body: `## [SLIDE 1] 🎯 Course Objectives & Core Concept
Real-world systems model complex entities (students, tasks, packets) by composing heterogeneous primitive types into \`struct\` objects and serializing them to disk.

### 🎯 Key Learning Objectives
* Define clean compound models using \`typedef struct\`.
* Understand memory alignment and byte padding.
* Master the arrow operator (\`->\`) vs dot operator (\`.\`).
* Read and write persistent records to disk using \`<stdio.h>\` streams.

---

## [SLIDE 2] 🧠 Structs & The Arrow Operator (\`->\`)
A struct bundles disparate variables into a single continuous memory layout:

\`\`\`c
#include <stdio.h>
#include <string.h>

typedef struct {
    int id;
    char title[64];
    double score;
    int isCompleted;
} TaskRecord;

// Pass by const pointer to avoid copying 80+ bytes on each function call!
void displayTask(const TaskRecord *t) {
    // The arrow operator (->) dereferences the pointer: (*t).title
    printf("[%c] Task #%d: %s (Score: %.1f)\\n",
           t->isCompleted ? 'X' : ' ',
           t->id,
           t->title,
           t->score);
}
\`\`\`

---

## [SLIDE 3] 🏗️ Struct Memory Alignment & Padding
The CPU reads memory more efficiently when 4-byte integers align on 4-byte boundaries:

\`\`\`c
struct BadPadding {
    char a;   // 1 byte
    // 3 bytes of compiler padding inserted here!
    int b;    // 4 bytes
    char c;   // 1 byte
    // 3 bytes of compiler padding inserted here!
}; // Total size = 12 bytes!

struct OptimizedPadding {
    int b;    // 4 bytes
    char a;   // 1 byte
    char c;   // 1 byte
    // 2 bytes of compiler padding
}; // Total size = 8 bytes! (33% memory saved)
\`\`\`

---

## [SLIDE 4] 💻 Persistent File Serialization to Disk
\`\`\`c
#include <stdio.h>
#include <stdlib.h>

void saveTaskToFile(const TaskRecord *t, const char *filename) {
    FILE *fp = fopen(filename, "w"); // Open for writing
    if (!fp) {
        perror("Error opening file");
        return;
    }
    
    // Write pipe-delimited record
    fprintf(fp, "%d|%s|%.2f|%d\\n", t->id, t->title, t->score, t->isCompleted);
    fclose(fp); // Always flush and close file descriptor!
}

int loadTaskFromFile(TaskRecord *t, const char *filename) {
    FILE *fp = fopen(filename, "r"); // Open for reading
    if (!fp) return 0;

    int matched = fscanf(fp, "%d|%63[^|]|%lf|%d\\n",
                         &t->id, t->title, &t->score, &t->isCompleted);
    fclose(fp);
    return matched == 4; // Returns true if all 4 fields parsed successfully
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Forgetting to check \`fopen\`:**
   * If a file cannot be opened (permissions, missing path), \`fopen\` returns \`NULL\`. Dereferencing a NULL file pointer crashes the program.
2. **Buffer size specifier in \`fscanf\`:**
   * Always write \`%63[^|]\` rather than \`%s\` so \`fscanf\` never writes more than 63 characters into a 64-character buffer!

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz & Capstone Guide
* **Q1:** What does \`t->id\` do?
  * *Answer:* Dereferences pointer \`t\` and accesses member \`id\` (shorthand for \`(*t).id\`).
* **Q2:** Why should large structs always be passed by pointer rather than by value?
  * *Answer:* Passing by value copies the entire struct byte-for-byte to the stack, wasting CPU cycles and memory.`
  }
];

export async function seedLectureDecksForUser(userId) {
  const db = getDb();
  const [cSubject] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.userId, userId), eq(subjects.name, 'C Programming & Systems Foundations')));

  const subjectId = cSubject?.id ?? null;

  if (subjectId) {
    await db.delete(studyNotes).where(and(eq(studyNotes.userId, userId), eq(studyNotes.subjectId, subjectId)));
  }

  const values = C_LECTURE_DECKS.map((d) => ({
    userId,
    title: d.title,
    body: d.body,
    subjectId,
    revision: 1,
  }));

  const inserted = await db.insert(studyNotes).values(values).returning({ id: studyNotes.id, title: studyNotes.title });
  console.log('Successfully seeded', inserted.length, 'lecture slide decks for user:', userId);
  return inserted;
}

if (process.argv[1]?.endsWith('seed-study-notes.mjs')) {
  process.env.DATABASE_URL = 'postgresql://postgres.sdydpcfttodngamwnjek:Sai238313%40%23%24@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';
  await seedLectureDecksForUser('96d642b2-83ee-4eec-8fa2-cca75f04f87f');
}
