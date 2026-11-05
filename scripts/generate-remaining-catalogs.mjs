import fs from 'fs';
import path from 'path';

const outDir = path.resolve('apps/api/src/services/academics/catalogs');

function writeCatalog(filename, pkg) {
  const code = `import type { SubjectCurriculumPackage } from '../types.js';\n\nexport const ${pkg.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Package: SubjectCurriculumPackage = ${JSON.stringify(pkg, null, 2)};\n`;
  fs.writeFileSync(path.join(outDir, filename), code);
  console.log(`Generated ${filename}`);
}

// 5. JAVA & OOP
writeCatalog('java.ts', {
  id: "java",
  aliases: ["java", "oop java", "java programming", "spring", "jvm"],
  subject: {
    name: "Java & Object-Oriented Programming",
    description: "JVM internals, object-oriented design, Collections framework, multithreading, Streams API, and Spring Boot foundations.",
    color: "#EA580C",
    icon: "coffee"
  },
  assignments: [
    {
      title: "Week 1 Project: Banking Simulation Engine & Transaction Ledger",
      description: "Build a robust Java banking console application with account hierarchies, exception handling, and transaction validation.",
      daysDue: 7
    },
    {
      title: "Week 2 Project: Custom Generic Collections & Priority Dispatcher",
      description: "Implement custom generic data structures (LinkedList, BinaryHeap) adhering to Java Collections interfaces with type bounds.",
      daysDue: 14
    },
    {
      title: "Week 3 Project: Multi-Threaded Web Crawler & Producer-Consumer Pipeline",
      description: "Architect a concurrent web crawler utilizing Java's ExecutorService, BlockingQueue, and Atomic primitives with zero race conditions.",
      daysDue: 21
    },
    {
      title: "Week 4 Capstone: Enterprise Spring Boot REST API with Hibernate & Postgres",
      description: "Build and deploy a complete Spring Boot microservice with JPA/Hibernate entities, DTO validation, and automated integration tests.",
      daysDue: 28
    }
  ],
  resources: [
    {
      type: "youtube",
      title: "Java Programming for Beginners - Full Course (freeCodeCamp)",
      url: "https://www.youtube.com/watch?v=A74TOX803D0",
      providerItemId: "A74TOX803D0"
    },
    {
      type: "youtube",
      title: "Java Full Course for free ☕ (Bro Code)",
      url: "https://www.youtube.com/watch?v=xk4_1vDrzzo",
      providerItemId: "xk4_1vDrzzo"
    },
    {
      type: "web",
      title: "Oracle Java SE Documentation & Tutorials",
      url: "https://docs.oracle.com/en/java/",
      providerItemId: null
    },
    {
      type: "web",
      title: "Baeldung - Java and Spring Tutorials",
      url: "https://www.baeldung.com/",
      providerItemId: null
    }
  ],
  lectureDecks: [
    {
      title: "Lecture 1: The JVM Architecture, Bytecode & Java Memory Model",
      body: `## [SLIDE 1] 🎯 Course Objectives & The Java Virtual Machine
Welcome to Java & Object-Oriented Programming! Java powers large-scale enterprise banking, Android applications, and cloud microservices.

### 🎯 Key Learning Objectives
* Understand "Write Once, Run Anywhere": Bytecode (.class) and the JVM.
* Master the Java Memory Model: JVM Heap vs Thread Stacks.
* Analyze the Just-In-Time (JIT) compiler and Garbage Collection (GC).

💡 **Professor's Tip:** Java achieves speed through the JIT compiler, which identifies "hot spots" in bytecode and compiles them directly into native machine code at runtime!

---

## [SLIDE 2] 🧠 The JVM Execution Architecture
\`\`\`text
Java Source (.java)
      │ javac (Java Compiler)
      ▼
Bytecode (.class)
      │
      ▼ JVM ClassLoader
Class Area / Metaspace (Static variables, Class metadata)
      │
      ├──► JVM Thread Stacks (Local primitives, method call frames)
      └──► JVM Heap (All Object instances, managed by Garbage Collector)
            │
            ▼ Execution Engine (Interpreter + JIT Compiler)
Host CPU Machine Instructions
\`\`\`

---

## [SLIDE 3] 🏗️ JVM Memory Allocation Matrix
| Area | Shared Between Threads? | Lifetime | Contents |
| :--- | :--- | :--- | :--- |
| **Heap** | YES | Entire application | All objects (\`new\`), arrays, and instance fields |
| **Stack** | NO (Per Thread) | Function execution | Local variables, method arguments, return values |
| **Metaspace** | YES | Class loading | Class bytecode, method signatures, static constants |

---

## [SLIDE 4] 💻 Production Code: Typed Record Starter
\`\`\`java
package com.studyos.academics;

import java.util.Objects;

public record Student(String id, String name, double gpa) {
    public Student {
        Objects.requireNonNull(id, "ID cannot be null");
        Objects.requireNonNull(name, "Name cannot be null");
        if (gpa < 0.0 || gpa > 4.0) {
            throw new IllegalArgumentException("GPA must be between 0.0 and 4.0");
        }
    }

    public static void main(String[] args) {
        Student s1 = new Student("STU-101", "Alex Smith", 3.85);
        System.out.printf("StudyOS Java 21 LTS Initialized: %s (GPA: %.2f)%n", s1.name(), s1.gpa());
    }
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **String Comparison with \`==\`:** In Java, \`str1 == str2\` compares memory references! If strings are in different memory allocations, this returns \`false\` even if the text matches. Always write \`str1.equals(str2)\`.
2. **NullPointerException (NPE):** Calling methods on an uninitialized reference throws NPE. Use \`Optional<T>\` or \`Objects.requireNonNull()\` for defensive design.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the difference between JDK, JRE, and JVM?
  * *Answer:* JDK (development tools + compiler + JRE), JRE (runtime libraries + JVM), JVM (the abstract virtual machine executing bytecode).
* **Q2:** Why are Java Records preferred over traditional POJOs for immutable data?
  * *Answer:* Records automatically generate constructors, getters, \`equals()\`, \`hashCode()\`, and \`toString()\` methods concisely.`
    },
    {
      title: "Lecture 2: Core OOP: Encapsulation, Inheritance, Polymorphism & Abstraction",
      body: `## [SLIDE 1] 🎯 The 4 Pillars of Object-Oriented Design
Object-oriented programming manages real-world complexity through modular abstractions and clean encapsulation boundaries.

### 🎯 Key Learning Objectives
* Enforce Encapsulation with access modifiers (\`private\`, \`protected\`, \`public\`).
* Differentiate Abstract Classes vs Interfaces in Java.
* Master Runtime Polymorphism (Method Overriding vs Overloading).

---

## [SLIDE 2] 🧠 Polymorphic Dispatch Visualizer
\`\`\`text
PaymentMethod (Interface / Abstract Base)
  ├── CreditCardPayment -> overrides process(double amount)
  ├── CryptoPayment     -> overrides process(double amount)
  └── BankTransfer      -> overrides process(double amount)

At runtime:
PaymentMethod method = getSelectedPaymentMethod();
method.process(150.0); // JVM resolves the exact concrete implementation dynamically!
\`\`\`

---

## [SLIDE 3] 🏗️ Interface vs Abstract Class Comparison
| Dimension | Java Interface | Abstract Class |
| :--- | :--- | :--- |
| **Multiple Inheritance** | YES (A class can implement many interfaces) | NO (Single inheritance only) |
| **State / Fields** | \`public static final\` constants only | Can hold private mutable instance state |
| **Default Methods** | Supported since Java 8 (\`default\` keyword) | Fully supported |

---

## [SLIDE 4] 💻 Production Code: Polymorphic Payment System
\`\`\`java
public interface PaymentGateway {
    boolean processTransaction(String accountId, double amount);
    
    default void logAudit(String txId) {
        System.out.println("[AUDIT] Transaction processed: " + txId);
    }
}

public final class StripeGateway implements PaymentGateway {
    @Override
    public boolean processTransaction(String accountId, double amount) {
        if (amount <= 0) return false;
        System.out.printf("Charging \$%.2f via Stripe token %s%n", amount, accountId);
        logAudit(java.util.UUID.randomUUID().toString());
        return true;
    }
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Forgetting \`@Override\` Annotation:** Without \`@Override\`, a typo in method signature creates an unintentional overload instead of an override, breaking polymorphism without compiler warnings!
2. **Diamond Problem in Multiple Inheritance:** Java prevents multiple class inheritance to avoid ambiguity. For interface default methods with matching signatures, classes must explicitly override the conflicting method.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the difference between method overloading and method overriding?
  * *Answer:* Overloading occurs at compile-time within the same class (same name, different parameters); overriding occurs at runtime across inheritance (child replaces parent implementation).
* **Q2:** What does the \`final\` keyword signify on a class, method, and variable?
  * *Answer:* Final class cannot be inherited; final method cannot be overridden; final variable cannot be reassigned.`
    },
    {
      title: "Lecture 3: The Java Collections Framework: List, Set, Map & Deque",
      body: `## [SLIDE 1] 🎯 The Enterprise Collections Architecture
Java provides a rich, battle-tested hierarchy of generic data structures in \`java.util\`.

### 🎯 Key Learning Objectives
* Navigate the \`Iterable\` $\\to$ \`Collection\` hierarchy.
* Master \`ArrayList\` vs \`LinkedList\` performance characteristics.
* Understand \`HashMap\` bucket chaining and Treeify conversions.

---

## [SLIDE 2] 🧠 Java Collections Hierarchy
\`\`\`text
Iterable
 └── Collection
      ├── List (Ordered, duplicates allowed)
      │    ├── ArrayList (Dynamic array)
      │    └── LinkedList (Doubly-linked nodes)
      ├── Set (Unique elements)
      │    ├── HashSet (O(1) Hash table)
      │    └── TreeSet (Sorted Red-Black tree)
      └── Queue & Deque (FIFO / Priority)
           ├── ArrayDeque
           └── PriorityQueue (Min-Heap)
\`\`\`

---

## [SLIDE 3] 🏗️ HashMap Internal Architecture (Java 8+)
\`\`\`text
Bucket Array: [ Node 0 | Node 1 | Node 2 | ... | Node 15 ]
                           │
       When bucket size > 8 and capacity >= 64:
                           │
       Transforms from LinkedList to Balanced Red-Black Tree!
       Worst-case collision lookup drops from O(N) to O(log N)!
\`\`\`

---

## [SLIDE 4] 💻 Production Code: Collections Pipeline
\`\`\`java
import java.util.*;

public class InventoryRegistry {
    private final Map<String, Integer> stock = new HashMap<>();

    public void updateStock(String sku, int quantity) {
        // Atomic merge using compute
        stock.compute(sku, (k, current) -> (current == null) ? quantity : current + quantity);
    }

    public List<Map.Entry<String, Integer>> getSortedLowStock(int threshold) {
        return stock.entrySet().stream()
            .filter(e -> e.getValue() < threshold)
            .sorted(Map.Entry.comparingByValue())
            .toList();
    }
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Broken \`equals()\` and \`hashCode()\` Contract:** If two objects are equal according to \`equals()\`, they MUST return the exact same \`hashCode()\`! Breaking this causes objects to disappear or fail to be retrieved from \`HashMap\` or \`HashSet\`.
2. **ConcurrentModificationException:** Modifying a collection directly while iterating over it via an enhanced for-loop throws this exception. Use \`Iterator.remove()\` or \`removeIf()\`.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What happens in a Java 8+ HashMap when too many keys hash to the same bucket?
  * *Answer:* Once the collision chain exceeds 8 nodes, it transforms from a linked list to a balanced Red-Black tree, improving search time to $O(\\log N)$.
* **Q2:** Why is \`ArrayDeque\` generally preferred over \`Stack\` and \`LinkedList\` for LIFO/FIFO operations?
  * *Answer:* \`ArrayDeque\` avoids synchronization overhead of legacy \`Stack\` and has significantly better cache locality and lower memory overhead than node-based \`LinkedList\`."`
    },
    {
      title: "Lecture 4: Functional Java: Lambdas, Functional Interfaces & Streams API",
      body: `## [SLIDE 1] 🎯 Declarative Data Processing with Streams
Modern Java balances OOP with powerful declarative streams for filtering, mapping, and parallel reductions.

### 🎯 Key Learning Objectives
* Understand Core Functional Interfaces: \`Predicate\`, \`Function\`, \`Consumer\`, \`Supplier\`.
* Master Stream operations: Intermediate (\`filter\`, \`map\`) vs Terminal (\`collect\`, \`reduce\`).
* Utilize Parallel Streams safely.

---

## [SLIDE 2] 🧠 Stream Processing Pipeline
\`\`\`text
Source: list.stream()
          │
Intermediate: .filter(s -> s.getGpa() >= 3.5)  <-- LAZY (Executes only on terminal call!)
          │
Intermediate: .map(Student::getName)
          │
Terminal:     .toList()                        <-- TRIGGERS EXECUTION!
\`\`\`

---

## [SLIDE 3] 🏗️ Core Functional Interfaces
| Interface | Method Signature | Purpose | Example |
| :--- | :--- | :--- | :--- |
| **Predicate<T>** | \`boolean test(T t)\` | Boolean filter condition | \`s -> s.getAge() >= 18\` |
| **Function<T, R>**| \`R apply(T t)\` | Transforms type T to R | \`Student::getName\` |
| **Consumer<T>** | \`void accept(T t)\` | Performs side-effect action | \`System.out::println\` |
| **Supplier<T>** | \`T get()\` | Generates or supplies value | \`() -> new Random().nextInt()\` |

---

## [SLIDE 4] 💻 Production Code: Streams Grouping & Statistics
\`\`\`java
import java.util.*;
import java.util.stream.Collectors;

public class AnalyticsService {
    public record CourseEnrollment(String courseCode, String studentId, double grade) {}

    public Map<String, Double> computeCourseAverages(List<CourseEnrollment> records) {
        return records.stream()
            .collect(Collectors.groupingBy(
                CourseEnrollment::courseCode,
                Collectors.averagingDouble(CourseEnrollment::grade)
            ));
    }
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Reusing Streams:** A Stream in Java can only be traversed ONCE! Attempting to invoke terminal operations on a consumed stream throws \`IllegalStateException: stream has already been operated upon\`.
2. **Side-Effects in Stream Operations:** Modifying shared mutable external variables inside \`.forEach()\` or \`.map()\` leads to severe race conditions when switching to \`.parallelStream()\`.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the difference between intermediate and terminal operations in the Streams API?
  * *Answer:* Intermediate operations return a new stream and are evaluated lazily; terminal operations trigger execution and produce a final result or side-effect.
* **Q2:** What does the method reference \`String::toUpperCase\` represent?
  * *Answer:* Shorthand for the lambda expression \`s -> s.toUpperCase()\`.`
    },
    {
      title: "Lecture 5: Java Concurrency: Threads, Locks, Executors & Virtual Threads",
      body: `## [SLIDE 1] 🎯 High-Throughput Concurrency in Java
Java offers the most advanced concurrency toolkit in the industry, from low-level OS threads to Java 21 Project Loom Virtual Threads.

### 🎯 Key Learning Objectives
* Understand Thread Lifecycle and the \`synchronized\` keyword.
* Utilize \`java.util.concurrent\`: \`ExecutorService\`, \`CountDownLatch\`, and \`ConcurrentHashMap\`.
* Master Java 21 Virtual Threads for high-throughput I/O applications.

---

## [SLIDE 2] 🧠 Platform Threads vs Virtual Threads (Project Loom)
\`\`\`text
Platform (OS) Threads: 1 Java Thread = 1 Kernel Thread (1 MB RAM each -> Max ~5,000 threads)
Virtual Threads:       100,000s of Virtual Threads mapped to a few Carrier OS Threads!
\`\`\`
When a virtual thread blocks on I/O (network, database), the carrier thread unmounts it and executes other work immediately!

---

## [SLIDE 3] 🏗️ Concurrency Primitives Matrix
| Primitive | Purpose | Thread-Safe? |
| :--- | :--- | :--- |
| **AtomicInteger** | Lock-free lockless counter using CPU CAS (Compare-And-Swap) | YES |
| **ReentrantLock** | Explicit mutual exclusion with timeouts and fairness | YES |
| **ConcurrentHashMap** | Lock-striping partitioned thread-safe map | YES |

---

## [SLIDE 4] 💻 Production Code: Java 21 Virtual Thread Pool
\`\`\`java
import java.util.concurrent.*;

public class HighThroughputServer {
    public static void main(String[] args) throws InterruptedException {
        // Spawns millions of lightweight virtual threads effortlessly
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 10_000; i++) {
                final int taskId = i;
                executor.submit(() -> {
                    Thread.sleep(100); // Non-blocking simulation of database call
                    return taskId * 2;
                });
            }
        } // Auto-closes and awaits termination of all tasks
        System.out.println("All 10,000 tasks executed with virtual threads!");
    }
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Deadlock Conditions:** Deadlock occurs when Thread 1 holds Lock A and waits for Lock B, while Thread 2 holds Lock B and waits for Lock A. Always acquire multiple locks in a globally consistent order.
2. **Thread Starvation with CPU-Bound Tasks on Virtual Threads:** Virtual threads are designed for blocking I/O; running heavy CPU-bound computations on virtual threads can pin carrier threads and degrade performance.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is a race condition?
  * *Answer:* A flaw where multiple threads access and mutate shared memory concurrently, producing unpredictable results depending on execution timing.
* **Q2:** How does \`AtomicInteger.incrementAndGet()\` achieve thread safety without locks?
  * *Answer:* By using hardware-level Compare-And-Swap (CAS) CPU instructions that update memory atomically.`
    },
    {
      title: "Lecture 6: Resilient Java I/O: NIO.2, Serialization & File Channels",
      body: `## [SLIDE 1] 🎯 Enterprise File I/O & Serialization
Java NIO.2 (\`java.nio.file\`) replaced legacy \`java.io.File\` with non-blocking buffers, memory-mapped files, and robust path operations.

### 🎯 Key Learning Objectives
* Master the \`Path\` and \`Files\` APIs.
* Use try-with-resources (\`AutoCloseable\`) for resource safety.
* Parse structured JSON/XML data using modern libraries (Jackson).

---

## [SLIDE 2] 🧠 Stream vs Channel Buffer Architecture
\`\`\`text
Legacy IO:    File ─── Byte Stream (Blocking, byte-by-byte) ───► Program
NIO.2:        File ─── FileChannel (DMA / Block Transfer) ───► ByteBuffer (Direct Memory)
\`\`\`

---

## [SLIDE 3] 🏗️ Try-With-Resources Protocol
Any class implementing \`java.lang.AutoCloseable\` can be managed automatically:
\`\`\`java
try (BufferedReader br = Files.newBufferedReader(path)) {
    // br.close() is ALWAYS called even if exceptions occur!
}
\`\`\`

---

## [SLIDE 4] 💻 Production Code: Safe File Ingestion
\`\`\`java
import java.io.IOException;
import java.nio.file.*;
import java.util.List;

public class LogProcessor {
    public static List<String> extractErrors(Path logPath) throws IOException {
        if (!Files.exists(logPath)) {
            throw new NoSuchFileException("Log file not found: " + logPath);
        }

        try (var linesStream = Files.lines(logPath)) {
            return linesStream
                .filter(line -> line.contains("ERROR"))
                .limit(100)
                .toList();
        }
    }
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Leaking \`Files.lines()\` Streams:** \`Files.lines()\` opens a file descriptor that remains locked until closed! Always wrap it in a \`try-with-resources\` block.
2. **Native Java Serialization Security Holes:** Never use \`ObjectInputStream\` with untrusted inputs—it is a notorious vector for arbitrary remote code execution (RCE) attacks! Use JSON (Jackson) or Protocol Buffers instead.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What interface must a class implement to be used in a \`try-with-resources\` statement?
  * *Answer:* \`java.lang.AutoCloseable\`.
* **Q2:** Why is \`Path.resolve()\` preferred over manual string concatenation for building file paths?
  * *Answer:* \`Path.resolve()\` automatically uses the correct operating system separator (\`/\` on POSIX vs \`\\\` on Windows) and prevents malformed paths.`
    },
    {
      title: "Lecture 7: Design Patterns in Java (Singleton, Factory, Builder & Observer)",
      body: `## [SLIDE 1] 🎯 Classic Gang of Four (GoF) Design Patterns
Design patterns are reusable solutions to commonly occurring software architecture problems in object-oriented systems.

### 🎯 Key Learning Objectives
* Implement Creational Patterns: Singleton (Thread-Safe Enum) and Builder.
* Master Structural Patterns: Adapter and Decorator.
* Implement Behavioral Patterns: Strategy and Observer.

---

## [SLIDE 2] 🧠 The Builder Pattern Architecture
\`\`\`text
Director / Client:
DatabaseConfig config = new DatabaseConfig.Builder()
    .host("localhost")
    .port(5432)
    .database("studyos")
    .timeout(30)
    .build(); // Validates all constraints atomically before returning immutable object!
\`\`\`

---

## [SLIDE 3] 🏗️ Core Patterns Classification
| Pattern | Category | Intent |
| :--- | :--- | :--- |
| **Singleton** | Creational | Ensures exactly one instance exists with a global access point |
| **Builder** | Creational | Constructs complex objects step-by-step with immutability |
| **Strategy** | Behavioral | Defines a family of interchangeable algorithms |
| **Observer** | Behavioral | Notifies dependent subscribers when state changes |

---

## [SLIDE 4] 💻 Production Code: Thread-Safe Singleton & Strategy
\`\`\`java
// Effective Java Item 3: A single-element enum is the best way to implement a Singleton
public enum ConfigurationManager {
    INSTANCE;
    private final String environment = System.getenv().getOrDefault("ENV", "development");
    public String getEnvironment() { return environment; }
}

// Strategy Pattern Interface
public interface CompressionStrategy {
    byte[] compress(byte[] data);
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Broken Double-Checked Locking:** In Java, implementing a Singleton using double-checked locking without the \`volatile\` keyword allows partially constructed objects to be observed by other threads due to instruction reordering!
2. **Over-Engineering with Patterns:** Applying patterns where simple straightforward methods suffice introduces unnecessary indirection and complexity.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** Why is an \`enum\` the recommended way to implement a Singleton in Java?
  * *Answer:* Enums provide automatic thread-safety, serialization guarantees, and prevent reflection-based instantiation attacks without complex boilerplate.
* **Q2:** What problem does the Builder pattern solve?
  * *Answer:* It eliminates telescoping constructors with numerous parameters and allows building immutable objects with clear, fluent method chaining.`
    },
    {
      title: "Lecture 8: Spring Boot Foundations: Dependency Injection, JPA & REST",
      body: `## [SLIDE 1] 🎯 Enterprise Microservices with Spring Boot
Spring Boot is the standard enterprise Java framework, providing Inversion of Control (IoC), Dependency Injection (DI), and seamless ORM persistence.

### 🎯 Key Learning Objectives
* Understand Inversion of Control (IoC) and the ApplicationContext.
* Master Spring Stereotype Annotations: \`@RestController\`, \`@Service\`, \`@Repository\`.
* Map database entities with Jakarta Persistence API (JPA) and Spring Data.

---

## [SLIDE 2] 🧠 Spring Inversion of Control (IoC) Flow
\`\`\`text
Spring Boot Application Startup
      │
      ▼ Component Scan
Discovers @Component, @Service, @Repository, @RestController
      │
      ▼ IoC Container
Instantiates Beans and injects dependencies via Constructor Injection
      │
      ▼ Ready to serve HTTP Traffic
Client Request ──► @RestController ──► @Service ──► @Repository (JPA) ──► PostgreSQL
\`\`\`

---

## [SLIDE 3] 🏗️ Spring Stereotype Architecture
| Annotation | Role in Architecture |
| :--- | :--- |
| **\`@RestController\`** | Handles HTTP requests, serializes responses to JSON |
| **\`@Service\`** | Encapsulates business logic, transactional boundaries (\`@Transactional\`) |
| **\`@Repository\`** | Data access layer, translates database exceptions |
| **\`@Entity\`** | Maps Java class to relational database table |

---

## [SLIDE 4] 💻 Production Code: Spring Boot REST Controller
\`\`\`java
package com.studyos.api;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/v1/courses")
public class CourseController {
    private final CourseService courseService;

    // Preferred: Constructor Injection
    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping
    public ResponseEntity<List<CourseDto>> listActiveCourses() {
        return ResponseEntity.ok(courseService.getAllActive());
    }

    @PostMapping
    public ResponseEntity<CourseDto> createCourse(@RequestBody CourseCreateRequest req) {
        CourseDto created = courseService.create(req);
        return ResponseEntity.status(201).body(created);
    }
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Field Injection with \`@Autowired\`:** Field injection hides dependencies, makes unit testing difficult, and prevents immutable final fields. Always use **Constructor Injection**!
2. **LazyInitializationException in JPA:** Accessing lazy-loaded relations outside a transactional boundary throws this error. Use JOIN FETCH queries or DTO projections.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is Inversion of Control (IoC)?
  * *Answer:* A design principle where the framework controls the program's execution flow and creates/wires dependencies rather than individual classes instantiating them directly.
* **Q2:** Why is Constructor Injection preferred over Field Injection in Spring?
  * *Answer:* It allows dependencies to be marked \`final\` (immutability), prevents partially initialized objects, and makes testing trivial without Spring reflections.`
    }
  ],
  dailyLessons: [
    {
      dayNumber: 1,
      title: "Java Setup: JDK 21, JVM Internals & Hello World",
      subtasks: [
        "Install OpenJDK 21 and verify with java -version and javac -version",
        "Compile source with javac Main.java and inspect generated Main.class bytecode",
        "Disassemble bytecode using javap -c Main to view JVM opcodes",
        "Execute application with java Main and verify return status"
      ],
      notes: "# Java Setup & The JVM\\n\\nThe Java compiler outputs platform-independent bytecode executed by the JVM."
    },
    {
      dayNumber: 2,
      title: "Java Primitives, Wrapper Classes & Autoboxing",
      subtasks: [
        "Declare all 8 primitive types (byte, short, int, long, float, double, char, boolean)",
        "Explore wrapper classes (Integer, Double) and autoboxing/unboxing overhead",
        "Test Integer cache pooling (-128 to 127) with == and equals()",
        "Use BigInteger and BigDecimal for exact financial arithmetic"
      ],
      notes: "# Primitives & Wrappers\\n\\nAlways use `BigDecimal` for currency to avoid IEEE 754 precision errors."
    },
    {
      dayNumber: 3,
      title: "Java OOP: Classes, Encapsulation & Access Modifiers",
      subtasks: [
        "Create domain class with private fields and public getters/setters",
        "Validate inputs defensively inside constructors",
        "Compare access levels: private, package-private, protected, and public",
        "Modernize data carrier classes using Java Records"
      ],
      notes: "# Encapsulation\\n\\nKeep fields private and expose controlled access via getters and constructors."
    },
    {
      dayNumber: 4,
      title: "Java OOP: Inheritance, Polymorphism & super Keyword",
      subtasks: [
        "Extend base class using extends and invoke parent constructor with super()",
        "Override methods with explicit @Override annotation",
        "Demonstrate polymorphic assignment: Animal a = new Dog()",
        "Prevent inheritance using final class and final method declarations"
      ],
      notes: "# Polymorphism\\n\\nRuntime polymorphism dynamically resolves method implementations via virtual method tables."
    },
    {
      dayNumber: 5,
      title: "Java Abstraction: Interfaces vs Abstract Classes",
      subtasks: [
        "Define an interface with abstract and default methods",
        "Implement multiple interfaces in a single concrete class",
        "Create an abstract class with shared template method logic",
        "Compare interface default methods vs abstract class methods"
      ],
      notes: "# Interfaces & Abstraction\\n\\nInterfaces define behavioral contracts while abstract classes share state and implementation."
    },
    {
      dayNumber: 6,
      title: "Banking Simulation Engine Milestone",
      subtasks: [
        "Implement Account, SavingsAccount, and CheckingAccount class hierarchy",
        "Enforce transaction limits and throw custom InsufficientFundsException",
        "Maintain chronological transaction log using immutable records",
        "Complete Week 1 Project: Banking Simulation Engine & Transaction Ledger"
      ],
      notes: "# Banking Simulation Review\\n\\nMastering class hierarchies and exception handling creates robust enterprise software."
    },
    {
      dayNumber: 7,
      title: "Java Collections: ArrayList, LinkedList & List Operations",
      subtasks: [
        "Benchmark random access vs sequential insertion in ArrayList and LinkedList",
        "Sort lists using Collections.sort() and custom Comparator",
        "Transform arrays to lists using Arrays.asList() and List.of()",
        "Iterate safely using Iterator.remove() to avoid concurrent modifications"
      ],
      notes: "# List Collections\\n\\n`ArrayList` offers $O(1)$ indexed reads; `LinkedList` offers $O(1)$ insertion at boundaries."
    },
    {
      dayNumber: 8,
      title: "Java Sets & Maps: HashSet, TreeSet, HashMap & TreeMap",
      subtasks: [
        "Implement custom key class and override equals() and hashCode() correctly",
        "Verify why violating the equals/hashCode contract corrupts HashSet lookups",
        "Iterate over map entries using entrySet() and keySet()",
        "Use TreeMap for natural sorted key order traversal"
      ],
      notes: "# Maps & Hash Tables\\n\\n`HashMap` provides $O(1)$ amortized lookups; always implement `equals()` and `hashCode()` together."
    },
    {
      dayNumber: 9,
      title: "Java Generics: Type Parameters, Bounds & Wildcards",
      subtasks: [
        "Create generic class Container<T> with type safety",
        "Use upper bounded wildcards: List<? extends Number>",
        "Apply the PECS guideline (Producer Extends, Consumer Super)",
        "Understand type erasure and its runtime limitations"
      ],
      notes: "# Generics & Type Erasure\\n\\nGenerics provide compile-time type safety; types are erased to `Object` in bytecode."
    },
    {
      dayNumber: 10,
      title: "Functional Java: Lambdas & Built-in Functional Interfaces",
      subtasks: [
        "Write lambda expressions replacing anonymous inner classes",
        "Apply Predicate<T>, Function<T, R>, and Consumer<T>",
        "Use method references (Class::method, instance::method)",
        "Compose predicates with and(), or(), and negate()"
      ],
      notes: "# Lambdas & Functional Interfaces\\n\\nLambdas enable concise functional composition across collections."
    },
    {
      dayNumber: 11,
      title: "Java Streams API: filter, map, flatMap & collect",
      subtasks: [
        "Chain intermediate operations (filter, map, sorted, distinct)",
        "Flatten nested collections using flatMap()",
        "Aggregate results with Collectors.toList() and Collectors.joining()",
        "Compute grouped summaries with Collectors.groupingBy()"
      ],
      notes: "# The Streams API\\n\\nStreams process data declaratively with lazy evaluation."
    },
    {
      dayNumber: 12,
      title: "Custom Generic Collections Milestone",
      subtasks: [
        "Build a custom generic PriorityQueue with binary min-heap backing",
        "Implement Iterable<T> interface to support enhanced for-loops",
        "Write comprehensive JUnit tests verifying edge-case operations",
        "Complete Week 2 Project: Custom Generic Collections & Priority Dispatcher"
      ],
      notes: "# Collections Project Review\\n\\nImplementing custom data structures sharpens generic programming instincts."
    },
    {
      dayNumber: 13,
      title: "Java Concurrency: Threads, Runnable & synchronized",
      subtasks: [
        "Create and start threads using Thread and Runnable",
        "Synchronize critical sections using the synchronized keyword",
        "Observe race conditions on un-synchronized shared counters",
        "Communicate between threads using wait(), notify(), and notifyAll()"
      ],
      notes: "# Thread Basics\\n\\n`synchronized` prevents multiple threads from executing critical sections simultaneously."
    },
    {
      dayNumber: 14,
      title: "Concurrency Utilities: ExecutorService, Futures & Thread Pools",
      subtasks: [
        "Manage thread pools using Executors.newFixedThreadPool()",
        "Submit asynchronous Callable<T> tasks and retrieve Future<T> results",
        "Handle task timeouts with future.get(timeout, TimeUnit.SECONDS)",
        "Shut down executors gracefully using shutdown() and awaitTermination()"
      ],
      notes: "# Thread Pools\\n\\n`ExecutorService` decouples task submission from thread management."
    },
    {
      dayNumber: 15,
      title: "Concurrent Collections & Atomic Variables",
      subtasks: [
        "Use AtomicInteger and AtomicReference for lock-free thread safety",
        "Replace synchronized maps with high-throughput ConcurrentHashMap",
        "Implement producer-consumer queue using ArrayBlockingQueue",
        "Coordinate concurrent worker threads using CountDownLatch"
      ],
      notes: "# Lock-Free Concurrency\\n\\nAtomic classes use hardware CAS instructions for thread-safe mutations without blocking."
    },
    {
      dayNumber: 16,
      title: "Java 21 Virtual Threads & Structured Concurrency",
      subtasks: [
        "Create virtual threads using Thread.ofVirtual().start()",
        "Spawn 100,000 virtual threads and inspect minimal RAM footprint",
        "Compare virtual thread throughput on blocking I/O vs platform threads",
        "Manage concurrent subtasks using StructuredTaskScope"
      ],
      notes: "# Project Loom Virtual Threads\\n\\nVirtual threads deliver lightweight, high-scale concurrency for I/O-bound applications."
    },
    {
      dayNumber: 17,
      title: "Java NIO.2: Files, Paths & Non-Blocking Channels",
      subtasks: [
        "Read and write text files using java.nio.file.Files",
        "Stream file contents line-by-line with Files.lines() in try-with-resources",
        "Traverse directory trees recursively with Files.walk()",
        "Watch filesystem events using WatchService"
      ],
      notes: "# Modern Java File I/O\\n\\nNIO.2 replaces legacy File API with fast, non-blocking path operations."
    },
    {
      dayNumber: 18,
      title: "Multi-Threaded Web Crawler Milestone",
      subtasks: [
        "Build a concurrent crawler fetching URLs using HttpClient and Virtual Threads",
        "Maintain visited URL set using ConcurrentHashMap.newKeySet()",
        "Enforce rate limits using Semaphore",
        "Complete Week 3 Project: Multi-Threaded Web Crawler & Producer-Consumer Pipeline"
      ],
      notes: "# Concurrency Milestone Review\\n\\nCombining virtual threads with thread-safe sets builds resilient crawler engines."
    },
    {
      dayNumber: 19,
      title: "Design Patterns: Singleton, Factory & Builder",
      subtasks: [
        "Implement Singleton pattern safely using single-element enum",
        "Build object instances with fluent, immutable Builder pattern",
        "Implement Factory pattern to decouple instantiation from client code",
        "Refactor legacy constructor parameters into clean builders"
      ],
      notes: "# Creational Patterns\\n\\nBuilders construct complex immutable objects with readability and validation."
    },
    {
      dayNumber: 20,
      title: "Design Patterns: Strategy, Observer & Decorator",
      subtasks: [
        "Implement Strategy pattern using interchangeable lambda expressions",
        "Build event notification system using Observer pattern",
        "Wrap I/O streams using Decorator pattern",
        "Apply patterns to eliminate cascading if-else statements"
      ],
      notes: "# Behavioral Patterns\\n\\nStrategy patterns swap algorithms at runtime without modifying callers."
    },
    {
      dayNumber: 21,
      title: "Spring Boot Basics: Inversion of Control & Dependency Injection",
      subtasks: [
        "Bootstrap Spring Boot project using Spring Initializr",
        "Register service beans with @Service and inject via constructors",
        "Configure application properties in application.yml",
        "Run Spring Boot application and inspect console banner and beans"
      ],
      notes: "# Spring Boot & IoC\\n\\nSpring's IoC container manages bean lifecycles and dependency wiring."
    },
    {
      dayNumber: 22,
      title: "Spring Boot REST: Controllers, RequestMapping & DTO Validation",
      subtasks: [
        "Expose REST endpoints using @RestController and @GetMapping/@PostMapping",
        "Validate incoming request bodies using Jakarta validation annotations (@NotNull, @Size)",
        "Handle exceptions globally using @ControllerAdvice and @ExceptionHandler",
        "Test endpoints using curl or Postman"
      ],
      notes: "# RESTful APIs in Spring\\n\\nUse `@RestController` with `@Valid` DTOs for type-safe HTTP endpoints."
    },
    {
      dayNumber: 23,
      title: "Spring Data JPA & Hibernate: Entities, Repositories & Postgres",
      subtasks: [
        "Map relational tables using @Entity, @Id, and @GeneratedValue",
        "Create CRUD repositories extending JpaRepository<Entity, ID>",
        "Write custom derived query methods (findByEmail, findByStatus)",
        "Manage transaction boundaries with @Transactional"
      ],
      notes: "# Persistence with Spring Data JPA\\n\\n`JpaRepository` provides automatic database operations without boilerplate SQL."
    },
    {
      dayNumber: 24,
      title: "Enterprise Java Capstone: Production Deployment & Docker",
      subtasks: [
        "Package Spring Boot application into executable fat JAR",
        "Containerize application using multi-stage Dockerfile",
        "Write automated integration tests using @SpringBootTest and Testcontainers",
        "Complete Week 4 Capstone: Enterprise Spring Boot REST API with Postgres"
      ],
      notes: "# Java Mastery\\n\\nCongratulations! You have mastered enterprise Java, OOP design, concurrency, and Spring Boot."
    }
  ]
});

