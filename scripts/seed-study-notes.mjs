import { getDb, studyNotes, subjects, eq, and } from '@open-sunsama/database';

export const C_STUDY_NOTES = [
  {
    title: "Module 1: C Architecture, Compilation Pipeline & Toolchain (GCC/Clang)",
    body: `# Module 1: C Architecture, Compilation Pipeline & Toolchain

## 1. Executive Summary & Historical Foundation
The C programming language was created by Dennis Ritchie at Bell Labs (1972) to implement the Unix operating system. It remains the lingua franca of systems software, operating system kernels (Linux, Windows NT, macOS XNU), embedded microcontrollers, and high-performance game engines.

## 2. The 4-Stage Compilation Process
When you compile a source file (\`gcc -Wall -Wextra main.c -o app\`), the GNU Compiler Collection performs four distinct transformations:

\`\`\`text
[main.c] 
   │  1. Preprocessing (cpp)
   │     - Expands #include headers
   │     - Replaces #define macros
   │     - Strips comments (// and /* */)
   ▼
[main.i] (Intermediate Expanded Source)
   │  2. Compilation (cc1)
   │     - Tokenization, parsing, AST generation
   │     - Optimization (-O2, -O3)
   │     - Generates assembly code
   ▼
[main.s] (Assembly Code)
   │  3. Assembly (as)
   │     - Translates assembly into machine instructions
   │     - Emits relocatable object file
   ▼
[main.o] (Relocatable Object File)
   │  4. Linking (ld)
   │     - Resolves external symbols (e.g. printf from libc)
   │     - Combines object files and libraries
   ▼
[app / app.exe] (Final Executable Binary)
\`\`\`

## 3. Virtual Process Memory Layout
When the operating system loads your compiled binary into RAM, it assigns it a continuous virtual address space partitioned into distinct segments:

\`\`\`text
High Address  0xFFFFFFFF ┌───────────────────────────────────┐
                         │ Stack (Grows Downward ↓)          │
                         │ - Function frames & parameters    │
                         │ - Local variables                 │
                         ├───────────────────────────────────┤
                         │                 ↓                 │
                         │                                   │
                         │                 ↑                 │
                         ├───────────────────────────────────┤
                         │ Heap (Grows Upward ↑)             │
                         │ - Dynamic allocations (malloc)    │
                         ├───────────────────────────────────┤
                         │ BSS Segment                       │
                         │ - Uninitialized globals & statics │
                         ├───────────────────────────────────┤
                         │ Data Segment                      │
                         │ - Initialized globals & statics   │
                         ├───────────────────────────────────┤
Low Address   0x00000000 │ Text / Code Segment (Read-Only)   │
                         │ - Compiled machine instructions   │
                         └───────────────────────────────────┘
\`\`\`

## 4. First Compilable Program
\`\`\`c
#include <stdio.h>

/**
 * Standard Entry Point
 * @param argc Argument count passed from CLI
 * @param argv Array of argument strings
 * @return 0 on success, non-zero on error
 */
int main(int argc, char *argv[]) {
    printf("StudyOS Systems Kernel v1.0 Initialized!\\n");
    printf("Arguments received: %d\\n", argc);
    for (int i = 0; i < argc; i++) {
        printf("  argv[%d] = %s\\n", i, argv[i]);
    }
    return 0; // Success
}
\`\`\`

## 5. Professional Build Flags
Always compile your code with strict diagnostic flags enabled:
\`\`\`bash
gcc -std=c17 -Wall -Wextra -Werror -pedantic -g main.c -o app
\`\`\`
* \`-std=c17\`: Enforces the ISO C17 standard.
* \`-Wall -Wextra\`: Enables all standard and supplementary compiler warnings.
* \`-Werror\`: Treats every warning as a hard compiler error.
* \`-g\`: Emits DWARF debug symbols for GDB and LLDB.`
  },
  {
    title: "Module 2: Variables, Primitive Types, Memory Sizes & Format Specifiers",
    body: `# Module 2: Variables, Primitive Types & Memory Sizes

## 1. Standard C Data Types
In C, the exact byte size of types depends on the platform ABI (e.g., LP64 for 64-bit Linux/macOS, LLP64 for 64-bit Windows).

| Type | Typical Size | Minimum Range | Format Specifier |
| :--- | :--- | :--- | :--- |
| \`char\` | 1 byte (8 bits) | -128 to 127 | \`%c\` or \`%d\` |
| \`unsigned char\` | 1 byte | 0 to 255 | \`%u\` |
| \`short\` | 2 bytes (16 bits) | -32,768 to 32,767 | \`%hd\` |
| \`int\` | 4 bytes (32 bits) | -2,147,483,648 to 2,147,483,647 | \`%d\` or \`%i\` |
| \`unsigned int\`| 4 bytes | 0 to 4,294,967,295 | \`%u\` |
| \`long\` | 4 or 8 bytes | -9.22×10¹⁸ to 9.22×10¹⁸ | \`%ld\` |
| \`long long\` | 8 bytes (64 bits)| -9.22×10¹⁸ to 9.22×10¹⁸ | \`%lld\` |
| \`float\` | 4 bytes (IEEE 754)| 6-7 decimal digits precision | \`%f\` |
| \`double\` | 8 bytes (IEEE 754)| 15-17 decimal digits precision | \`%lf\` |
| \`void*\` (Pointer)| 4 or 8 bytes | Memory address | \`%p\` |

## 2. Fixed-Width Integer Types (\`<stdint.h>\`)
In systems programming where exact memory layout matters, always use portable fixed-width integers from \`<stdint.h>\`:
\`\`\`c
#include <stdio.h>
#include <stdint.h>
#include <inttypes.h>

int main(void) {
    int8_t  a = -128;         // Exactly 8 bits signed
    uint8_t b = 255;          // Exactly 8 bits unsigned
    int32_t c = 100000;       // Exactly 32 bits signed
    uint64_t d = 0xFFFFFFFF;  // Exactly 64 bits unsigned

    printf("int8: %d, uint8: %u\\n", a, b);
    printf("uint64 in hex: 0x%" PRIx64 "\\n", d);
    return 0;
}
\`\`\`

## 3. Two's Complement Integer Representation
Signed integers in C are represented using Two's Complement:
* Positive integers start with \`0\` as MSB (Most Significant Bit).
* Negative integers are obtained by inverting all bits (\`NOT\`) and adding \`1\`.
* Example: \`+5\` in 8-bit is \`0000 0101\`. Invert: \`1111 1010\`. Add 1: \`1111 1011\` (\`-5\`).

## 4. Type Casting: Implicit vs Explicit
\`\`\`c
int a = 5;
int b = 2;

// Truncated integer division: 5 / 2 = 2
double badResult = a / b; // Evaluates to 2.0!

// Explicit cast forces floating-point arithmetic: 5.0 / 2 = 2.5
double goodResult = (double)a / b; 
\`\`\``
  },
  {
    title: "Module 3: Operators, Boolean Logic & Control Flow (if-else, switch)",
    body: `# Module 3: Operators, Boolean Logic & Control Flow

## 1. Boolean Expressions & Short-Circuit Evaluation
In classic C (C89), there was no native \`bool\` type; \`0\` represented false, and any non-zero integer represented true. C99 introduced \`<stdbool.h>\` which provides \`bool\`, \`true\`, and \`false\`.

\`\`\`c
#include <stdio.h>
#include <stdbool.h>

bool isServerRunning(void) {
    printf("[CHECK] Verifying server status...\\n");
    return false;
}

int main(void) {
    int connectionRetries = 0;

    // Short-Circuit AND (&&): If left operand is false, right operand is NEVER evaluated!
    if (false && isServerRunning()) {
        printf("Connected!\\n");
    }

    // Short-Circuit OR (||): If left operand is true, right operand is NEVER evaluated!
    if (true || isServerRunning()) {
        printf("Bypassed network check due to short-circuit!\\n");
    }
    return 0;
}
\`\`\`

## 2. Bitwise Operators & Bitmasking
Bitwise operators manipulate individual bits in hardware registers:
\`\`\`c
uint8_t flags = 0b00000000;

#define FLAG_READ    (1 << 0) // 0b00000001
#define FLAG_WRITE   (1 << 1) // 0b00000010
#define FLAG_EXECUTE (1 << 2) // 0b00000100

// Setting bits using bitwise OR (|)
flags |= (FLAG_READ | FLAG_WRITE);

// Checking bits using bitwise AND (&)
if (flags & FLAG_READ) {
    printf("Read permission granted.\\n");
}

// Clearing bits using bitwise AND with inverted mask (& ~)
flags &= ~FLAG_WRITE; // Removes write permission
\`\`\`

## 3. The Switch Statement & Jump Tables
\`\`\`c
typedef enum {
    STATE_IDLE,
    STATE_FETCHING,
    STATE_PARSING,
    STATE_COMPLETE,
    STATE_ERROR
} SystemState;

void handleState(SystemState state) {
    switch (state) {
        case STATE_IDLE:
            printf("Awaiting new input.\\n");
            break;
        case STATE_FETCHING:
        case STATE_PARSING:
            printf("Processing in progress...\\n"); // Fallthrough intended
            break;
        case STATE_COMPLETE:
            printf("Task succeeded!\\n");
            break;
        default:
            printf("Encountered unexpected state!\\n");
            break;
    }
}
\`\`\``
  },
  {
    title: "Module 4: Loops & Iterative Algorithms (for, while, do-while)",
    body: `# Module 4: Loops & Iterative Algorithms

## 1. Anatomical Comparison of C Loops

| Loop Type | Evaluation Timing | Guaranteed Execution | Best Use Case |
| :--- | :--- | :--- | :--- |
| \`while\` | Entry-checked | 0 or more times | Polling streams, sentinel values, event loops |
| \`for\` | Entry-checked | 0 or more times | Known iteration counts, indexed array traversal |
| \`do-while\`| Exit-checked | **At least 1 time** | User prompt validation, menu drivers, retry loops |

## 2. Robust Input Loop with \`do-while\`
\`\`\`c
#include <stdio.h>

int promptUserAge(void) {
    int age = -1;
    int itemsRead = 0;
    do {
        printf("Enter your age (1 - 120): ");
        itemsRead = scanf("%d", &age);
        
        // Flush stdin buffer on malformed input (e.g. user typed letters)
        if (itemsRead != 1) {
            int ch;
            while ((ch = getchar()) != '\\n' && ch != EOF);
            printf("Invalid input. Please enter numbers only.\\n");
            age = -1;
        }
    } while (age < 1 || age > 120);

    return age;
}
\`\`\`

## 3. Nested Loops & Matrix Multiplication
\`\`\`c
#define N 3

void multiplyMatrices(int A[N][N], int B[N][N], int C[N][N]) {
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            C[i][j] = 0;
            for (int k = 0; k < N; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
}
\`\`\``
  },
  {
    title: "Module 5: Functions, Call Stack, Variable Scope & Recursion",
    body: `# Module 5: Functions, Call Stack & Variable Scope

## 1. Call-by-Value Semantics
In C, **all function arguments are passed strictly by value**. The function receives a local copy of each argument:

\`\`\`c
void brokenSwap(int a, int b) {
    int temp = a;
    a = b;
    b = temp;
    // Mutates only local copies! Original variables remain unchanged.
}

void workingSwap(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
    // Dereferences pointers to mutate actual memory locations.
}
\`\`\`

## 2. Storage Classes & Scope
* \`auto\`: Default for local variables. Allocated on stack, destroyed on function exit.
* \`static\` (local): Persists its value across function calls! Initialized once in Data Segment.
* \`static\` (global/function): Restricts linkage to the current translation unit (\`.c\` file), preventing symbol name collisions.
* \`extern\`: Declares a symbol that is defined in another source file.

\`\`\`c
#include <stdio.h>

void trackCallCount(void) {
    static int callCount = 0; // Preserved across calls
    callCount++;
    printf("Function invoked %d time(s)\\n", callCount);
}

int main(void) {
    trackCallCount(); // Outputs 1
    trackCallCount(); // Outputs 2
    trackCallCount(); // Outputs 3
    return 0;
}
\`\`\`

## 3. Recursion & Base Conditions
Every recursive algorithm must define a valid terminating base case to prevent **Stack Overflow**:

\`\`\`c
// Binary Search: O(log N)
int binarySearch(const int arr[], int low, int high, int target) {
    if (low > high) return -1; // Base case: Target not found

    int mid = low + (high - low) / 2; // Prevents integer overflow
    if (arr[mid] == target) return mid; // Base case: Target found

    if (arr[mid] > target) {
        return binarySearch(arr, low, mid - 1, target);
    }
    return binarySearch(arr, mid + 1, high, target);
}
\`\`\``
  },
  {
    title: "Module 6: 1D & 2D Arrays, Matrices, and String Manipulation",
    body: `# Module 6: Arrays, Matrices & String Manipulation

## 1. Contiguous Array Memory Layout
An array in C is a contiguous block of homogeneous memory elements. If an array of integers starts at memory address \`0x1000\`, each element occupies 4 bytes:
\`\`\`text
Index:        arr[0]      arr[1]      arr[2]      arr[3]
Address:     0x1000      0x1004      0x1008      0x100C
Value:       [  42  ]    [  19  ]    [  88  ]    [   7  ]
\`\`\`

## 2. String Mechanics: The Null Terminator (\`'\\0'\`)
In C, a string is simply a \`char\` array whose end is marked by the byte value \`0\` (\`'\\0'\`, ASCII 0):
\`\`\`c
// Automatically reserves 6 bytes: 'H', 'e', 'l', 'l', 'o', '\\0'
char greeting[] = "Hello"; 

// If you forget '\\0', string functions will read past the boundary into garbage memory!
char broken[5] = {'H', 'e', 'l', 'l', 'o'}; // NO NULL TERMINATOR! DANGEROUS!
\`\`\`

## 3. Essential String Operations (\`<string.h>\`)
\`\`\`c
#include <stdio.h>
#include <string.h>

int main(void) {
    char source[] = "StudyOS Engine";
    char destination[32];

    // Safe copying with strncpy
    strncpy(destination, source, sizeof(destination) - 1);
    destination[sizeof(destination) - 1] = '\\0'; // Ensure termination

    // Measuring string length (excluding '\\0')
    size_t len = strlen(destination);

    // Lexicographical comparison
    int cmp = strcmp(destination, "StudyOS Engine");
    if (cmp == 0) {
        printf("Strings are identical! Length: %zu\\n", len);
    }
    return 0;
}
\`\`\``
  },
  {
    title: "Module 7: Deep Dive: Pointers, Memory Addresses & Dynamic Allocation",
    body: `# Module 7: Pointers, Memory Addresses & Dynamic Allocation

## 1. What is a Pointer?
A pointer is simply a variable whose stored value is a **memory address** of another variable.

\`\`\`c
int x = 42;
int *ptr = &x; // & = Address-of operator

printf("Value of x:              %d\\n", x);
printf("Address of x (&x):       %p\\n", (void*)&x);
printf("Pointer value (ptr):     %p\\n", (void*)ptr);
printf("Dereferenced (*ptr):     %d\\n", *ptr); // * = Dereference operator

*ptr = 99; // Mutates x directly via memory!
printf("New value of x:          %d\\n", x); // Outputs 99
\`\`\`

## 2. Pointer Arithmetic
Adding \`1\` to a pointer advances it by \`sizeof(Type)\` bytes:
\`\`\`c
int nums[] = {10, 20, 30};
int *p = nums; // Points to nums[0]

p++; // Advances by 4 bytes! Now points to nums[1]
printf("Value: %d\\n", *p); // 20
\`\`\`

## 3. Dynamic Memory Allocation on the Heap
Local variables on the stack are destroyed when their enclosing function returns. For runtime-sized datasets or persistent lifetime, use the Heap:

\`\`\`c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int id;
    double score;
} StudentRecord;

int main(void) {
    int count = 5;

    // Allocate memory on the heap (calloc clears memory to zero)
    StudentRecord *records = (StudentRecord*)calloc(count, sizeof(StudentRecord));
    if (records == NULL) {
        fprintf(stderr, "Out of memory error!\\n");
        return 1;
    }

    for (int i = 0; i < count; i++) {
        records[i].id = 100 + i;
        records[i].score = 85.5 + i;
    }

    // Always free dynamically allocated memory to prevent memory leaks!
    free(records);
    records = NULL; // Prevent dangling pointer
    return 0;
}
\`\`\`

## 4. The 3 Cardinal Rules of Memory Safety
1. **Never dereference NULL or uninitialized pointers** → Results in \`Segmentation Fault\`.
2. **Every \`malloc\`/\`calloc\` must have exactly one matching \`free\`** → Prevents memory leaks.
3. **Never access memory after calling \`free()\`** → Results in Use-After-Free vulnerabilities.`
  },
  {
    title: "Module 8: Structures, Typedef, Enums, and File I/O Serialization",
    body: `# Module 8: Structures, Typedef, Enums & File I/O Serialization

## 1. Structures & Memory Alignment
Structures allow grouping disparate data types into a cohesive compound record:

\`\`\`c
#include <stdio.h>
#include <string.h>

typedef struct {
    int taskId;
    char title[64];
    int estimatedMinutes;
    int isCompleted;
} Task;

void printTask(const Task *t) {
    // The arrow operator (->) dereferences pointer and accesses member: (*t).title
    printf("[%c] Task #%d: %s (%d mins)\\n", 
           t->isCompleted ? 'X' : ' ', 
           t->taskId, 
           t->title, 
           t->estimatedMinutes);
}
\`\`\`

## 2. Persistent File I/O
Writing and reading structured data to disk using \`<stdio.h>\`:

\`\`\`c
#include <stdio.h>
#include <stdlib.h>

void saveTaskToDisk(const Task *t, const char *filepath) {
    FILE *file = fopen(filepath, "w");
    if (!file) {
        perror("Failed to open file for writing");
        return;
    }

    fprintf(file, "%d|%s|%d|%d\\n", 
            t->taskId, 
            t->title, 
            t->estimatedMinutes, 
            t->isCompleted);

    fclose(file); // Always close file handle!
}

int loadTaskFromDisk(Task *t, const char *filepath) {
    FILE *file = fopen(filepath, "r");
    if (!file) return 0;

    int scanned = fscanf(file, "%d|%63[^|]|%d|%d\\n", 
                         &t->taskId, 
                         t->title, 
                         &t->estimatedMinutes, 
                         &t->isCompleted);
    fclose(file);
    return scanned == 4;
}
\`\`\`

## 3. Capstone Architecture Checklist
When writing a modular multi-file C program:
1. Put data types and prototypes in header files (\`task.h\`) with \`#pragma once\` or include guards.
2. Put function implementations in source files (\`task.c\`).
3. Compile all units together:
   \`\`\`bash
   gcc -Wall -Wextra main.c task.c -o studyos_app
   \`\`\``
  }
];

export async function seedNotesForUser(userId) {
  const db = getDb();
  const [cSubject] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.userId, userId), eq(subjects.name, 'C Programming & Systems Foundations')));

  const subjectId = cSubject?.id ?? null;

  // Clear any existing notes for this subject
  if (subjectId) {
    await db.delete(studyNotes).where(and(eq(studyNotes.userId, userId), eq(studyNotes.subjectId, subjectId)));
  }

  const values = C_STUDY_NOTES.map((n) => ({
    userId,
    title: n.title,
    body: n.body,
    subjectId,
    revision: 1,
  }));

  const inserted = await db.insert(studyNotes).values(values).returning({ id: studyNotes.id, title: studyNotes.title });
  console.log('Successfully seeded', inserted.length, 'study notes for user:', userId);
  return inserted;
}

// If run directly
if (process.argv[1]?.endsWith('seed-study-notes.mjs')) {
  process.env.DATABASE_URL = 'postgresql://postgres.sdydpcfttodngamwnjek:Sai238313%40%23%24@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';
  await seedNotesForUser('96d642b2-83ee-4eec-8fa2-cca75f04f87f');
}
