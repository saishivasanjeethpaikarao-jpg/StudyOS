import fs from 'fs';
import path from 'path';
import { C_LECTURE_DECKS } from './seed-study-notes.mjs';

const outDir = path.resolve('apps/api/src/services/academics/catalogs');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. C PROGRAMMING
const cPackage = {
  id: "c-programming",
  aliases: ["c", "c language", "c programming", "c-programming", "ansi c", "clang"],
  subject: {
    name: "C Programming & Systems Foundations",
    description: "Mastering C programming: memory models, pointers, data structures, and POSIX system I/O.",
    color: "#6366F1",
    icon: "code"
  },
  assignments: [
    {
      title: "Week 1 Project: Interactive CLI Unit Converter & Calculator in C",
      description: "Build a modular command-line calculator in C supporting arithmetic, trigonometry, and input validation using functions, switch-case, and format specifiers.",
      daysDue: 7
    },
    {
      title: "Week 2 Project: Text Analyzer & 2D Matrix Engine in C",
      description: "Implement string manipulation algorithms (word frequency, palindrome detector) and 2D matrix multiplication with row-major memory indexing.",
      daysDue: 14
    },
    {
      title: "Week 3 Project: Dynamic Memory Singly-Linked List & Pointer Math",
      description: "Implement a robust singly-linked list in C using malloc, free, and pointer references with zero memory leaks verified via Valgrind.",
      daysDue: 21
    },
    {
      title: "Week 4 Capstone: Persistent CLI Task & Student Database in C",
      description: "Architect a full console application with struct records, binary file persistence (fopen, fread, fwrite), search, update, and sorting.",
      daysDue: 28
    }
  ],
  resources: [
    {
      type: "youtube",
      title: "C Programming Tutorial for Beginners - Full Course (freeCodeCamp)",
      url: "https://www.youtube.com/watch?v=KJgsSFOSQv0",
      providerItemId: "KJgsSFOSQv0"
    },
    {
      type: "youtube",
      title: "CS50 Lecture 1: C Programming & Computational Thinking (Harvard)",
      url: "https://www.youtube.com/watch?v=LfaMVlDaQ24",
      providerItemId: "LfaMVlDaQ24"
    },
    {
      type: "youtube",
      title: "C Programming Full Course 🕹️ (Bro Code)",
      url: "https://www.youtube.com/watch?v=87SH2Cn0s9A",
      providerItemId: "87SH2Cn0s9A"
    },
    {
      type: "youtube",
      title: "Pointers in C / C++ Complete Masterclass (mycodeschool)",
      url: "https://www.youtube.com/watch?v=zuegQmMdy8M",
      providerItemId: "zuegQmMdy8M"
    },
    {
      type: "youtube",
      title: "C Programming – Features & The First C Program (Neso Academy)",
      url: "https://www.youtube.com/watch?v=rLf3jnHxSmU",
      providerItemId: "rLf3jnHxSmU"
    },
    {
      type: "youtube",
      title: "C Language Full Course with Notes & Practice (Apna College)",
      url: "https://www.youtube.com/watch?v=irqbmMNs2Bo",
      providerItemId: "irqbmMNs2Bo"
    },
    {
      type: "web",
      title: "Cppreference - C Language Documentation & Standard Library Reference",
      url: "https://en.cppreference.com/w/c",
      providerItemId: null
    },
    {
      type: "web",
      title: "Harvard CS50 Manual Pages & C Library Reference",
      url: "https://manual.cs50.io/",
      providerItemId: null
    }
  ],
  lectureDecks: C_LECTURE_DECKS,
  dailyLessons: [
    {
      dayNumber: 1,
      title: "C Setup: GCC, Clang & First Hello World",
      subtasks: [
        "Install GCC or Clang toolchain and verify with gcc --version",
        "Write and compile main.c with strict flags (-Wall -Wextra -Werror)",
        "Inspect the 4 stages of compilation using gcc -E, -S, and -c flags",
        "Run the compiled binary from terminal and verify return code with echo $?"
      ],
      notes: "# C Setup & Compilation Pipeline\\n\\n Dennis Ritchie created C in 1972 at Bell Labs. C code maps directly into assembly instructions with zero runtime overhead.\\n\\n```c\\n#include <stdio.h>\\n\\nint main(void) {\\n    printf(\\\"StudyOS Kernel Initialized\\\\n\\\");\\n    return 0;\\n}\\n```"
    },
    {
      dayNumber: 2,
      title: "C Data Types: int, float, char & %d %f %c",
      subtasks: [
        "Declare variables of type char, int, float, and double",
        "Print exact byte sizes using sizeof() operator across types",
        "Experiment with format specifiers (%d, %f, %.2f, %c, %p)",
        "Demonstrate integer overflow behavior using limits.h constants"
      ],
      notes: "# C Data Types & Memory Representation\\n\\nVariables occupy fixed memory sizes determined by architecture.\\n\\n- `char`: 1 byte\\n- `int`: 4 bytes\\n- `float`: 4 bytes (IEEE 754)\\n- `double`: 8 bytes"
    },
    {
      dayNumber: 3,
      title: "C Logic: Arithmetic & Relational Operators",
      subtasks: [
        "Implement arithmetic operations (+, -, *, /, %) with type casting",
        "Test integer division vs floating-point division pitfalls",
        "Demonstrate boolean logic using logical operators (&&, ||, !)",
        "Analyze operator precedence using parentheses for deterministic order"
      ],
      notes: "# Arithmetic & Relational Logic in C\\n\\nC treats non-zero values as TRUE and 0 as FALSE. Short-circuit evaluation guarantees that in `A && B`, if `A` is false, `B` is never evaluated."
    },
    {
      dayNumber: 4,
      title: "C Control: if, else if & Switch Statements",
      subtasks: [
        "Write nested if-else statements for multi-condition branching",
        "Implement a clean switch-case dispatch menu for user options",
        "Verify break statement necessity to prevent accidental fallthrough",
        "Use default case for robust invalid input handling"
      ],
      notes: "# Control Flow: Branches & Jump Tables\\n\\n`switch` constructs generate O(1) jump tables in machine code when cases are contiguous integers, providing faster branching than cascading `if-else`."
    },
    {
      dayNumber: 5,
      title: "C Loops: while & do-while Loops",
      subtasks: [
        "Write a sentinel-controlled while loop for dynamic input processing",
        "Implement a do-while loop to guarantee at least one execution for user menus",
        "Add break and continue statements with condition boundaries",
        "Prevent infinite loops by asserting loop variant decrements"
      ],
      notes: "# Iteration: while vs do-while\\n\\n- `while`: Entry-checked (evaluates condition before executing body).\\n- `do-while`: Exit-checked (guarantees execution of body at least once)."
    },
    {
      dayNumber: 6,
      title: "C Loops: for Loops & Nested Patterns",
      subtasks: [
        "Construct for loops with initialization, condition, and increment expressions",
        "Build nested for loops to render 2D geometric patterns and matrices",
        "Optimize loop bounds to eliminate redundant computations",
        "Complete Week 1 milestone review and self-test quiz"
      ],
      notes: "# Nested Loops & Complexity\\n\\nNested loops run in $O(N \\times M)$ complexity. Cache locality is preserved by traversing 2D data in row-major order (`arr[row][col]`)."
    },
    {
      dayNumber: 7,
      title: "C Functions: Prototypes & Return Values",
      subtasks: [
        "Declare header function prototypes before main()",
        "Implement functions with typed parameters and explicit return types",
        "Test pure functions without side effects for modular design",
        "Analyze stack frame creation and teardown during function calls"
      ],
      notes: "# Functions & Modular Design\\n\\nFunction prototypes allow the compiler to enforce type safety before the linker resolves symbol addresses across translation units."
    },
    {
      dayNumber: 8,
      title: "C Scope: Call-by-Value & Local Variables",
      subtasks: [
        "Demonstrate call-by-value behavior when passing primitives",
        "Trace local variable lifetime and automatic stack deallocation",
        "Compare static local variables vs automatic local variables",
        "Examine the extern keyword for multi-file symbol linkage"
      ],
      notes: "# Scope & Storage Classes\\n\\nParameters in C are strictly passed by value. Modifying a parameter inside a function only mutates the local stack copy, leaving caller state untouched."
    },
    {
      dayNumber: 9,
      title: "C Arrays: 1D Arrays & Contiguous Memory",
      subtasks: [
        "Declare and initialize 1D arrays with static sizes",
        "Verify contiguous address spacing using printf with %p and &arr[i]",
        "Implement linear search and array reversal algorithms",
        "Guard against buffer overruns and out-of-bounds indexing bugs"
      ],
      notes: "# 1D Arrays & Memory Layout\\n\\nArray indexing `arr[i]` is syntactic sugar for `*(arr + i)`. All elements are stored in contiguous bytes."
    },
    {
      dayNumber: 10,
      title: "C Arrays: 2D Arrays & Matrix Operations",
      subtasks: [
        "Declare 2D matrices and initialize with nested brace syntax",
        "Perform matrix addition and matrix transpose in row-major order",
        "Implement matrix multiplication with boundary validation",
        "Calculate memory offsets manually: index = row * COLS + col"
      ],
      notes: "# 2D Arrays & Matrix Math\\n\\nIn C, multidimensional arrays are laid out in Row-Major order. Accessing row by row optimizes CPU L1/L2 cache line hits."
    },
    {
      dayNumber: 11,
      title: "C Strings: char arrays & null terminator '\\0'",
      subtasks: [
        "Declare string as null-terminated character array: char str[32]",
        "Verify why omitting '\\0' causes printf to print garbage memory",
        "Implement manual string length calculation without strlen()",
        "Read user string safely using fgets(buf, sizeof(buf), stdin)"
      ],
      notes: "# Null-Terminated Strings in C\\n\\nC has no native string primitive. Strings are character arrays ending in ASCII 0 (`\\\\0`). Always ensure buffers allocate space for the null terminator."
    },
    {
      dayNumber: 12,
      title: "C Strings: string.h (strlen, strcpy, strcmp)",
      subtasks: [
        "Master string comparison using strcmp() and explain return values (<0, 0, >0)",
        "Use safe string functions (strncpy, snprintf) over dangerous strcpy/strcat",
        "Tokenize CSV strings using strtok_r for reentrant parsing",
        "Complete Week 2 project: Text Analyzer & 2D Matrix Engine"
      ],
      notes: "# String Utilities & Buffer Safety\\n\\nNever use `strcpy` or `gets` in production C code! Use `snprintf` or `strncpy` with explicit destination sizes to prevent buffer overflows."
    },
    {
      dayNumber: 13,
      title: "C Pointers: Memory Addresses & & Operator",
      subtasks: [
        "Declare pointer variables using syntax: int *ptr = &val",
        "Print memory address using & and %p format specifier",
        "Verify pointer size on 64-bit architecture (8 bytes)",
        "Diagram memory pointer relations on paper or visualizer"
      ],
      notes: "# Pointers: Memory Addresses\\n\\nA pointer stores the hexadecimal memory address of another variable. The address-of operator `&` extracts this location."
    },
    {
      dayNumber: 14,
      title: "C Pointers: Dereference * & Pointer Math",
      subtasks: [
        "Modify original variable value by dereferencing: *ptr = 99",
        "Perform pointer arithmetic (ptr++, ptr + 2) and observe byte increments",
        "Explain relation between pointer addition and sizeof(type)",
        "Demonstrate void* generic pointers and type casting"
      ],
      notes: "# Dereferencing & Pointer Arithmetic\\n\\n`ptr + 1` increments the address by `sizeof(*ptr)` bytes (e.g., +4 for `int*`, +8 for `double*`). Dereferencing `*ptr` accesses the value at that address."
    },
    {
      dayNumber: 15,
      title: "C Pointers: Passing Pointers to Functions",
      subtasks: [
        "Implement classic swap(int *a, int *b) function via pointers",
        "Pass arrays to functions as (type *arr, size_t size) pairs",
        "Use const pointers (const int *p) to enforce read-only semantics",
        "Trace caller stack modifications during pointer function execution"
      ],
      notes: "# Pass-by-Reference Simulation\\n\\nBy passing pointer addresses into functions, C functions can directly mutate variables allocated in the caller's stack frame."
    },
    {
      dayNumber: 16,
      title: "C Memory: Dynamic Allocation (malloc & calloc)",
      subtasks: [
        "Allocate heap memory using malloc(n * sizeof(int))",
        "Allocate zero-initialized heap memory using calloc(n, sizeof(int))",
        "Check return value for NULL to handle out-of-memory states safely",
        "Resize dynamic buffer using realloc() without memory corruption"
      ],
      notes: "# Dynamic Memory Allocation\\n\\nDynamic memory is allocated on the Heap via `malloc()` or `calloc()`. Unlike the stack, heap memory persists until explicitly freed."
    },
    {
      dayNumber: 17,
      title: "C Memory: free() & Preventing Memory Leaks",
      subtasks: [
        "Release allocated heap memory using free(ptr)",
        "Assign ptr = NULL immediately after free() to prevent dangling pointers",
        "Compile with -fsanitize=address or run Valgrind to verify zero memory leaks",
        "Identify and fix double-free error conditions"
      ],
      notes: "# Memory Safety: Leaks & Dangling Pointers\\n\\nEvery `malloc()` MUST have a matching `free()`. Set pointers to `NULL` after freeing to prevent use-after-free bugs."
    },
    {
      dayNumber: 18,
      title: "C Structs: User-Defined Types & typedef",
      subtasks: [
        "Define custom struct with heterogeneous fields (id, name, score)",
        "Create clean type aliases using typedef struct syntax",
        "Access struct members using dot operator (.): student.score = 95.5",
        "Calculate struct memory padding and alignment using sizeof()"
      ],
      notes: "# Structures & Memory Alignment\\n\\nStructs allow bundling heterogeneous fields into a single record. Compilers insert padding bytes to ensure CPU word alignment."
    },
    {
      dayNumber: 19,
      title: "C Structs: Pointers to Structs & -> Operator",
      subtasks: [
        "Allocate struct dynamically on the heap via malloc",
        "Access struct members through pointers using arrow operator (->)",
        "Pass struct pointers to functions to avoid expensive stack copies",
        "Free dynamic struct memory and all nested dynamic pointers"
      ],
      notes: "# Struct Pointers & The Arrow Operator\\n\\n`ptr->field` is equivalent to `(*ptr).field`. Passing pointers to structs avoids copying large memory buffers on the call stack."
    },
    {
      dayNumber: 20,
      title: "C Files: fopen, fclose, fprintf, fscanf",
      subtasks: [
        "Open text file in write mode ('w') and check for NULL handle",
        "Write formatted structured records using fprintf()",
        "Open file in read mode ('r') and parse data using fscanf() / fgets()",
        "Ensure fclose() is called on all code paths to flush buffers"
      ],
      notes: "# File I/O in C\\n\\nFile streams are represented by `FILE*`. Always verify `f != NULL` before reading/writing and close every stream with `fclose()`."
    },
    {
      dayNumber: 21,
      title: "C Preprocessor: #define, #include & Macros",
      subtasks: [
        "Define compile-time constants and inline function-like macros",
        "Implement header include guards using #ifndef, #define, #endif",
        "Test conditional compilation flags (#ifdef DEBUG, #endif)",
        "Explain pitfalls of macro parameter evaluation without parentheses"
      ],
      notes: "# The C Preprocessor\\n\\nThe preprocessor runs before the compiler. Always wrap macro parameters in parentheses: `#define SQUARE(x) ((x) * (x))`."
    },
    {
      dayNumber: 22,
      title: "C Project: CLI Student / Task Manager Part 1",
      subtasks: [
        "Design core domain struct (Task / Student) with dynamic resizing array",
        "Implement CLI command loop (Create, List, Search, Delete)",
        "Validate user inputs with defensive bounds checking",
        "Handle dynamic reallocation smoothly when capacity threshold is reached"
      ],
      notes: "# Capstone Architecture: CLI Engine\\n\\nBuild modular separation: Domain models in headers (`tasks.h`), implementation in `tasks.c`, and CLI interface in `main.c`."
    },
    {
      dayNumber: 23,
      title: "C Project: File Storage & Search Part 2",
      subtasks: [
        "Serialize all records to disk on shutdown using binary/text file I/O",
        "Deserialize records automatically upon application startup",
        "Add binary search algorithm over sorted records for instant retrieval",
        "Run Valgrind address sanitizer to guarantee zero memory leaks"
      ],
      notes: "# Persistence & Algorithmic Search\\n\\nPersist records sequentially with explicit separators or binary structures (`fwrite`). Verify zero memory leaks using `-fsanitize=address`."
    },
    {
      dayNumber: 24,
      title: "C Review: Final Mock Exam & Comprehensive Debugging",
      subtasks: [
        "Complete 30-question C systems and pointers mock exam",
        "Debug complex GDB stack traces and segfault memory dumps",
        "Refactor capstone codebase adhering to Linux kernel coding standards",
        "Export polished PDF lecture summary and certification checklist"
      ],
      notes: "# Final Comprehensive Review\\n\\nCongratulations on mastering C! You understand virtual memory, the compilation toolchain, pointer arithmetic, and heap allocation."
    }
  ]
};

fs.writeFileSync(path.join(outDir, 'c-programming.ts'), `import type { SubjectCurriculumPackage } from '../types.js';\n\nexport const cPackage: SubjectCurriculumPackage = ${JSON.stringify(cPackage, null, 2)};\n`);
console.log('Saved c-programming.ts');