// 6. MACHINE LEARNING & DEEP LEARNING
writeCatalog('machine-learning.ts', {
  id: "machine-learning",
  aliases: ["machine learning", "ml", "ai", "deep learning", "neural networks", "data science ml"],
  subject: {
    name: "Machine Learning & Deep Learning",
    description: "Statistical learning, gradient descent, loss functions, Scikit-Learn, PyTorch neural networks, and model deployment.",
    color: "#8B5CF6",
    icon: "brain"
  },
  assignments: [
    {
      title: "Week 1 Project: Housing Price Regression & Gradient Descent from Scratch",
      description: "Implement simple and multivariate linear regression from scratch using NumPy vectorization, gradient descent, and MSE cost functions.",
      daysDue: 7
    },
    {
      title: "Week 2 Project: Multi-Class Disease Diagnostics with Logistic Regression & SVM",
      description: "Train and evaluate diagnostic classifiers; compute precision, recall, ROC-AUC, and F1 scores using Scikit-Learn pipelines.",
      daysDue: 14
    },
    {
      title: "Week 3 Project: Deep Neural Network from Scratch with Backpropagation",
      description: "Build a multi-layer perceptron (MLP) from scratch: forward pass, ReLU activations, cross-entropy loss, and backpropagation gradients.",
      daysDue: 21
    },
    {
      title: "Week 4 Capstone: PyTorch Image Classifier & REST Inference Microservice",
      description: "Train a Convolutional Neural Network (CNN) on CIFAR-10 in PyTorch; export model weights and wrap in a high-speed FastAPI inference service.",
      daysDue: 28
    }
  ],
  resources: [
    {
      type: "youtube",
      title: "Machine Learning for Everybody - Full Course (freeCodeCamp)",
      url: "https://www.youtube.com/watch?v=i_LwzRVP7bg",
      providerItemId: "i_LwzRVP7bg"
    },
    {
      type: "youtube",
      title: "But what is a neural network? | Deep Learning Chapter 1 (3Blue1Brown)",
      url: "https://www.youtube.com/watch?v=aircAruvnKk",
      providerItemId: "aircAruvnKk"
    },
    {
      type: "web",
      title: "Scikit-Learn Official User Guide & Tutorials",
      url: "https://scikit-learn.org/stable/user_guide.html",
      providerItemId: null
    },
    {
      type: "web",
      title: "PyTorch Official Deep Learning Tutorials",
      url: "https://pytorch.org/tutorials/",
      providerItemId: null
    }
  ],
  lectureDecks: [
    {
      title: "Lecture 1: The Machine Learning Taxonomy, Loss Functions & Gradient Descent",
      body: `## [SLIDE 1] 🎯 Course Objectives & The Machine Learning Paradigm
Welcome to Machine Learning & Deep Learning! Unlike classical programming where engineers write explicit rules, ML algorithms discover patterns and decision boundaries directly from data.

### 🎯 Key Learning Objectives
* Understand Supervised, Unsupervised, and Reinforcement Learning.
* Formulate Cost Functions: Mean Squared Error (MSE) and Cross-Entropy.
* Master Gradient Descent optimization: Learning Rates and Local Minima.

💡 **Professor's Tip:** Machine learning is applied multivariable calculus and linear algebra. Every model optimizes a loss function by following the negative gradient!

---

## [SLIDE 2] 🧠 Classical Programming vs Machine Learning
\`\`\`text
Classical Programming:
Data + Rules ────────────────────────► Answers

Machine Learning:
Data + Answers (Labels) ─────────────► Rules / Model Weights
\`\`\`

---

## [SLIDE 3] 🏗️ The Gradient Descent Optimization Loop
Cost Function $J(\\theta)$ represents model error.
Update rule:
$$\\theta := \\theta - \\alpha \\nabla J(\\theta)$$
Where:
* $\\theta$: Model parameters (weights & bias)
* $\\alpha$: Learning Rate (step size)
* $\\nabla J(\\theta)$: Gradient vector of partial derivatives

\`\`\`text
Loss J(w)
   ▲         * Start
   │          \\
   │           \\ Step 1
   │            \\
   │             * Step 2
   │               \\
   │                * Minimum J(w*)
   └────────────────────────────────► Weight (w)
\`\`\`

---

## [SLIDE 4] 💻 Production Code: Vectorized Linear Regression
\`\`\`python
import numpy as np

class LinearRegressionScratch:
    def __init__(self, lr: float = 0.01, iterations: int = 1000):
        self.lr = lr
        self.iterations = iterations
        self.weights = None
        self.bias = 0.0

    def fit(self, X: np.ndarray, y: np.ndarray):
        n_samples, n_features = X.shape
        self.weights = np.zeros(n_features)
        
        for _ in range(self.iterations):
            # 1. Forward prediction: y_pred = X . w + b
            y_pred = np.dot(X, self.weights) + self.bias
            
            # 2. Compute gradients
            dw = (1 / n_samples) * np.dot(X.T, (y_pred - y))
            db = (1 / n_samples) * np.sum(y_pred - y)
            
            # 3. Update weights
            self.weights -= self.lr * dw
            self.bias -= self.lr * db

    def predict(self, X: np.ndarray) -> np.ndarray:
        return np.dot(X, self.weights) + self.bias
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Learning Rate Too High:** If $\\alpha$ is too large, gradient descent will overshoot the minimum and diverge to infinity! Always check for exploding loss values.
2. **Data Leakage in Normalization:** Fitting scalers (\`StandardScaler\`) on the ENTIRE dataset before train/test splitting leaks test distribution information into the training phase. ALWAYS fit on train data only!

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What does the gradient $\\nabla J(\\theta)$ represent mathematically?
  * *Answer:* The vector of partial derivatives pointing in the direction of steepest ascent of the cost function.
* **Q2:** Why do we subtract the gradient in the weight update equation?
  * *Answer:* To move in the direction of steepest descent, thereby minimizing the error.`
    },
    {
      title: "Lecture 2: Classification, Logistic Regression & Evaluation Metrics",
      body: `## [SLIDE 1] 🎯 Binary Classification & The Sigmoid Activation
Classification predicts discrete category labels rather than continuous numbers.

### 🎯 Key Learning Objectives
* Understand Logistic Regression and the Sigmoid function $\\sigma(z)$.
* Formulate Binary Cross-Entropy (Log Loss).
* Evaluate models: Precision, Recall, F1-Score, and ROC-AUC.

---

## [SLIDE 2] 🧠 The Sigmoid Function
$$\\sigma(z) = \\frac{1}{1 + e^{-z}}$$
Maps any real-valued number into a calibrated probability range $[0, 1]$.

\`\`\`text
P(y=1)
  1.0 ┼                       ╭───────────
      │                     ╭╯
  0.5 ┼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─*─ ─ ─ ─ ─ ─ ─  Decision Threshold (0.5)
      │                  ╭╯
  0.0 ┼ ───────────────╯
      └───────────────────────────────────► z = w^T x + b
\`\`\`

---

## [SLIDE 3] 🏗️ Confusion Matrix Breakdown
| Actual \\ Predicted | Predicted Negative (0) | Predicted Positive (1) |
| :--- | :--- | :--- |
| **Actual Negative (0)** | **True Negative (TN)** | **False Positive (FP)** (Type I Error) |
| **Actual Positive (1)** | **False Negative (FN)** (Type II Error) | **True Positive (TP)** |

* **Precision:** $\\frac{\\text{TP}}{\\text{TP} + \\text{FP}}$ (When model flags positive, how often is it right?)
* **Recall (Sensitivity):** $\\frac{\\text{TP}}{\\text{TP} + \\text{FN}}$ (How many actual positive cases did model catch?)
* **F1-Score:** Harmonic mean $2 \\cdot \\frac{P \\cdot R}{P + R}$

---

## [SLIDE 4] 💻 Production Code: Diagnostic Pipeline
\`\`\`python
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score

def build_diagnostic_model(X_train, y_train, X_test, y_test):
    # Chain scaler and model into leak-free pipeline
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(penalty="l2", C=1.0))
    ])
    
    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    
    print(classification_report(y_test, y_pred))
    print(f"ROC-AUC Score: {roc_auc_score(y_test, y_prob):.4f}")
    return pipeline
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Relying on Accuracy with Imbalanced Data:** In a dataset with 99% healthy patients and 1% disease cases, a dumb model that always predicts "healthy" achieves 99% accuracy but is completely useless! Always look at Precision, Recall, and ROC-AUC.
2. **Using MSE for Logistic Regression:** Mean Squared Error creates a non-convex loss surface with multiple local traps when combined with sigmoid. Always use Cross-Entropy loss!

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** In medical cancer detection, which metric is more critical to maximize: Precision or Recall?
  * *Answer:* Recall, because a False Negative (missing a patient with cancer) is far more dangerous than a False Positive (which can be re-tested).
* **Q2:** What does the Area Under the ROC Curve (ROC-AUC) measure?
  * *Answer:* The probability that the classifier ranks a randomly chosen positive instance higher than a randomly chosen negative instance across all classification thresholds.`
    },
    {
      title: "Lecture 3: Deep Learning Foundations: Neural Networks & Backpropagation",
      body: `## [SLIDE 1] 🎯 Artificial Neural Networks & Deep Learning
Deep learning replaces manual feature engineering with hierarchical feature representations learned through stacked layers of artificial neurons.

### 🎯 Key Learning Objectives
* Understand the Artificial Neuron (Perceptron): Weights, Biases, and Activation functions.
* Master Non-Linearity: Why activations (ReLU, Sigmoid, GELU) are essential.
* Trace the Chain Rule of Calculus in Backpropagation.

---

## [SLIDE 2] 🧠 The Multi-Layer Perceptron (MLP)
\`\`\`text
Input Layer (X)           Hidden Layer (h)           Output Layer (y)
   (x1) ───────────►           (h1)          ───────────►   (y1)
   (x2) ───────────►           (h2)          ───────────►   (y2)
   (x3) ───────────►           (h3)
\`\`\`
Forward Pass:
$$z^{[1]} = W^{[1]} X + b^{[1]}, \\quad a^{[1]} = \\text{ReLU}(z^{[1]})$$
$$z^{[2]} = W^{[2]} a^{[1]} + b^{[2]}, \\quad \\hat{y} = \\text{Softmax}(z^{[2]})$$

---

## [SLIDE 3] 🏗️ Why Activation Functions are Mandatory
Without non-linear activation functions, stacking 1,000 linear layers collapses into a single linear equation:
$$W_3(W_2(W_1 X)) = (W_3 W_2 W_1) X = W_{\\text{combined}} X$$
Activation functions enable neural networks to approximate any continuous mathematical function (Universal Approximation Theorem).

---

## [SLIDE 4] 💻 Production Code: Backpropagation from Scratch
\`\`\`python
import numpy as np

def relu(z): return np.maximum(0, z)
def relu_deriv(z): return (z > 0).astype(float)

def train_mlp_step(X, y, W1, b1, W2, b2, lr=0.01):
    m = X.shape[0]
    
    # Forward Pass
    Z1 = np.dot(X, W1) + b1
    A1 = relu(Z1)
    Z2 = np.dot(A1, W2) + b2
    y_pred = Z2  # Linear output
    
    # Backpropagation (Chain Rule)
    dZ2 = (y_pred - y) / m
    dW2 = np.dot(A1.T, dZ2)
    db2 = np.sum(dZ2, axis=0, keepdims=True)
    
    dA1 = np.dot(dZ2, W2.T)
    dZ1 = dA1 * relu_deriv(Z1)
    dW1 = np.dot(X.T, dZ1)
    db1 = np.sum(dZ1, axis=0, keepdims=True)
    
    # Gradient Descent Update
    W1 -= lr * dW1
    b1 -= lr * db1
    W2 -= lr * dW2
    b2 -= lr * db2
    return W1, b1, W2, b2
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Vanishing Gradient Problem:** Using Sigmoid or Tanh in deep networks causes gradients to saturate near 0 for large inputs, halting learning. ReLU solves this by maintaining gradient 1 for positive activations.
2. **Dying ReLU:** If learning rate is too high, neurons can become deactivated with negative inputs across all training data, outputting 0 forever. Leaky ReLU solves this.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What mathematical principle enables backpropagation in neural networks?
  * *Answer:* The chain rule of differential calculus.
* **Q2:** Why should neural network weights NOT be initialized to all zeros?
  * *Answer:* Zero initialization causes all neurons in a layer to compute the exact same gradient, preventing symmetric feature differentiation.`
    },
    {
      title: "Lecture 4: PyTorch Deep Learning: Tensors, Autograd & GPU Acceleration",
      body: `## [SLIDE 1] 🎯 Modern Deep Learning with PyTorch
PyTorch is the premier deep learning framework used by Meta, OpenAI, and premier AI research labs for tensor computing and dynamic automatic differentiation.

### 🎯 Key Learning Objectives
* Master PyTorch Tensors and GPU execution (\`.to('cuda')\`).
* Understand \`torch.autograd\` computational graphs.
* Build neural networks using \`nn.Module\` and \`torch.optim\`.

---

## [SLIDE 2] 🧠 The PyTorch Training Loop
\`\`\`text
For each batch in DataLoader:
  1. optimizer.zero_grad()    <-- Clear previous gradients!
  2. outputs = model(inputs)  <-- Forward pass
  3. loss = criterion(outputs, labels)
  4. loss.backward()          <-- Autograd computes all partial derivatives!
  5. optimizer.step()          <-- Update weights using Adam / SGD
\`\`\`

---

## [SLIDE 3] 🏗️ Popular Optimizers Compared
| Optimizer | Momentum? | Adaptive Learning Rates? | Best Use Case |
| :--- | :--- | :--- | :--- |
| **SGD** | Optional | NO | Clean convergence on computer vision |
| **Adam** | YES | YES (Calculates 1st & 2nd moments) | Default standard for deep networks |
| **AdamW** | YES | YES (Decoupled weight decay) | Transformer models and modern LLMs |

---

## [SLIDE 4] 💻 Production Code: PyTorch Classifier
\`\`\`python
import torch
import torch.nn as nn
import torch.optim as optim

class NeuralClassifier(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int, num_classes: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)

# Setup device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = NeuralClassifier(20, 64, 2).to(device)
criterion = nn.CrossEntropyLoss()
optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-2)
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Forgetting \`optimizer.zero_grad()\`:** PyTorch accumulates gradients by default! Omitting \`zero_grad()\` sums gradients across multiple batches, corrupting weight updates.
2. **Forgetting \`model.eval()\` and \`torch.no_grad()\`: ** During inference, failure to call \`model.eval()\` leaves Dropout and BatchNorm active, producing non-deterministic evaluation results.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What does \`loss.backward()\` do in PyTorch?
  * *Answer:* Computes the gradients of the loss with respect to all graph leaves (parameters with \`requires_grad=True\`) using reverse-mode automatic differentiation.
* **Q2:** What is the purpose of \`nn.Dropout\` during training?
  * *Answer:* Randomly zeroes out neuron activations with probability $p$, preventing co-adaptation of features and mitigating overfitting.`
    }
  ],
  dailyLessons: [
    {
      dayNumber: 1,
      title: "ML Foundations: Supervised vs Unsupervised & Feature Engineering",
      subtasks: [
        "Classify problems into regression, classification, clustering, or dimensionality reduction",
        "Perform feature scaling using StandardScaler and MinMaxScaler",
        "One-hot encode categorical features without introducing dummy variable traps",
        "Split datasets into train, validation, and test partitions"
      ],
      notes: "# ML Taxonomy\\n\\nProper feature preprocessing and data hygiene are essential before training."
    },
    {
      dayNumber: 2,
      title: "Linear Regression: Cost Functions & Ordinary Least Squares",
      subtasks: [
        "Formulate Mean Squared Error (MSE) cost function mathematically",
        "Derive normal equation (X^T X)^-1 X^T y",
        "Train linear regression model in Scikit-Learn",
        "Interpret model coefficients and R^2 score"
      ],
      notes: "# Linear Regression\\n\\nLinear regression models relationships between input features and continuous targets."
    },
    {
      dayNumber: 3,
      title: "Gradient Descent: Batch, Stochastic & Mini-Batch",
      subtasks: [
        "Implement Batch Gradient Descent on toy dataset",
        "Implement Stochastic Gradient Descent (SGD) and observe loss noise",
        "Compare mini-batch gradient descent throughput on CPU",
        "Tune learning rate schedule with step decay"
      ],
      notes: "# Gradient Descent\\n\\nMini-batch gradient descent balances vectorization speed with regularizing stochastic noise."
    },
    {
      dayNumber: 4,
      title: "Overfitting & Regularization: Ridge (L2) & Lasso (L1)",
      subtasks: [
        "Explain bias-variance tradeoff",
        "Apply Ridge regression (L2 penalty) to shrink weights",
        "Apply Lasso regression (L1 penalty) for automatic feature selection",
        "Tune regularization strength hyperparameter alpha with RidgeCV"
      ],
      notes: "# Regularization\\n\\nL1 produces sparse weights (feature selection); L2 penalizes large weights."
    },
    {
      dayNumber: 5,
      title: "Multivariate Regression & Polynomial Features",
      subtasks: [
        "Generate interaction and non-linear polynomial features with PolynomialFeatures",
        "Observe overfitting with high degree polynomials",
        "Plot learning curves across varying training set sizes",
        "Evaluate cross-validation scores using cross_val_score"
      ],
      notes: "# Polynomial Regression\\n\\nHigh-degree polynomials capture non-linear patterns but risk severe overfitting."
    },
    {
      dayNumber: 6,
      title: "Housing Price Regression Milestone",
      subtasks: [
        "Clean housing dataset and impute missing values",
        "Train regularized regression pipeline and achieve competitive RMSE",
        "Plot predicted vs actual price distributions",
        "Complete Week 1 Project: Housing Price Regression & Gradient Descent from Scratch"
      ],
      notes: "# Regression Milestone Review\\n\\nLinear regression with feature scaling and L2 regularization forms the baseline for predictive systems."
    },
    {
      dayNumber: 7,
      title: "Logistic Regression: Odds Ratios & Sigmoid Function",
      subtasks: [
        "Derive log-odds (logit) formulation",
        "Implement Sigmoid activation function in NumPy",
        "Train Logistic Regression classifier with Scikit-Learn",
        "Plot decision boundaries on 2D synthetic dataset"
      ],
      notes: "# Logistic Regression\\n\\nLogistic regression models log-odds using the sigmoid function."
    },
    {
      dayNumber: 8,
      title: "Evaluation Metrics: Precision, Recall, F1 & ROC-AUC",
      subtasks: [
        "Construct confusion matrix and calculate TP, FP, TN, FN",
        "Plot Precision-Recall curve on imbalanced dataset",
        "Calculate Area Under ROC Curve (ROC-AUC)",
        "Adjust classification probability decision thresholds"
      ],
      notes: "# Evaluation Metrics\\n\\nAlways prioritize Precision, Recall, and ROC-AUC over raw accuracy on real-world datasets."
    },
    {
      dayNumber: 9,
      title: "Decision Trees: Entropy, Information Gain & Gini Impurity",
      subtasks: [
        "Calculate Gini impurity and Information Gain manually",
        "Train DecisionTreeClassifier and visualize tree architecture",
        "Prune tree depth with max_depth and min_samples_split to prevent overfitting",
        "Extract feature importance rankings"
      ],
      notes: "# Decision Trees\\n\\nTrees greedily split features to maximize information gain."
    },
    {
      dayNumber: 10,
      title: "Ensemble Learning: Random Forests & Bagging",
      subtasks: [
        "Understand bootstrap aggregating (Bagging) variance reduction",
        "Train RandomForestClassifier with 100 estimators",
        "Evaluate Out-of-Bag (OOB) error score",
        "Compare Random Forest accuracy vs single Decision Tree"
      ],
      notes: "# Random Forests\\n\\nEnsembles combine hundreds of decorrelated trees to reduce model variance."
    },
    {
      dayNumber: 11,
      title: "Gradient Boosting: XGBoost & LightGBM",
      subtasks: [
        "Explain boosting principle: sequentially training trees to correct previous residual errors",
        "Train XGBoost classifier with early stopping",
        "Tune learning_rate, subsample, and max_depth hyperparameters",
        "Analyze SHAP (SHapley Additive exPlanations) values for model interpretability"
      ],
      notes: "# Gradient Boosting\\n\\nGradient boosting trains sequential weak learners on negative loss gradients."
    },
    {
      dayNumber: 12,
      title: "Disease Diagnostics Classification Milestone",
      subtasks: [
        "Train multi-class diagnostic classifier with cross-validation",
        "Produce detailed classification report and confusion matrix heatmap",
        "Export serialized model with joblib",
        "Complete Week 2 Project: Multi-Class Disease Diagnostics with Logistic Regression"
      ],
      notes: "# Diagnostics Review\\n\\nTree ensembles and gradient boosting deliver state-of-the-art results on tabular data."
    },
    {
      dayNumber: 13,
      title: "Perceptrons & Artificial Neurons: Architecture & Forward Pass",
      subtasks: [
        "Implement single artificial neuron in NumPy (dot product + bias + activation)",
        "Demonstrate why single-layer perceptrons fail to solve XOR problem",
        "Stack hidden layers to solve non-linear XOR boundary",
        "Compare activation functions (Sigmoid, Tanh, ReLU, LeakyReLU)"
      ],
      notes: "# Neural Network Basics\\n\\nHidden layers with non-linear activations enable modeling arbitrary decision boundaries."
    },
    {
      dayNumber: 14,
      title: "Backpropagation: The Chain Rule & Gradient Computation",
      subtasks: [
        "Derive partial derivatives for 2-layer neural network mathematically",
        "Implement backward pass propagating error gradients from output to input",
        "Verify gradient calculations using finite difference numerical gradient checking",
        "Plot loss trajectory over 1,000 training iterations"
      ],
      notes: "# Backpropagation\\n\\nThe chain rule propagates error signals backward through network weights."
    },
    {
      dayNumber: 15,
      title: "PyTorch Basics: Tensors, Computations & Autograd",
      subtasks: [
        "Create PyTorch tensors and explore operations (reshaping, broadcasting, dot products)",
        "Transfer tensors between CPU and CUDA GPU with .to(device)",
        "Compute automatic gradients using tensor.backward() and .grad attribute",
        "Detach tensors from computational graph using .detach() and torch.no_grad()"
      ],
      notes: "# PyTorch Autograd\\n\\nPyTorch dynamically builds directed acyclic computational graphs for reverse-mode differentiation."
    },
    {
      dayNumber: 16,
      title: "Building PyTorch Models: nn.Module, Layers & Optimizers",
      subtasks: [
        "Subclass nn.Module and define __init__ and forward methods",
        "Stack nn.Linear, nn.ReLU, and nn.BatchNorm1d layers",
        "Configure loss criteria (nn.CrossEntropyLoss, nn.MSELoss)",
        "Train model using torch.optim.AdamW optimizer"
      ],
      notes: "# PyTorch Architecture\\n\\n`nn.Module` standardizes layer hierarchy and parameter tracking."
    },
    {
      dayNumber: 17,
      title: "PyTorch Data Loading: Dataset, DataLoader & Batching",
      subtasks: [
        "Create custom PyTorch Dataset subclassing torch.utils.data.Dataset",
        "Batch and shuffle samples using DataLoader with num_workers",
        "Apply data augmentations using torchvision.transforms",
        "Profile data loading throughput to eliminate GPU starvation bottlenecks"
      ],
      notes: "# Data Pipelines\\n\\n`DataLoader` provides multi-process batching, memory pinning, and shuffling."
    },
    {
      dayNumber: 18,
      title: "Neural Network from Scratch Milestone",
      subtasks: [
        "Train Multi-Layer Perceptron on MNIST handwritten digit dataset",
        "Evaluate test set classification accuracy (>97%)",
        "Visualize learned weights in hidden layers",
        "Complete Week 3 Project: Deep Neural Network from Scratch with Backpropagation"
      ],
      notes: "# Deep Learning Milestone Review\\n\\nUnderstanding raw backpropagation demystifies high-level PyTorch abstractions."
    },
    {
      dayNumber: 19,
      title: "Convolutional Neural Networks (CNN): Convolutions & Pooling",
      subtasks: [
        "Explain 2D convolution kernel, stride, and padding operations",
        "Apply Max Pooling (nn.MaxPool2d) for spatial downsampling and translation invariance",
        "Build a CNN architecture (Conv2D -> ReLU -> MaxPool -> Dense)",
        "Calculate spatial feature map dimensions across layers"
      ],
      notes: "# Convolutional Networks\\n\\nCNNs exploit spatial locality and weight sharing for computer vision."
    },
    {
      dayNumber: 20,
      title: "Deep CNNs & Transfer Learning: ResNet & Pretrained Models",
      subtasks: [
        "Explain residual skip connections (ResNet) to prevent vanishing gradients",
        "Load pretrained ResNet-18 model from torchvision.models",
        "Freeze backbone weights and replace final classification head",
        "Fine-tune model on custom image dataset"
      ],
      notes: "# Transfer Learning\\n\\nFine-tuning pretrained features drastically reduces training time and data requirements."
    },
    {
      dayNumber: 21,
      title: "Regularization in Deep Learning: Dropout, Weight Decay & Early Stopping",
      subtasks: [
        "Add nn.Dropout layers to reduce co-adaptation of features",
        "Configure L2 weight decay in optimizer",
        "Implement early stopping to halt training when validation loss stops improving",
        "Save model checkpoints with torch.save()"
      ],
      notes: "# Deep Regularization\\n\\nDropout, weight decay, and early stopping prevent overfitting in complex networks."
    },
    {
      dayNumber: 22,
      title: "Model Evaluation & Error Analysis in Deep Learning",
      subtasks: [
        "Inspect high-loss failure cases and misclassified examples",
        "Plot training vs validation loss and accuracy curves",
        "Export confusion matrix and per-class precision metrics",
        "Quantize model weights to FP16 / INT8 for faster inference"
      ],
      notes: "# Diagnostics & Quantization\\n\\nError analysis uncovers systematic data labeling and distribution drift issues."
    },
    {
      dayNumber: 23,
      title: "Inference Deployment: TorchScript, ONNX & FastAPI",
      subtasks: [
        "Export PyTorch model to ONNX format",
        "Build a lightweight REST inference API with FastAPI",
        "Validate input payloads using Pydantic schemas",
        "Benchmark inference latency in milliseconds per request"
      ],
      notes: "# Model Serving\\n\\nExporting to ONNX enables optimized hardware inference outside Python runtimes."
    },
    {
      dayNumber: 24,
      title: "Machine Learning Capstone: Production Delivery",
      subtasks: [
        "Deploy trained vision model into containerized cloud service",
        "Test end-to-end image upload and inference response",
        "Export complete study deck and project documentation",
        "Complete Week 4 Capstone: PyTorch Image Classifier & REST Inference Microservice"
      ],
      notes: "# AI Mastery\\n\\nCongratulations! You have mastered machine learning, neural networks, PyTorch, and model deployment."
    }
  ]
});

// 7. OPERATING SYSTEMS & COMPUTER ARCHITECTURE
writeCatalog('operating-systems.ts', {
  id: "operating-systems",
  aliases: ["operating systems", "os", "computer architecture", "systems", "posix", "linux kernel"],
  subject: {
    name: "Operating Systems & Computer Architecture",
    description: "Kernel architecture, process/thread scheduling, virtual memory, paging, filesystems, and POSIX concurrency.",
    color: "#64748B",
    icon: "cpu"
  },
  assignments: [
    {
      title: "Week 1 Project: Interactive Unix Shell in C with Pipelines & Redirection",
      description: "Implement a POSIX shell supporting fork(), execvp(), waitpid(), stdin/stdout redirection (<, >), and pipelines (|).",
      daysDue: 7
    },
    {
      title: "Week 2 Project: Multi-Threaded Round-Robin & Priority CPU Scheduler",
      description: "Build a discrete event simulation of OS scheduling algorithms (FCFS, SJF, Round Robin, Multilevel Feedback Queue) and compute average turnaround and wait times.",
      daysDue: 14
    },
    {
      title: "Week 3 Project: Virtual Memory Paging Simulator with Page Replacement",
      description: "Simulate a 2-level page table, TLB cache, and page replacement policies (FIFO, LRU, Clock) to track page hit rates and page faults.",
      daysDue: 21
    },
    {
      title: "Week 4 Capstone: Micro-Kernel File System & Directory Inode Parser",
      description: "Implement a simplified user-space file system (ext2-style) with superblock, inode tables, bitmap allocation, and file read/write operations.",
      daysDue: 28
    }
  ],
  resources: [
    {
      type: "youtube",
      title: "Operating Systems: Crash Course Computer Science (freeCodeCamp)",
      url: "https://www.youtube.com/watch?v=26QPDBe-NB8",
      providerItemId: "26QPDBe-NB8"
    },
    {
      type: "youtube",
      title: "Operating System Full Course | University Syllabus (Neso Academy)",
      url: "https://www.youtube.com/watch?v=mXw9ruZaxzQ",
      providerItemId: "mXw9ruZaxzQ"
    },
    {
      type: "youtube",
      title: "Operating System Syllabus & CPU Scheduling (Gate Smashers)",
      url: "https://www.youtube.com/watch?v=bkSWJJZNgf8",
      providerItemId: "bkSWJJZNgf8"
    },
    {
      type: "web",
      title: "Operating Systems: Three Easy Pieces (OSTEP - Free Book)",
      url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
      providerItemId: null
    }
  ],
  lectureDecks: [
    {
      title: "Lecture 1: The Kernel Architecture, System Calls & Dual Mode Operation",
      body: `## [SLIDE 1] 🎯 Course Objectives & The Core Mission of an OS
The Operating System is the resource manager that transforms raw hardware (CPU, RAM, Disks) into a secure, virtualized computing environment.

### 🎯 Key Learning Objectives
* Understand Dual-Mode Execution: User Mode (Ring 3) vs Kernel Mode (Ring 0).
* Trace the System Call Traps and Hardware Interrupts.
* Master Monolithic vs Microkernel architectures.

💡 **Professor's Tip:** User code cannot touch hardware directly. Every file access, packet send, and memory allocation is mediated by the Kernel via System Calls!

---

## [SLIDE 2] 🧠 Dual-Mode Execution & System Call Trap
\`\`\`text
User Space (Ring 3 - Restricted)
User Application: read(fd, buf, size)
      │
      ▼ CPU Software Interrupt (e.g. syscall / int 0x80)
Hardware Mode Switch (User Mode ──► Kernel Mode)
      │
Kernel Space (Ring 0 - Privileged)
System Call Dispatch Table ──► sys_read() Handler
      │ Access Device Driver & Hardware Buffers
Hardware Mode Switch (Kernel Mode ──► User Mode)
      │
Return bytes to User Application
\`\`\`

---

## [SLIDE 3] 🏗️ Kernel Architectures Compared
| Architecture | Design Philosophy | Performance | Reliability | Examples |
| :--- | :--- | :--- | :--- | :--- |
| **Monolithic** | All OS services (drivers, FS, scheduler) live in kernel space | High (Direct function calls) | Single driver bug crashes entire kernel | Linux, Unix, Windows NT |
| **Microkernel** | Only IPC, minimal memory, and scheduling in kernel; services run in user space | Lower (IPC context switches) | High (Crashed driver can be restarted) | seL4, QNX, Minix |

---

## [SLIDE 4] 💻 Production Code: Low-Level POSIX System Call
\`\`\`c
#include <unistd.h>
#include <fcntl.h>
#include <stdio.h>

int main(void) {
    // Direct system call bypasses standard library buffers
    int fd = open("log.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd < 0) {
        perror("Failed to open file descriptor");
        return 1;
    }

    const char msg[] = "StudyOS Kernel: Direct write() syscall executed!\\n";
    ssize_t bytes_written = write(fd, msg, sizeof(msg) - 1);
    
    close(fd);
    printf("Wrote %zd bytes to disk via kernel trap.\\n", bytes_written);
    return 0;
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Context Switch Overhead:** Switching between User Mode and Kernel Mode requires saving CPU registers, flushing pipeline buffers, and altering memory mapping, incurring real performance costs.
2. **Ignoring System Call Return Codes:** System calls return \`-1\` on failure and set the global \`errno\`. Never assume a syscall succeeded without checking its return value!

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What prevents a malicious user program from directly overwriting the operating system kernel memory?
  * *Answer:* CPU hardware memory protection (Page Tables with Supervisor/User privilege bits) and dual-mode CPU enforcement.
* **Q2:** What happens when an illegal instruction or memory access occurs in user space?
  * *Answer:* The CPU triggers a hardware exception/trap, switching execution to the kernel's fault handler, which typically terminates the offending process with a signal (e.g. SIGSEGV).`
    },
    {
      title: "Lecture 2: Processes, Thread Lifecycle & Inter-Process Communication (IPC)",
      body: `## [SLIDE 1] 🎯 Processes vs Threads
A Process is an executing program with isolated address space, while Threads are lightweight execution paths sharing the process's memory.

### 🎯 Key Learning Objectives
* Understand the Process Control Block (PCB) and state lifecycle.
* Master \`fork()\`, \`execvp()\`, and \`waitpid()\`.
* Contrast Inter-Process Communication (Pipes, Shared Memory) vs Thread Concurrency.

---

## [SLIDE 2] 🧠 The 5-State Process Model
\`\`\`text
         New
          │
          ▼
       Ready ◄───────────────┐
          │                  │
   CPU    ▼ Preemption       │ I/O Completion
 Scheduled│                  │
          ▼                  │
       Running ────────► Blocked / Waiting
          │        I/O Request
          ▼
      Terminated
\`\`\`

---

## [SLIDE 3] 🏗️ Process vs Thread Memory Sharing
| Memory Segment | Separate per Process? | Shared between Threads of same Process? |
| :--- | :--- | :--- |
| **Address Space** | YES | YES |
| **Global Data & Heap**| YES | YES |
| **Open File Descriptors**| YES | YES |
| **Program Counter (PC)** | YES | NO (Each thread has independent PC) |
| **Stack & Registers** | YES | NO (Each thread has independent Stack) |

---

## [SLIDE 4] 💻 Production Code: The Fork-Exec Pipeline
\`\`\`c
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

void execute_external_command(char *cmd, char *args[]) {
    pid_t pid = fork();

    if (pid < 0) {
        perror("Fork failed");
    } else if (pid == 0) {
        // Child Process: Replace memory image with new binary
        execvp(cmd, args);
        perror("Exec failed"); // Reached only if execvp fails
        _exit(1);
    } else {
        // Parent Process: Await child termination
        int status;
        waitpid(pid, &status, 0);
        if (WIFEXITED(status)) {
            printf("Child process terminated with exit code: %d\\n", WEXITSTATUS(status));
        }
    }
}
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Zombie Processes:** A child process that terminates becomes a "Zombie" until its parent calls \`wait()\` or \`waitpid()\` to reap its exit status!
2. **Orphan Processes:** If a parent terminates before its child, the child becomes an "Orphan" and is automatically adopted by the \`init\` / \`systemd\` process (PID 1).

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What does \`fork()\` return to the parent process versus the child process?
  * *Answer:* Returns the Child's PID (positive integer) to the parent, and returns 0 to the child process.
* **Q2:** Why are threads called "lightweight processes"?
  * *Answer:* Because creating a thread does not allocate a new virtual memory address space, page table, or file table; it shares memory with other threads in the process.`
    },
    {
      title: "Lecture 3: CPU Scheduling Algorithms: FCFS, Round-Robin & Multilevel Queues",
      body: `## [SLIDE 1] 🎯 CPU Scheduling & Fairness
The CPU scheduler decides which Ready process gets the CPU core next, balancing throughput, latency, and fairness.

### 🎯 Key Learning Objectives
* Understand Preemptive vs Non-Preemptive scheduling.
* Master Classic Algorithms: FCFS, Shortest Job First (SJF), and Round-Robin.
* Compute Turnaround Time, Waiting Time, and Response Time.

---

## [SLIDE 2] 🧠 Round-Robin Scheduling with Time Quantum (q)
\`\`\`text
Processes: P1 (Burst 8), P2 (Burst 4), P3 (Burst 2). Quantum q = 3.

Gantt Chart:
[ P1 (3) ][ P2 (3) ][ P3 (2) ][ P1 (3) ][ P2 (1) ][ P1 (2) ]
0        3          6         8         11        12        14
\`\`\`
* If Quantum is too large: Degrades to FCFS.
* If Quantum is too small: Context-switch overhead dominates execution!

---

## [SLIDE 3] 🏗️ Scheduling Performance Metrics
* **Turnaround Time ($T_{\\text{tat}}$):** Completion Time - Arrival Time
* **Waiting Time ($T_{\\text{wait}}$):** Turnaround Time - Burst Time
* **Response Time ($T_{\\text{resp}}$):** First Execution Time - Arrival Time

---

## [SLIDE 4] 💻 Production Code: Round-Robin Simulation
\`\`\`python
def calculate_round_robin_metrics(processes: list[dict], quantum: int) -> dict:
    # processes: [{"id": "P1", "burst": 8}, ...]
    time = 0
    queue = [p.copy() for p in processes]
    completion_times = {}
    
    while queue:
        curr = queue.pop(0)
        exec_time = min(curr["burst"], quantum)
        curr["burst"] -= exec_time
        time += exec_time
        
        if curr["burst"] > 0:
            queue.append(curr)
        else:
            completion_times[curr["id"]] = time
            
    return completion_times
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Convoy Effect in FCFS:** A single long CPU-bound process running ahead of short I/O-bound processes creates severe queue delays (the Convoy Effect).
2. **Starvation in Priority / Shortest Job First:** Continuous arrivals of short jobs can permanently starve long jobs. Use **Aging** (gradually increasing process priority over wait time) to prevent starvation.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** Which scheduling algorithm is provably optimal for minimizing average waiting time?
  * *Answer:* Shortest Job First (SJF) / Shortest Remaining Time First (SRTF).
* **Q2:** What technique prevents indefinite starvation in priority scheduling?
  * *Answer:* Aging (gradually increasing the priority of processes that wait in the system for a long time).`
    },
    {
      title: "Lecture 4: Virtual Memory, Paging, Page Tables & TLB Architecture",
      body: `## [SLIDE 1] 🎯 Virtual Memory & Memory Virtualization
Virtual memory provides each process with the illusion of a vast, contiguous address space while mapping physical frames dynamically across RAM.

### 🎯 Key Learning Objectives
* Understand Virtual Addresses vs Physical Addresses.
* Master Page Tables, Page Offsets, and Multi-Level Paging.
* Master Translation Lookaside Buffer (TLB) caching and Page Faults.

---

## [SLIDE 2] 🧠 Virtual Address to Physical Address Translation
\`\`\`text
32-bit Virtual Address:
[ Virtual Page Number (20 bits) | Offset (12 bits) ]
                 │                          │
                 ▼ (Page Table Lookup)      │
       Physical Frame Number (20 bits)      │
                 │                          │
                 ▼                          ▼
32-bit Physical Address: [ Frame Number (20 bits) | Offset (12 bits) ]
\`\`\`
Offset (12 bits) defines a standard 4 KB page size ($2^{12} = 4096$ bytes).

---

## [SLIDE 3] 🏗️ TLB (Translation Lookaside Buffer) Flow
\`\`\`text
Virtual Address ──► Check Hardware TLB Cache
                         ├──► TLB HIT (Fast ~1 CPU cycle!) ──► Physical Address
                         └──► TLB MISS (Slow memory walk!)
                                    ├──► Walk Multi-level Page Table
                                    └──► Update TLB Cache
\`\`\`

---

## [SLIDE 4] 💻 Production Code: Page Table Simulation
\`\`\`python
class SimpleMMU:
    PAGE_SIZE = 4096  # 4 KB

    def __init__(self):
        self.page_table = {}  # VPN -> PFN

    def map_page(self, vpn: int, pfn: int):
        self.page_table[vpn] = pfn

    def translate(self, virtual_address: int) -> int:
        vpn = virtual_address // self.PAGE_SIZE
        offset = virtual_address % self.PAGE_SIZE
        
        if vpn not in self.page_table:
            raise RuntimeError(f"Page Fault! VPN {vpn} not mapped in physical RAM.")
            
        pfn = self.page_table[vpn]
        physical_address = (pfn * self.PAGE_SIZE) + offset
        return physical_address
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Thrashing:** When processes do not have enough physical memory frames to hold their working sets, the OS spends more time swapping pages in/out of disk than executing instructions!
2. **Belady's Anomaly:** In FIFO page replacement, increasing physical page frames can sometimes INCREASE the number of page faults! (LRU and optimal replacement are immune to Belady's anomaly).

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is a Page Fault?
  * *Answer:* A hardware interrupt triggered by the MMU when a program accesses a virtual page whose valid bit is 0 (not currently present in physical RAM), causing the OS to fetch it from disk.
* **Q2:** Why do modern 64-bit operating systems use Multi-Level Page Tables instead of a single flat table?
  * *Answer:* A single flat page table for a 64-bit space would consume terabytes of RAM; multi-level tables allocate memory only for address regions that are actually in use.`
    }
  ],
  dailyLessons: [
    {
      dayNumber: 1,
      title: "OS Architecture: Hardware Rings, Dual-Mode & Traps",
      subtasks: [
        "Explain Kernel Mode (Ring 0) vs User Mode (Ring 3) security boundaries",
        "Trace CPU hardware interrupt mechanism and interrupt vector tables",
        "Differentiate between hardware interrupts, software traps, and CPU exceptions",
        "Inspect Linux kernel version and modules using uname -r and lsmod"
      ],
      notes: "# Dual-Mode Execution\\n\\nHardware protection rings isolate privileged kernel operations from user applications."
    },
    {
      dayNumber: 2,
      title: "POSIX System Calls: File Descriptors, open(), read(), write()",
      subtasks: [
        "Open, read, and write files using raw POSIX system calls",
        "Trace system calls using strace ./my_program in Linux",
        "Inspect standard streams: stdin (0), stdout (1), stderr (2)",
        "Handle partial writes and EINTR interrupted syscalls"
      ],
      notes: "# Low-Level System Calls\\n\\nPOSIX system calls provide the primitive API interface between applications and the kernel."
    },
    {
      dayNumber: 3,
      title: "Process Creation: fork(), exec(), wait() & Process Trees",
      subtasks: [
        "Create child processes using fork() and inspect returned PIDs",
        "Replace address space images using execvp()",
        "Harvest child exit status codes with waitpid()",
        "View process tree hierarchy in terminal with pstree"
      ],
      notes: "# Process Lifecycle\\n\\n`fork()` clones the address space; `exec()` replaces the memory image with a new binary."
    },
    {
      dayNumber: 4,
      title: "Process Control: Signals, kill, sigaction & Signal Handlers",
      subtasks: [
        "Register signal handlers using sigaction() for SIGINT and SIGTERM",
        "Send signals between processes using kill() system call",
        "Explain why SIGKILL (9) and SIGSTOP cannot be caught or ignored",
        "Handle zombie process reaping asynchronously using SIGCHLD handler"
      ],
      notes: "# POSIX Signals\\n\\nSignals deliver asynchronous software notifications to processes."
    },
    {
      dayNumber: 5,
      title: "Inter-Process Communication: Pipes & File Redirection",
      subtasks: [
        "Create unidirectional byte streams between processes with pipe()",
        "Redirect stdout using dup2(pipe_fd, STDOUT_FILENO)",
        "Chain two processes together to implement command pipelines: cat | grep",
        "Close unused pipe descriptors to prevent deadlock on read"
      ],
      notes: "# Anonymous Pipes\\n\\nPipes buffer byte streams between cooperating processes via kernel memory."
    },
    {
      dayNumber: 6,
      title: "Unix Shell Milestone",
      subtasks: [
        "Implement command parsing and tokenization loop",
        "Support pipeline execution (|) and output redirection (>)",
        "Implement built-in commands (cd, exit)",
        "Complete Week 1 Project: Interactive Unix Shell in C with Pipelines"
      ],
      notes: "# Shell Project Review\\n\\nBuilding a shell provides deep, permanent intuition for processes, file descriptors, and IPC."
    },
    {
      dayNumber: 7,
      title: "CPU Scheduling: First-Come First-Served & Shortest Job First",
      subtasks: [
        "Calculate turnaround time and waiting time for FCFS schedules",
        "Demonstrate the Convoy Effect mathematically",
        "Implement Shortest Job First (SJF) and prove its optimality",
        "Analyze starvation risks on continuous arrivals of short jobs"
      ],
      notes: "# Non-Preemptive Scheduling\\n\\nSJF minimizes average waiting time but requires prior knowledge of burst durations."
    },
    {
      dayNumber: 8,
      title: "Preemptive Scheduling: Round Robin & Multilevel Feedback Queues",
      subtasks: [
        "Simulate Round-Robin execution with variable time quantums",
        "Evaluate trade-offs between context switch overhead and response time",
        "Design Multilevel Feedback Queue (MLFQ) with dynamic priority decay",
        "Observe interactive vs batch process prioritization"
      ],
      notes: "# Preemptive CPU Scheduling\\n\\nRound-Robin guarantees bounded response times across all ready processes."
    },
    {
      dayNumber: 9,
      title: "Process Synchronization: Critical Sections & Race Conditions",
      subtasks: [
        "Demonstrate race conditions on shared counters in multi-threaded C",
        "Define 3 requirements for critical sections: Mutual Exclusion, Progress, Bounded Waiting",
        "Implement Peterson's algorithm for two processes",
        "Analyze hardware atomic instructions (Test-and-Set, Compare-and-Swap)"
      ],
      notes: "# Critical Section Problem\\n\\nSynchronization guarantees race-free mutations across concurrent execution paths."
    },
    {
      dayNumber: 10,
      title: "Synchronization Primitives: Mutexes, Semaphores & Condition Variables",
      subtasks: [
        "Protect critical sections using pthread_mutex_lock and unlock",
        "Implement counting semaphore with sem_wait and sem_post",
        "Coordinate producer-consumer buffer with condition variables",
        "Prevent busy waiting using sleeping synchronization locks"
      ],
      notes: "# Mutexes & Semaphores\\n\\nSemaphores manage shared resource pools; mutexes provide mutual exclusion."
    },
    {
      dayNumber: 11,
      title: "Deadlocks: 4 Coffman Conditions & Prevention Strategies",
      subtasks: [
        "Identify 4 Coffman conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait",
        "Construct Resource Allocation Graphs (RAG) and detect cycles",
        "Simulate Banker's Algorithm for deadlock avoidance",
        "Implement lock ordering to eliminate circular wait deadlocks"
      ],
      notes: "# Deadlocks\\n\\nEliminating circular wait via strict hierarchical lock ordering prevents deadlocks."
    },
    {
      dayNumber: 12,
      title: "CPU Scheduler Simulation Milestone",
      subtasks: [
        "Build discrete event scheduler supporting FCFS, Round-Robin, and Priority",
        "Compute and display comparative performance metrics",
        "Plot Gantt chart visualizations of CPU execution intervals",
        "Complete Week 2 Project: Multi-Threaded Round-Robin & Priority CPU Scheduler"
      ],
      notes: "# Scheduling Review\\n\\nSimulating schedulers reinforces trade-offs between throughput, fairness, and latency."
    },
    {
      dayNumber: 13,
      title: "Memory Management: Contiguous Allocation & Fragmentation",
      subtasks: [
        "Differentiate internal fragmentation vs external fragmentation",
        "Simulate memory placement algorithms: First Fit, Best Fit, Worst Fit",
        "Explain memory compaction costs and address translation limits",
        "Analyze hardware Memory Management Unit (MMU) base and limit registers"
      ],
      notes: "# Contiguous Allocation\\n\\nExternal fragmentation occurs when free memory is fragmented into non-contiguous slices."
    },
    {
      dayNumber: 14,
      title: "Paging & Multi-Level Page Tables",
      subtasks: [
        "Divide virtual memory into pages and physical RAM into frames",
        "Calculate Virtual Page Number (VPN) and Offset from 32-bit and 64-bit addresses",
        "Construct 2-level page table structure in C",
        "Compute memory space savings of sparse multi-level page tables"
      ],
      notes: "# Paging Mechanics\\n\\nPaging eliminates external fragmentation by mapping uniform fixed-size memory blocks."
    },
    {
      dayNumber: 15,
      title: "TLB Hardware & Translation Performance",
      subtasks: [
        "Trace TLB lookup and calculate Effective Memory Access Time (EMAT)",
        "Simulate TLB misses and page table memory walks",
        "Explain TLB invalidation on process context switches",
        "Measure TLB reach with Huge Pages (2 MB / 1 GB pages)"
      ],
      notes: "# The TLB Cache\\n\\nTLB caches virtual-to-physical address mappings for single-cycle memory translations."
    },
    {
      dayNumber: 16,
      title: "Page Replacement Algorithms: FIFO, LRU & Clock Algorithm",
      subtasks: [
        "Simulate FIFO page replacement and observe Belady's Anomaly",
        "Implement Least Recently Used (LRU) page replacement using hash map and linked list",
        "Implement Second-Chance / Clock page replacement using reference bits",
        "Compare page fault rates across algorithms on realistic memory traces"
      ],
      notes: "# Page Replacement\\n\\nThe Clock algorithm approximates LRU with minimal hardware reference bit overhead."
    },
    {
      dayNumber: 17,
      title: "Virtual Memory Paging Simulator Milestone",
      subtasks: [
        "Implement MMU simulation reading memory trace files",
        "Track page hits, page faults, and TLB hit ratios",
        "Export comparative benchmark report across replacement algorithms",
        "Complete Week 3 Project: Virtual Memory Paging Simulator"
      ],
      notes: "# Paging Milestone Review\\n\\nVirtual memory is the cornerstone of modern multitasking operating systems."
    },
    {
      dayNumber: 18,
      title: "File Systems: Inodes, Superblocks & Directory Structures",
      subtasks: [
        "Inspect inode metadata using stat and ls -i on Linux",
        "Understand direct, indirect, doubly-indirect, and triply-indirect block pointers",
        "Compare hard links (link) vs symbolic/soft links (symlink)",
        "Examine superblock backup redundancy in ext4 filesystems"
      ],
      notes: "# Inode Architecture\\n\\nInodes store file metadata and data block pointers independently of filenames."
    },
    {
      dayNumber: 19,
      title: "File Allocation & Free Space Management",
      subtasks: [
        "Compare contiguous, linked-list, and indexed file allocation",
        "Manage free disk blocks using Bitmaps and Free Space Lists",
        "Calculate maximum addressable file sizes under 32-bit block pointers",
        "Analyze journaled file systems (ext4, NTFS) for crash recovery"
      ],
      notes: "# Disk Allocation\\n\\nJournaling logs filesystem metadata changes before writing to disk, preventing corruption on sudden crashes."
    },
    {
      dayNumber: 20,
      title: "I/O Hardware & Disk Scheduling",
      subtasks: [
        "Understand Polling vs Interrupt-Driven I/O vs Direct Memory Access (DMA)",
        "Trace DMA transfer cycles between disk controller and RAM",
        "Simulate disk scheduling algorithms: FCFS, SSTF, SCAN (Elevator), C-SCAN",
        "Calculate total disk head movement"
      ],
      notes: "# I/O Architecture\\n\\nDMA transfers data blocks directly between devices and memory without CPU intervention."
    },
    {
      dayNumber: 21,
      title: "Virtual File System (VFS) & Device Drivers",
      subtasks: [
        "Explore Linux VFS abstraction layer (dentry, inode, file, superblock structs)",
        "Differentiate block devices (/dev/sda) vs character devices (/dev/tty, /dev/urandom)",
        "Write a basic Linux kernel loadable module (LKM) template",
        "Read kernel log ring buffer using dmesg"
      ],
      notes: "# The Virtual File System (VFS)\\n\\nVFS provides a unified POSIX interface over diverse underlying filesystems."
    },
    {
      dayNumber: 22,
      title: "Operating System Security: Access Control & Capabilities",
      subtasks: [
        "Examine Unix file permission bits (rwxrwxrwx, setuid, setgid)",
        "Audit setuid binaries and understand privilege escalation risks",
        "Explore Linux capabilities (cap_net_bind_service) vs root user",
        "Understand sandboxing mechanisms: chroot, namespaces, and cgroups"
      ],
      notes: "# OS Security\\n\\nLinux namespaces and cgroups form the kernel foundation of modern container engines (Docker)."
    },
    {
      dayNumber: 23,
      title: "Containers, Namespaces & Cgroups (OS Virtualization)",
      subtasks: [
        "Create an isolated process tree using unshare --pid --fork",
        "Constrain memory and CPU quotas using Linux cgroups v2",
        "Mount an isolated root filesystem using pivot_root",
        "Build a container from scratch using bash and kernel primitives"
      ],
      notes: "# Container Virtualization\\n\\nContainers are regular Linux processes isolated via kernel namespaces and constrained by cgroups."
    },
    {
      dayNumber: 24,
      title: "Operating Systems Capstone: Micro-Kernel File System",
      subtasks: [
        "Implement user-space virtual file system with superblock and inodes",
        "Support file creation, directory traversal, reading, and writing",
        "Verify clean memory management and zero memory leaks with Valgrind",
        "Complete Week 4 Capstone: Micro-Kernel File System & Directory Inode Parser"
      ],
      notes: "# Systems Mastery\\n\\nCongratulations! You have mastered OS kernel architecture, scheduling, virtual memory, and filesystems."
    }
  ]
});

// 8. SQL & RELATIONAL DATABASE ENGINEERING
writeCatalog('database-sql.ts', {
  id: "database-sql",
  aliases: ["sql", "database", "postgres", "postgresql", "rdbms", "mysql", "relational database"],
  subject: {
    name: "SQL & Relational Database Engineering",
    description: "Relational modeling, complex queries, window functions, indexing (B-Trees), query planning, ACID transactions, and normalization.",
    color: "#0284C7",
    icon: "database"
  },
  assignments: [
    {
      title: "Week 1 Project: Normalized E-Commerce Schema (3NF) & DDL Scripting",
      description: "Design and implement a fully normalized 3NF relational database schema in PostgreSQL with foreign keys, checks, enums, and timestamps.",
      daysDue: 7
    },
    {
      title: "Week 2 Project: Analytical Reporting Engine with Window Functions & CTEs",
      description: "Construct advanced analytical reporting queries using Common Table Expressions (CTEs), ROW_NUMBER(), RANK(), DENSE_RANK(), and running totals.",
      daysDue: 14
    },
    {
      title: "Week 3 Project: Query Optimization & B-Tree Index Performance Tuning",
      description: "Analyze slow queries on a 1-million-row dataset using EXPLAIN ANALYZE; eliminate sequential table scans using composite B-Tree indexes.",
      daysDue: 21
    },
    {
      title: "Week 4 Capstone: ACID Concurrent Banking Ledger with Row-Level Locking",
      description: "Implement a fault-tolerant banking transaction engine with isolation levels (Read Committed vs Serializable) and SELECT FOR UPDATE locking.",
      daysDue: 28
    }
  ],
  resources: [
    {
      type: "youtube",
      title: "SQL Tutorial - Full Database Course for Beginners (freeCodeCamp)",
      url: "https://www.youtube.com/watch?v=HXV3zeQKqGY",
      providerItemId: "HXV3zeQKqGY"
    },
    {
      type: "youtube",
      title: "SQL Course for Beginners [Full Course] (Programming with Mosh)",
      url: "https://www.youtube.com/watch?v=7S_tz1z_5bA",
      providerItemId: "7S_tz1z_5bA"
    },
    {
      type: "web",
      title: "PostgreSQL Official Documentation & Manual",
      url: "https://www.postgresql.org/docs/current/",
      providerItemId: null
    },
    {
      type: "web",
      title: "Use The Index, Luke! - Guide to Database Performance for Developers",
      url: "https://use-the-index-luke.com/",
      providerItemId: null
    }
  ],
  lectureDecks: [
    {
      title: "Lecture 1: The Relational Model, PostgreSQL & Query Execution Pipeline",
      body: `## [SLIDE 1] 🎯 Course Objectives & The Relational Engine
Relational databases remain the backbone of the global digital economy, storing critical financial transactions, inventory, and identity records with mathematical integrity.

### 🎯 Key Learning Objectives
* Understand Codd's Relational Algebra: Relations, Tuples, and Attributes.
* Trace the PostgreSQL Query Execution Pipeline: Parser $\\to$ Planner $\\to$ Executor.
* Master DDL vs DML commands and strict schema constraints.

💡 **Professor's Tip:** SQL is a **declarative** language—you describe *what* data you want; the database query optimizer figures out *how* to retrieve it efficiently!

---

## [SLIDE 2] 🧠 PostgreSQL Query Execution Pipeline
\`\`\`text
SQL Query: SELECT * FROM users WHERE status = 'active'
      │
      ▼ 1. Parser & Lexer
Abstract Syntax Tree (AST) & Parse Tree
      │
      ▼ 2. Query Rewriter
Applies views, rules, and security constraints
      │
      ▼ 3. Query Planner / Cost-Based Optimizer
Evaluates index scans, sequential scans, hash joins, and calculates cost (disk I/O + CPU)
      │
      ▼ 4. Execution Engine
Fetches blocks from Buffer Pool (Shared Memory) or Storage Engine
      │
Returns Rows to Client
\`\`\`

---

## [SLIDE 3] 🏗️ Relational Integrity Constraints
| Constraint | Purpose | Example |
| :--- | :--- | :--- |
| **PRIMARY KEY** | Uniquely identifies each row; enforces NOT NULL and UNIQUE | \`id UUID PRIMARY KEY\` |
| **FOREIGN KEY** | Guarantees referential integrity across related tables | \`user_id UUID REFERENCES users(id)\` |
| **CHECK** | Restricts column values to boolean predicates | \`CHECK (price >= 0)\` |
| **UNIQUE** | Prevents duplicate column values | \`email VARCHAR(255) UNIQUE\` |

---

## [SLIDE 4] 💻 Production Code: High-Integrity Table Schema
\`\`\`sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(16) NOT NULL UNIQUE,
    title VARCHAR(120) NOT NULL,
    credits INTEGER NOT NULL CHECK (credits BETWEEN 1 AND 6),
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    grade NUMERIC(3, 2) CHECK (grade BETWEEN 0.00 AND 4.00),
    CONSTRAINT unique_student_course UNIQUE (student_id, course_id)
);
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **NULL Comparison with \`=\`:** In SQL, \`NULL = NULL\` evaluates to \`UNKNOWN\`, NOT \`TRUE\`! Always use \`IS NULL\` and \`IS NOT NULL\`.
2. **Missing Foreign Key Indexes:** PostgreSQL does NOT automatically create indexes on foreign key columns! Without an index on \`enrollments(student_id)\`, querying student enrollments or deleting users triggers a full table scan.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the difference between \`WHERE\` and \`HAVING\` in SQL?
  * *Answer:* \`WHERE\` filters individual rows before grouping; \`HAVING\` filters aggregated groups after the \`GROUP BY\` operation.
* **Q2:** What does \`ON DELETE CASCADE\` do on a foreign key?
  * *Answer:* Automatically deletes all referencing child rows when the parent referenced row is deleted.`
    },
    {
      title: "Lecture 2: Advanced Joins, Set Operations & Aggregations",
      body: `## [SLIDE 1] 🎯 Combining Relations & Aggregating Data
Relational databases shine when querying multiple interconnected tables through deterministic relational joins.

### 🎯 Key Learning Objectives
* Master Join Semantics: INNER, LEFT, RIGHT, FULL OUTER, and CROSS joins.
* Execute Aggregations with \`GROUP BY\` and \`HAVING\`.
* Understand Set Operations: \`UNION\`, \`INTERSECT\`, and \`EXCEPT\`.

---

## [SLIDE 2] 🧠 Relational Join Venn Diagrams
\`\`\`text
  Table A         Table B
 ╭───────╮       ╭───────╮
 │       │ ╭───╮ │       │
 │ A only│ │A∩B│ │ B only│
 │       │ ╰───╯ │       │
 ╰───────╯       ╰───────╯
* INNER JOIN: Returns only intersection (A ∩ B)
* LEFT JOIN:  Returns entire Table A + matched B (A only + A ∩ B)
* FULL JOIN:  Returns all records from both tables (A ∪ B)
\`\`\`

---

## [SLIDE 3] 🏗️ Join Algorithms Inside the Engine
| Join Engine | When the Planner Uses It | Complexity |
| :--- | :--- | :--- |
| **Nested Loop Join** | One small table and an index on the other table | $O(N \\log M)$ |
| **Hash Join** | Large equality joins without indexes | $O(N + M)$ |
| **Merge Join** | Both tables are already sorted on join keys | $O(N + M)$ |

---

## [SLIDE 4] 💻 Production Code: Aggregated Multi-Table Query
\`\`\`sql
SELECT 
    c.title AS course_title,
    c.code,
    COUNT(e.id) AS total_enrolled,
    ROUND(AVG(e.grade), 2) AS average_grade,
    MAX(e.grade) AS highest_grade
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
WHERE c.status = 'active'
GROUP BY c.id, c.title, c.code
HAVING COUNT(e.id) >= 5
ORDER BY average_grade DESC;
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Filtering in \`WHERE\` on a LEFT JOIN:** Placing a filter condition on the right table in the \`WHERE\` clause (\`WHERE b.status = 'active'\`) accidentally converts the LEFT JOIN into an INNER JOIN, because NULL rows are discarded! Move conditions on the right table into the \`ON\` clause.
2. **\`UNION\` vs \`UNION ALL\`:** \`UNION\` performs an expensive sort to deduplicate rows across queries; \`UNION ALL\` concatenates results directly without sorting overhead.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** When should you use \`UNION ALL\` instead of \`UNION\`?
  * *Answer:* When duplicate rows are acceptable or impossible, because \`UNION ALL\` avoids the CPU and memory cost of deduplication sorting.
* **Q2:** What happens when an aggregate function like \`AVG(score)\` encounters \`NULL\` values in a column?
  * *Answer:* Aggregate functions automatically ignore \`NULL\` values when calculating totals and averages (unlike \`COUNT(*)\` which counts all rows).`
    },
    {
      title: "Lecture 3: Window Functions & Common Table Expressions (CTEs)",
      body: `## [SLIDE 1] 🎯 Analytical Power with Window Functions
Window functions perform calculations across a set of table rows that are related to the current row, without collapsing rows like \`GROUP BY\` does!

### 🎯 Key Learning Objectives
* Understand the \`OVER (PARTITION BY ... ORDER BY ...)\` clause.
* Master Ranking Functions: \`ROW_NUMBER()\`, \`RANK()\`, and \`DENSE_RANK()\`.
* Compute Running Totals, Moving Averages, and Lag/Lead temporal trends.
* Structure complex analytical queries using Common Table Expressions (CTEs).

---

## [SLIDE 2] 🧠 Window Function Processing Pipeline
\`\`\`text
Row 1: [ Engineering | Alice | \$120k ] ──► Rank: 1  (Within Engineering partition)
Row 2: [ Engineering | Bob   | \$110k ] ──► Rank: 2
Row 3: [ Marketing   | Carol | \$95k  ] ──► Rank: 1  (Within Marketing partition)
\`\`\`
Every original row is preserved; analytical metrics are appended as new columns!

---

## [SLIDE 3] 🏗️ Ranking Functions Compared
| Function | Ties Behavior | Example Sequence |
| :--- | :--- | :--- |
| **\`ROW_NUMBER()\`** | Strict unique sequential integers | 1, 2, 3, 4 |
| **\`RANK()\`** | Leaves gaps after ties | 1, 2, 2, 4 |
| **\`DENSE_RANK()\`** | Never leaves gaps after ties | 1, 2, 2, 3 |

---

## [SLIDE 4] 💻 Production Code: Top Students Per Course with CTE
\`\`\`sql
WITH RankedStudentGrades AS (
    SELECT 
        e.course_id,
        u.name AS student_name,
        e.grade,
        ROW_NUMBER() OVER(
            PARTITION BY e.course_id 
            ORDER BY e.grade DESC, e.enrolled_at ASC
        ) AS class_rank
    FROM enrollments e
    JOIN users u ON e.student_id = u.id
    WHERE e.grade IS NOT NULL
)
SELECT 
    course_id,
    class_rank,
    student_name,
    grade
FROM RankedStudentGrades
WHERE class_rank <= 3
ORDER BY course_id, class_rank;
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Using Window Functions in \`WHERE\` Clauses:** Window functions execute AFTER the \`WHERE\` and \`HAVING\` clauses! You cannot write \`WHERE ROW_NUMBER() = 1\`. You MUST wrap the query in a CTE or subquery first!
2. **Default Window Frame:** In \`OVER (ORDER BY date)\`, the default frame is \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`, which computes a cumulative running sum rather than the total partition sum.

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What is the fundamental difference between \`GROUP BY\` and a window function?
  * *Answer:* \`GROUP BY\` collapses multiple rows into a single summary row; window functions compute values across partitions while preserving all original rows.
* **Q2:** What does \`LAG(salary, 1) OVER (ORDER BY year)\` do?
  * *Answer:* Accesses the \`salary\` value from the immediately preceding row in the partition.`
    },
    {
      title: "Lecture 4: Database Internals: B-Tree Indexes, EXPLAIN ANALYZE & ACID",
      body: `## [SLIDE 1] 🎯 Performance Engineering & Index Internals
Without indexes, finding a record requires scanning every disk page in the table ($O(N)$ Sequential Scan). Indexes provide $O(\\log N)$ balanced search trees.

### 🎯 Key Learning Objectives
* Understand B-Tree Index architecture: Root, Internal nodes, and Leaf pages.
* Decipher query plans using \`EXPLAIN (ANALYZE, BUFFERS)\`.
* Master ACID Guarantees: Atomicity, Consistency, Isolation, and Durability.
* Mitigate Concurrency Anomalies: Dirty Reads, Non-Repeatable Reads, and Phantom Reads.

---

## [SLIDE 2] 🧠 B-Tree Index Hierarchy
\`\`\`text
                      [ Root Node: 50 | 100 ]
                     /           |           \\
    [ Internal: 20 | 35 ]  [ Internal: 70 ]  [ Internal: 120 | 150 ]
        /      |      \\
   [ Leaf Page: 1, 5, 20 ] ──► Points to physical disk Heap Tuple ID (ctid)!
\`\`\`
Traversing a 10-million-row B-tree takes only 3 to 4 page reads!

---

## [SLIDE 3] 🏗️ ACID Transaction Properties
* **Atomicity:** All operations succeed, or all roll back (All-or-Nothing).
* **Consistency:** Data must satisfy all schema constraints before and after commit.
* **Isolation:** Concurrent transactions cannot see uncommitted changes.
* **Durability:** Committed transactions survive sudden power loss via Write-Ahead Logging (WAL).

---

## [SLIDE 4] 💻 Production Code: Safe Atomic Transfer with Row Locking
\`\`\`sql
BEGIN;

-- Lock specific rows to prevent concurrent balance overdrafts
SELECT balance FROM bank_accounts WHERE id = 'acc_101' FOR UPDATE;

UPDATE bank_accounts SET balance = balance - 500.00 WHERE id = 'acc_101';
UPDATE bank_accounts SET balance = balance + 500.00 WHERE id = 'acc_202';

INSERT INTO transfer_audit_log (sender_id, receiver_id, amount) 
VALUES ('acc_101', 'acc_202', 500.00);

COMMIT;
\`\`\`

---

## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas
1. **Index Ignored Due to Function Wrapping:** Writing \`WHERE LOWER(email) = 'user@example.com'\` ignores standard B-tree indexes on \`email\` because the function alters the search key! You must create a functional index: \`CREATE INDEX ON users(LOWER(email))\`.
2. **Left-to-Right Composite Index Rule:** An index on \`(last_name, first_name)\` accelerates queries on \`last_name\` and \`(last_name, first_name)\`, but CANNOT be used efficiently for queries filtering only by \`first_name\`!

---

## [SLIDE 6] 📝 Quick Self-Assessment Quiz
* **Q1:** What does \`SELECT ... FOR UPDATE\` do?
  * *Answer:* Acquires exclusive row-level locks on the selected rows, blocking other transactions from modifying or locking them until the current transaction completes.
* **Q2:** What does the Write-Ahead Log (WAL) do in PostgreSQL?
  * *Answer:* Records database changes to disk sequentially before data pages are written to tables, ensuring crash recovery and durability.`
    }
  ],
  dailyLessons: [
    {
      dayNumber: 1,
      title: "SQL Foundations: Relational Theory, Tables, DDL & DML",
      subtasks: [
        "Create tables with typed columns (VARCHAR, INTEGER, BOOLEAN, TIMESTAMPTZ)",
        "Enforce PRIMARY KEY, NOT NULL, and DEFAULT constraints",
        "Insert, update, and delete records with standard DML statements",
        "Inspect table structure and schemas using psql \\d commands"
      ],
      notes: "# Relational Foundations\\n\\nRelational tables organize data into structured tuples with strict typing constraints."
    },
    {
      dayNumber: 2,
      title: "Data Integrity: Foreign Keys, Unique & Check Constraints",
      subtasks: [
        "Enforce referential integrity with FOREIGN KEY constraints",
        "Configure ON DELETE CASCADE and ON DELETE RESTRICT cascades",
        "Validate column ranges using CHECK constraints",
        "Enforce business uniqueness using composite UNIQUE constraints"
      ],
      notes: "# Constraints & Integrity\\n\\nConstraints guarantee data validity at the database engine level."
    },
    {
      dayNumber: 3,
      title: "SQL Filtering: WHERE, Operators, LIKE & NULL Semantics",
      subtasks: [
        "Filter records using comparison, logical (AND, OR, NOT), and IN operators",
        "Perform pattern matching using LIKE, ILIKE, and regular expressions (~)",
        "Demonstrate three-valued logic (TRUE, FALSE, UNKNOWN) with NULL",
        "Replace NULL values using COALESCE() and NULLIF()"
      ],
      notes: "# Query Filtering\\n\\nSQL uses three-valued logic; always test for nullability with `IS NULL`."
    },
    {
      dayNumber: 4,
      title: "SQL Joins: INNER, LEFT, RIGHT & FULL OUTER Joins",
      subtasks: [
        "Join tables on foreign key relations with INNER JOIN",
        "Retrieve unmatched parent rows using LEFT OUTER JOIN",
        "Combine all records from both relations with FULL OUTER JOIN",
        "Prevent accidental Cartesian products by asserting explicit join predicates"
      ],
      notes: "# Relational Joins\\n\\nJoins correlate related records across tables using relational algebra."
    },
    {
      dayNumber: 5,
      title: "SQL Aggregations: GROUP BY, HAVING, COUNT, SUM & AVG",
      subtasks: [
        "Aggregate records into groups using GROUP BY",
        "Filter summarized groups using HAVING clauses",
        "Calculate counts (COUNT(*), COUNT(DISTINCT col)) and statistical averages",
        "Explain why columns in SELECT must appear in GROUP BY or aggregate functions"
      ],
      notes: "# Aggregations\\n\\n`GROUP BY` collapses records into summary rows; `HAVING` filters the resulting groups."
    },
    {
      dayNumber: 6,
      title: "Normalized E-Commerce Schema Milestone",
      subtasks: [
        "Design 3NF schema for customers, orders, order_items, and products",
        "Write idempotent migration script with CREATE TABLE IF NOT EXISTS",
        "Populate database with realistic test seed records",
        "Complete Week 1 Project: Normalized E-Commerce Schema & DDL Scripting"
      ],
      notes: "# Schema Design Review\\n\\nThird Normal Form (3NF) eliminates data redundancy and prevents update anomalies."
    },
    {
      dayNumber: 7,
      title: "Subqueries: Scalar, Correlated & Subqueries in FROM/WHERE",
      subtasks: [
        "Write scalar subqueries returning single values in SELECT and WHERE",
        "Construct correlated subqueries that reference outer query aliases",
        "Use EXISTS and NOT EXISTS for efficient existence checks",
        "Compare performance of IN vs EXISTS on nullable columns"
      ],
      notes: "# Subqueries\\n\\nCorrelated subqueries execute once per outer row; `EXISTS` short-circuits on the first match."
    },
    {
      dayNumber: 8,
      title: "Common Table Expressions (CTEs): WITH Clause & Readability",
      subtasks: [
        "Deconstruct complex multi-stage queries into readable CTEs using WITH",
        "Chain multiple CTEs sequentially to transform data in pipelines",
        "Compare CTE materialization behavior in PostgreSQL 12+",
        "Refactor nested subqueries into modular CTE steps"
      ],
      notes: "# Common Table Expressions\\n\\nCTEs improve query readability and modularity."
    },
    {
      dayNumber: 9,
      title: "Recursive CTEs: Hierarchical Trees & Graphs",
      subtasks: [
        "Understand recursive CTE structure: Anchor member UNION ALL Recursive member",
        "Traverse organizational hierarchies (employee $\\to$ manager tree)",
        "Traverse graph paths and bill-of-materials dependencies",
        "Prevent infinite recursion loops with termination conditions"
      ],
      notes: "# Recursive Queries\\n\\nRecursive CTEs traverse arbitrary tree hierarchies and graphs in SQL."
    },
    {
      dayNumber: 10,
      title: "Window Functions: OVER, PARTITION BY & ORDER BY",
      subtasks: [
        "Calculate partition summaries without collapsing rows using OVER(PARTITION BY)",
        "Compute cumulative running totals using ORDER BY inside window specifications",
        "Calculate moving averages across sliding frame boundaries",
        "Compare window function performance vs self-joins"
      ],
      notes: "# Window Specifications\\n\\nWindow functions compute analytical metrics while preserving all individual rows."
    },
    {
      dayNumber: 11,
      title: "Ranking Functions: ROW_NUMBER, RANK, DENSE_RANK & NTILE",
      subtasks: [
        "Deduplicate records by keeping ROW_NUMBER() = 1 in subqueries",
        "Rank sales performance with RANK() and DENSE_RANK()",
        "Partition data into quartiles and deciles using NTILE()",
        "Access adjacent row values with LAG() and LEAD()"
      ],
      notes: "# Analytical Ranking\\n\\n`ROW_NUMBER()` provides strict sequence numbering; `RANK()` leaves gaps after ties."
    },
    {
      dayNumber: 12,
      title: "Analytical Reporting Engine Milestone",
      subtasks: [
        "Generate multi-month cohort retention report",
        "Calculate month-over-month revenue growth using LAG()",
        "Identify top 3 selling products per category using DENSE_RANK()",
        "Complete Week 2 Project: Analytical Reporting Engine with Window Functions"
      ],
      notes: "# Analytics Review\\n\\nWindow functions and CTEs provide SQL-native Business Intelligence analytics."
    },
    {
      dayNumber: 13,
      title: "Database Indexing: B-Tree Indexes & Table Scans",
      subtasks: [
        "Inspect table storage pages and tuples using psql",
        "Create B-Tree index on high-cardinality search columns",
        "Observe query plan transitions from Seq Scan to Index Scan",
        "Calculate index storage disk overhead using pg_size_pretty"
      ],
      notes: "# B-Tree Indexes\\n\\nB-Trees reduce row search complexity from $O(N)$ sequential scans to $O(\\log N)$."
    },
    {
      dayNumber: 14,
      title: "Composite Indexes & Covering Indexes (Index-Only Scans)",
      subtasks: [
        "Create composite index on multiple columns (col_a, col_b)",
        "Verify left-to-right prefix matching rule",
        "Build covering index with INCLUDE clause to achieve Index-Only Scan",
        "Avoid over-indexing write-heavy transactional tables"
      ],
      notes: "# Covering Indexes\\n\\nIndex-Only scans satisfy queries directly from index leaf pages without visiting table heap pages."
    },
    {
      dayNumber: 15,
      title: "Query Optimization: EXPLAIN (ANALYZE, BUFFERS)",
      subtasks: [
        "Read query plans: costs, actual time, loops, and rows returned",
        "Measure disk read hits vs cache hits using BUFFERS option",
        "Identify estimation skew between planner estimates and actual rows",
        "Update database statistics manually using ANALYZE table_name"
      ],
      notes: "# EXPLAIN ANALYZE\\n\\nQuery plans display the cost estimates, join algorithms, and buffer usage."
    },
    {
      dayNumber: 16,
      title: "Partial Indexes, Expression Indexes & Full-Text Search",
      subtasks: [
        "Create partial index filtering active records (WHERE status = 'active')",
        "Create expression index for case-insensitive search (LOWER(email))",
        "Implement full-text search with tsvector and tsquery",
        "Create GIN (Generalized Inverted Index) on JSONB and text columns"
      ],
      notes: "# Specialized Indexes\\n\\nPartial indexes minimize index size by indexing only active or relevant rows."
    },
    {
      dayNumber: 17,
      title: "Query Optimization Milestone",
      subtasks: [
        "Seed 500,000 synthetic records and measure unindexed query latency",
        "Optimize slow query plan from 850ms down to sub-10ms using composite index",
        "Verify elimination of disk-based external sorts with work_mem tuning",
        "Complete Week 3 Project: Query Optimization & B-Tree Index Tuning"
      ],
      notes: "# Performance Review\\n\\nTargeted indexes and query rewriting dramatically improve database throughput."
    },
    {
      dayNumber: 18,
      title: "Transactions & ACID Guarantees: BEGIN, COMMIT, ROLLBACK",
      subtasks: [
        "Execute multi-statement transactions atomically",
        "Roll back transaction state on error with ROLLBACK",
        "Create partial transaction checkpoints using SAVEPOINT",
        "Understand Write-Ahead Logging (WAL) for durability"
      ],
      notes: "# Transactions & ACID\\n\\nTransactions ensure all changes commit together or leave the database completely unaltered."
    },
    {
      dayNumber: 19,
      title: "Transaction Isolation Levels: Read Committed to Serializable",
      subtasks: [
        "Compare Read Committed, Repeatable Read, and Serializable levels",
        "Simulate non-repeatable read anomalies across two concurrent sessions",
        "Simulate phantom read anomalies on range queries",
        "Inspect PostgreSQL Multi-Version Concurrency Control (MVCC) mechanics"
      ],
      notes: "# Isolation Levels\\n\\nPostgreSQL uses MVCC so readers never block writers and writers never block readers."
    },
    {
      dayNumber: 20,
      title: "Concurrency Control: Row-Level Locking & Deadlocks",
      subtasks: [
        "Lock rows explicitly using SELECT ... FOR UPDATE",
        "Acquire share locks using SELECT ... FOR SHARE",
        "Trigger concurrent deadlock intentionally and inspect error 40P01",
        "Prevent deadlocks by sorting resource IDs before locking"
      ],
      notes: "# Row Locking\\n\\nRow-level locks prevent concurrent double-spending and inventory over-allocations."
    },
    {
      dayNumber: 21,
      title: "JSONB in PostgreSQL: Document Storage in Relational DB",
      subtasks: [
        "Store semi-structured payloads in JSONB columns",
        "Query JSON fields using arrow operators (->, ->>)",
        "Filter records using JSON containment operator (@>)",
        "Index JSONB keys using GIN indexes"
      ],
      notes: "# JSONB in PostgreSQL\\n\\nJSONB combines the schema flexibility of document databases with relational ACID guarantees."
    },
    {
      dayNumber: 22,
      title: "Database Normalization: 1NF, 2NF, 3NF & BCNF",
      subtasks: [
        "Eliminate repeating groups for First Normal Form (1NF)",
        "Eliminate partial functional dependencies for Second Normal Form (2NF)",
        "Eliminate transitive dependencies for Third Normal Form (3NF)",
        "Analyze intentional denormalization trade-offs for high-volume analytics"
      ],
      notes: "# Normalization Rules\\n\\nNormalization decomposes tables to ensure every non-key attribute depends on the key, the whole key, and nothing but the key."
    },
    {
      dayNumber: 23,
      title: "Database Migrations & Schema Versioning",
      subtasks: [
        "Write backward-compatible zero-downtime database migrations",
        "Manage migrations using Drizzle ORM / Flyway",
        "Add NOT NULL columns safely with default values in production",
        "Audit schema evolution and rollback procedures"
      ],
      notes: "# Migrations\\n\\nProduction schema changes require zero-downtime migration patterns."
    },
    {
      dayNumber: 24,
      title: "ACID Banking Ledger Capstone & Final Review",
      subtasks: [
        "Implement double-entry bookkeeping ledger with strict balance constraints",
        "Verify concurrent transaction safety under high multi-threaded load",
        "Export final comprehensive SQL certification summary",
        "Complete Week 4 Capstone: ACID Concurrent Banking Ledger with Row Locking"
      ],
      notes: "# SQL Mastery\\n\\nCongratulations! You have mastered SQL, relational modeling, performance indexing, and ACID concurrency."
    }
  ]
});

console.log('Finished writing Java, ML, OS, and Database catalogs.');
