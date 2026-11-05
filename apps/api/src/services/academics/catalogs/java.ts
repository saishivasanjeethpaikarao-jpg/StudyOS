import type { SubjectCurriculumPackage } from '../types.js';

export const javaPackage: SubjectCurriculumPackage = {
  "id": "java",
  "aliases": [
    "java",
    "oop java",
    "java programming",
    "spring",
    "jvm"
  ],
  "subject": {
    "name": "Java & Object-Oriented Programming",
    "description": "JVM internals, object-oriented design, Collections framework, multithreading, Streams API, and Spring Boot foundations.",
    "color": "#EA580C",
    "icon": "coffee"
  },
  "assignments": [
    {
      "title": "Week 1 Project: Banking Simulation Engine & Transaction Ledger",
      "description": "Build a robust Java banking console application with account hierarchies, exception handling, and transaction validation.",
      "daysDue": 7
    },
    {
      "title": "Week 2 Project: Custom Generic Collections & Priority Dispatcher",
      "description": "Implement custom generic data structures (LinkedList, BinaryHeap) adhering to Java Collections interfaces with type bounds.",
      "daysDue": 14
    },
    {
      "title": "Week 3 Project: Multi-Threaded Web Crawler & Producer-Consumer Pipeline",
      "description": "Architect a concurrent web crawler utilizing Java's ExecutorService, BlockingQueue, and Atomic primitives with zero race conditions.",
      "daysDue": 21
    },
    {
      "title": "Week 4 Capstone: Enterprise Spring Boot REST API with Hibernate & Postgres",
      "description": "Build and deploy a complete Spring Boot microservice with JPA/Hibernate entities, DTO validation, and automated integration tests.",
      "daysDue": 28
    }
  ],
  "resources": [
    {
      "type": "youtube",
      "title": "Java Programming for Beginners - Full Course (freeCodeCamp)",
      "url": "https://www.youtube.com/watch?v=A74TOX803D0",
      "providerItemId": "A74TOX803D0"
    },
    {
      "type": "youtube",
      "title": "Java Full Course for free ☕ (Bro Code)",
      "url": "https://www.youtube.com/watch?v=xk4_1vDrzzo",
      "providerItemId": "xk4_1vDrzzo"
    },
    {
      "type": "web",
      "title": "Oracle Java SE Documentation & Tutorials",
      "url": "https://docs.oracle.com/en/java/",
      "providerItemId": null
    },
    {
      "type": "web",
      "title": "Baeldung - Java and Spring Tutorials",
      "url": "https://www.baeldung.com/",
      "providerItemId": null
    }
  ],
  "lectureDecks": [
    {
      "title": "Lecture 1: The JVM Architecture, Bytecode & Java Memory Model",
      "body": "## [SLIDE 1] 🎯 Course Objectives & The Java Virtual Machine\nWelcome to Java & Object-Oriented Programming! Java powers large-scale enterprise banking, Android applications, and cloud microservices.\n\n### 🎯 Key Learning Objectives\n* Understand \"Write Once, Run Anywhere\": Bytecode (.class) and the JVM.\n* Master the Java Memory Model: JVM Heap vs Thread Stacks.\n* Analyze the Just-In-Time (JIT) compiler and Garbage Collection (GC).\n\n💡 **Professor's Tip:** Java achieves speed through the JIT compiler, which identifies \"hot spots\" in bytecode and compiles them directly into native machine code at runtime!\n\n---\n\n## [SLIDE 2] 🧠 The JVM Execution Architecture\n```text\nJava Source (.java)\n      │ javac (Java Compiler)\n      ▼\nBytecode (.class)\n      │\n      ▼ JVM ClassLoader\nClass Area / Metaspace (Static variables, Class metadata)\n      │\n      ├──► JVM Thread Stacks (Local primitives, method call frames)\n      └──► JVM Heap (All Object instances, managed by Garbage Collector)\n            │\n            ▼ Execution Engine (Interpreter + JIT Compiler)\nHost CPU Machine Instructions\n```\n\n---\n\n## [SLIDE 3] 🏗️ JVM Memory Allocation Matrix\n| Area | Shared Between Threads? | Lifetime | Contents |\n| :--- | :--- | :--- | :--- |\n| **Heap** | YES | Entire application | All objects (`new`), arrays, and instance fields |\n| **Stack** | NO (Per Thread) | Function execution | Local variables, method arguments, return values |\n| **Metaspace** | YES | Class loading | Class bytecode, method signatures, static constants |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Typed Record Starter\n```java\npackage com.studyos.academics;\n\nimport java.util.Objects;\n\npublic record Student(String id, String name, double gpa) {\n    public Student {\n        Objects.requireNonNull(id, \"ID cannot be null\");\n        Objects.requireNonNull(name, \"Name cannot be null\");\n        if (gpa < 0.0 || gpa > 4.0) {\n            throw new IllegalArgumentException(\"GPA must be between 0.0 and 4.0\");\n        }\n    }\n\n    public static void main(String[] args) {\n        Student s1 = new Student(\"STU-101\", \"Alex Smith\", 3.85);\n        System.out.printf(\"StudyOS Java 21 LTS Initialized: %s (GPA: %.2f)%n\", s1.name(), s1.gpa());\n    }\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **String Comparison with `==`:** In Java, `str1 == str2` compares memory references! If strings are in different memory allocations, this returns `false` even if the text matches. Always write `str1.equals(str2)`.\n2. **NullPointerException (NPE):** Calling methods on an uninitialized reference throws NPE. Use `Optional<T>` or `Objects.requireNonNull()` for defensive design.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the difference between JDK, JRE, and JVM?\n  * *Answer:* JDK (development tools + compiler + JRE), JRE (runtime libraries + JVM), JVM (the abstract virtual machine executing bytecode).\n* **Q2:** Why are Java Records preferred over traditional POJOs for immutable data?\n  * *Answer:* Records automatically generate constructors, getters, `equals()`, `hashCode()`, and `toString()` methods concisely."
    },
    {
      "title": "Lecture 2: Core OOP: Encapsulation, Inheritance, Polymorphism & Abstraction",
      "body": "## [SLIDE 1] 🎯 The 4 Pillars of Object-Oriented Design\nObject-oriented programming manages real-world complexity through modular abstractions and clean encapsulation boundaries.\n\n### 🎯 Key Learning Objectives\n* Enforce Encapsulation with access modifiers (`private`, `protected`, `public`).\n* Differentiate Abstract Classes vs Interfaces in Java.\n* Master Runtime Polymorphism (Method Overriding vs Overloading).\n\n---\n\n## [SLIDE 2] 🧠 Polymorphic Dispatch Visualizer\n```text\nPaymentMethod (Interface / Abstract Base)\n  ├── CreditCardPayment -> overrides process(double amount)\n  ├── CryptoPayment     -> overrides process(double amount)\n  └── BankTransfer      -> overrides process(double amount)\n\nAt runtime:\nPaymentMethod method = getSelectedPaymentMethod();\nmethod.process(150.0); // JVM resolves the exact concrete implementation dynamically!\n```\n\n---\n\n## [SLIDE 3] 🏗️ Interface vs Abstract Class Comparison\n| Dimension | Java Interface | Abstract Class |\n| :--- | :--- | :--- |\n| **Multiple Inheritance** | YES (A class can implement many interfaces) | NO (Single inheritance only) |\n| **State / Fields** | `public static final` constants only | Can hold private mutable instance state |\n| **Default Methods** | Supported since Java 8 (`default` keyword) | Fully supported |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Polymorphic Payment System\n```java\npublic interface PaymentGateway {\n    boolean processTransaction(String accountId, double amount);\n    \n    default void logAudit(String txId) {\n        System.out.println(\"[AUDIT] Transaction processed: \" + txId);\n    }\n}\n\npublic final class StripeGateway implements PaymentGateway {\n    @Override\n    public boolean processTransaction(String accountId, double amount) {\n        if (amount <= 0) return false;\n        System.out.printf(\"Charging $%.2f via Stripe token %s%n\", amount, accountId);\n        logAudit(java.util.UUID.randomUUID().toString());\n        return true;\n    }\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Forgetting `@Override` Annotation:** Without `@Override`, a typo in method signature creates an unintentional overload instead of an override, breaking polymorphism without compiler warnings!\n2. **Diamond Problem in Multiple Inheritance:** Java prevents multiple class inheritance to avoid ambiguity. For interface default methods with matching signatures, classes must explicitly override the conflicting method.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the difference between method overloading and method overriding?\n  * *Answer:* Overloading occurs at compile-time within the same class (same name, different parameters); overriding occurs at runtime across inheritance (child replaces parent implementation).\n* **Q2:** What does the `final` keyword signify on a class, method, and variable?\n  * *Answer:* Final class cannot be inherited; final method cannot be overridden; final variable cannot be reassigned."
    },
    {
      "title": "Lecture 3: The Java Collections Framework: List, Set, Map & Deque",
      "body": "## [SLIDE 1] 🎯 The Enterprise Collections Architecture\nJava provides a rich, battle-tested hierarchy of generic data structures in `java.util`.\n\n### 🎯 Key Learning Objectives\n* Navigate the `Iterable` $\\to$ `Collection` hierarchy.\n* Master `ArrayList` vs `LinkedList` performance characteristics.\n* Understand `HashMap` bucket chaining and Treeify conversions.\n\n---\n\n## [SLIDE 2] 🧠 Java Collections Hierarchy\n```text\nIterable\n └── Collection\n      ├── List (Ordered, duplicates allowed)\n      │    ├── ArrayList (Dynamic array)\n      │    └── LinkedList (Doubly-linked nodes)\n      ├── Set (Unique elements)\n      │    ├── HashSet (O(1) Hash table)\n      │    └── TreeSet (Sorted Red-Black tree)\n      └── Queue & Deque (FIFO / Priority)\n           ├── ArrayDeque\n           └── PriorityQueue (Min-Heap)\n```\n\n---\n\n## [SLIDE 3] 🏗️ HashMap Internal Architecture (Java 8+)\n```text\nBucket Array: [ Node 0 | Node 1 | Node 2 | ... | Node 15 ]\n                           │\n       When bucket size > 8 and capacity >= 64:\n                           │\n       Transforms from LinkedList to Balanced Red-Black Tree!\n       Worst-case collision lookup drops from O(N) to O(log N)!\n```\n\n---\n\n## [SLIDE 4] 💻 Production Code: Collections Pipeline\n```java\nimport java.util.*;\n\npublic class InventoryRegistry {\n    private final Map<String, Integer> stock = new HashMap<>();\n\n    public void updateStock(String sku, int quantity) {\n        // Atomic merge using compute\n        stock.compute(sku, (k, current) -> (current == null) ? quantity : current + quantity);\n    }\n\n    public List<Map.Entry<String, Integer>> getSortedLowStock(int threshold) {\n        return stock.entrySet().stream()\n            .filter(e -> e.getValue() < threshold)\n            .sorted(Map.Entry.comparingByValue())\n            .toList();\n    }\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Broken `equals()` and `hashCode()` Contract:** If two objects are equal according to `equals()`, they MUST return the exact same `hashCode()`! Breaking this causes objects to disappear or fail to be retrieved from `HashMap` or `HashSet`.\n2. **ConcurrentModificationException:** Modifying a collection directly while iterating over it via an enhanced for-loop throws this exception. Use `Iterator.remove()` or `removeIf()`.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What happens in a Java 8+ HashMap when too many keys hash to the same bucket?\n  * *Answer:* Once the collision chain exceeds 8 nodes, it transforms from a linked list to a balanced Red-Black tree, improving search time to $O(\\log N)$.\n* **Q2:** Why is `ArrayDeque` generally preferred over `Stack` and `LinkedList` for LIFO/FIFO operations?\n  * *Answer:* `ArrayDeque` avoids synchronization overhead of legacy `Stack` and has significantly better cache locality and lower memory overhead than node-based `LinkedList`.\""
    },
    {
      "title": "Lecture 4: Functional Java: Lambdas, Functional Interfaces & Streams API",
      "body": "## [SLIDE 1] 🎯 Declarative Data Processing with Streams\nModern Java balances OOP with powerful declarative streams for filtering, mapping, and parallel reductions.\n\n### 🎯 Key Learning Objectives\n* Understand Core Functional Interfaces: `Predicate`, `Function`, `Consumer`, `Supplier`.\n* Master Stream operations: Intermediate (`filter`, `map`) vs Terminal (`collect`, `reduce`).\n* Utilize Parallel Streams safely.\n\n---\n\n## [SLIDE 2] 🧠 Stream Processing Pipeline\n```text\nSource: list.stream()\n          │\nIntermediate: .filter(s -> s.getGpa() >= 3.5)  <-- LAZY (Executes only on terminal call!)\n          │\nIntermediate: .map(Student::getName)\n          │\nTerminal:     .toList()                        <-- TRIGGERS EXECUTION!\n```\n\n---\n\n## [SLIDE 3] 🏗️ Core Functional Interfaces\n| Interface | Method Signature | Purpose | Example |\n| :--- | :--- | :--- | :--- |\n| **Predicate<T>** | `boolean test(T t)` | Boolean filter condition | `s -> s.getAge() >= 18` |\n| **Function<T, R>**| `R apply(T t)` | Transforms type T to R | `Student::getName` |\n| **Consumer<T>** | `void accept(T t)` | Performs side-effect action | `System.out::println` |\n| **Supplier<T>** | `T get()` | Generates or supplies value | `() -> new Random().nextInt()` |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Streams Grouping & Statistics\n```java\nimport java.util.*;\nimport java.util.stream.Collectors;\n\npublic class AnalyticsService {\n    public record CourseEnrollment(String courseCode, String studentId, double grade) {}\n\n    public Map<String, Double> computeCourseAverages(List<CourseEnrollment> records) {\n        return records.stream()\n            .collect(Collectors.groupingBy(\n                CourseEnrollment::courseCode,\n                Collectors.averagingDouble(CourseEnrollment::grade)\n            ));\n    }\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Reusing Streams:** A Stream in Java can only be traversed ONCE! Attempting to invoke terminal operations on a consumed stream throws `IllegalStateException: stream has already been operated upon`.\n2. **Side-Effects in Stream Operations:** Modifying shared mutable external variables inside `.forEach()` or `.map()` leads to severe race conditions when switching to `.parallelStream()`.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the difference between intermediate and terminal operations in the Streams API?\n  * *Answer:* Intermediate operations return a new stream and are evaluated lazily; terminal operations trigger execution and produce a final result or side-effect.\n* **Q2:** What does the method reference `String::toUpperCase` represent?\n  * *Answer:* Shorthand for the lambda expression `s -> s.toUpperCase()`."
    },
    {
      "title": "Lecture 5: Java Concurrency: Threads, Locks, Executors & Virtual Threads",
      "body": "## [SLIDE 1] 🎯 High-Throughput Concurrency in Java\nJava offers the most advanced concurrency toolkit in the industry, from low-level OS threads to Java 21 Project Loom Virtual Threads.\n\n### 🎯 Key Learning Objectives\n* Understand Thread Lifecycle and the `synchronized` keyword.\n* Utilize `java.util.concurrent`: `ExecutorService`, `CountDownLatch`, and `ConcurrentHashMap`.\n* Master Java 21 Virtual Threads for high-throughput I/O applications.\n\n---\n\n## [SLIDE 2] 🧠 Platform Threads vs Virtual Threads (Project Loom)\n```text\nPlatform (OS) Threads: 1 Java Thread = 1 Kernel Thread (1 MB RAM each -> Max ~5,000 threads)\nVirtual Threads:       100,000s of Virtual Threads mapped to a few Carrier OS Threads!\n```\nWhen a virtual thread blocks on I/O (network, database), the carrier thread unmounts it and executes other work immediately!\n\n---\n\n## [SLIDE 3] 🏗️ Concurrency Primitives Matrix\n| Primitive | Purpose | Thread-Safe? |\n| :--- | :--- | :--- |\n| **AtomicInteger** | Lock-free lockless counter using CPU CAS (Compare-And-Swap) | YES |\n| **ReentrantLock** | Explicit mutual exclusion with timeouts and fairness | YES |\n| **ConcurrentHashMap** | Lock-striping partitioned thread-safe map | YES |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Java 21 Virtual Thread Pool\n```java\nimport java.util.concurrent.*;\n\npublic class HighThroughputServer {\n    public static void main(String[] args) throws InterruptedException {\n        // Spawns millions of lightweight virtual threads effortlessly\n        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {\n            for (int i = 0; i < 10_000; i++) {\n                final int taskId = i;\n                executor.submit(() -> {\n                    Thread.sleep(100); // Non-blocking simulation of database call\n                    return taskId * 2;\n                });\n            }\n        } // Auto-closes and awaits termination of all tasks\n        System.out.println(\"All 10,000 tasks executed with virtual threads!\");\n    }\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Deadlock Conditions:** Deadlock occurs when Thread 1 holds Lock A and waits for Lock B, while Thread 2 holds Lock B and waits for Lock A. Always acquire multiple locks in a globally consistent order.\n2. **Thread Starvation with CPU-Bound Tasks on Virtual Threads:** Virtual threads are designed for blocking I/O; running heavy CPU-bound computations on virtual threads can pin carrier threads and degrade performance.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is a race condition?\n  * *Answer:* A flaw where multiple threads access and mutate shared memory concurrently, producing unpredictable results depending on execution timing.\n* **Q2:** How does `AtomicInteger.incrementAndGet()` achieve thread safety without locks?\n  * *Answer:* By using hardware-level Compare-And-Swap (CAS) CPU instructions that update memory atomically."
    },
    {
      "title": "Lecture 6: Resilient Java I/O: NIO.2, Serialization & File Channels",
      "body": "## [SLIDE 1] 🎯 Enterprise File I/O & Serialization\nJava NIO.2 (`java.nio.file`) replaced legacy `java.io.File` with non-blocking buffers, memory-mapped files, and robust path operations.\n\n### 🎯 Key Learning Objectives\n* Master the `Path` and `Files` APIs.\n* Use try-with-resources (`AutoCloseable`) for resource safety.\n* Parse structured JSON/XML data using modern libraries (Jackson).\n\n---\n\n## [SLIDE 2] 🧠 Stream vs Channel Buffer Architecture\n```text\nLegacy IO:    File ─── Byte Stream (Blocking, byte-by-byte) ───► Program\nNIO.2:        File ─── FileChannel (DMA / Block Transfer) ───► ByteBuffer (Direct Memory)\n```\n\n---\n\n## [SLIDE 3] 🏗️ Try-With-Resources Protocol\nAny class implementing `java.lang.AutoCloseable` can be managed automatically:\n```java\ntry (BufferedReader br = Files.newBufferedReader(path)) {\n    // br.close() is ALWAYS called even if exceptions occur!\n}\n```\n\n---\n\n## [SLIDE 4] 💻 Production Code: Safe File Ingestion\n```java\nimport java.io.IOException;\nimport java.nio.file.*;\nimport java.util.List;\n\npublic class LogProcessor {\n    public static List<String> extractErrors(Path logPath) throws IOException {\n        if (!Files.exists(logPath)) {\n            throw new NoSuchFileException(\"Log file not found: \" + logPath);\n        }\n\n        try (var linesStream = Files.lines(logPath)) {\n            return linesStream\n                .filter(line -> line.contains(\"ERROR\"))\n                .limit(100)\n                .toList();\n        }\n    }\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Leaking `Files.lines()` Streams:** `Files.lines()` opens a file descriptor that remains locked until closed! Always wrap it in a `try-with-resources` block.\n2. **Native Java Serialization Security Holes:** Never use `ObjectInputStream` with untrusted inputs—it is a notorious vector for arbitrary remote code execution (RCE) attacks! Use JSON (Jackson) or Protocol Buffers instead.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What interface must a class implement to be used in a `try-with-resources` statement?\n  * *Answer:* `java.lang.AutoCloseable`.\n* **Q2:** Why is `Path.resolve()` preferred over manual string concatenation for building file paths?\n  * *Answer:* `Path.resolve()` automatically uses the correct operating system separator (`/` on POSIX vs `\\` on Windows) and prevents malformed paths."
    },
    {
      "title": "Lecture 7: Design Patterns in Java (Singleton, Factory, Builder & Observer)",
      "body": "## [SLIDE 1] 🎯 Classic Gang of Four (GoF) Design Patterns\nDesign patterns are reusable solutions to commonly occurring software architecture problems in object-oriented systems.\n\n### 🎯 Key Learning Objectives\n* Implement Creational Patterns: Singleton (Thread-Safe Enum) and Builder.\n* Master Structural Patterns: Adapter and Decorator.\n* Implement Behavioral Patterns: Strategy and Observer.\n\n---\n\n## [SLIDE 2] 🧠 The Builder Pattern Architecture\n```text\nDirector / Client:\nDatabaseConfig config = new DatabaseConfig.Builder()\n    .host(\"localhost\")\n    .port(5432)\n    .database(\"studyos\")\n    .timeout(30)\n    .build(); // Validates all constraints atomically before returning immutable object!\n```\n\n---\n\n## [SLIDE 3] 🏗️ Core Patterns Classification\n| Pattern | Category | Intent |\n| :--- | :--- | :--- |\n| **Singleton** | Creational | Ensures exactly one instance exists with a global access point |\n| **Builder** | Creational | Constructs complex objects step-by-step with immutability |\n| **Strategy** | Behavioral | Defines a family of interchangeable algorithms |\n| **Observer** | Behavioral | Notifies dependent subscribers when state changes |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Thread-Safe Singleton & Strategy\n```java\n// Effective Java Item 3: A single-element enum is the best way to implement a Singleton\npublic enum ConfigurationManager {\n    INSTANCE;\n    private final String environment = System.getenv().getOrDefault(\"ENV\", \"development\");\n    public String getEnvironment() { return environment; }\n}\n\n// Strategy Pattern Interface\npublic interface CompressionStrategy {\n    byte[] compress(byte[] data);\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Broken Double-Checked Locking:** In Java, implementing a Singleton using double-checked locking without the `volatile` keyword allows partially constructed objects to be observed by other threads due to instruction reordering!\n2. **Over-Engineering with Patterns:** Applying patterns where simple straightforward methods suffice introduces unnecessary indirection and complexity.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** Why is an `enum` the recommended way to implement a Singleton in Java?\n  * *Answer:* Enums provide automatic thread-safety, serialization guarantees, and prevent reflection-based instantiation attacks without complex boilerplate.\n* **Q2:** What problem does the Builder pattern solve?\n  * *Answer:* It eliminates telescoping constructors with numerous parameters and allows building immutable objects with clear, fluent method chaining."
    },
    {
      "title": "Lecture 8: Spring Boot Foundations: Dependency Injection, JPA & REST",
      "body": "## [SLIDE 1] 🎯 Enterprise Microservices with Spring Boot\nSpring Boot is the standard enterprise Java framework, providing Inversion of Control (IoC), Dependency Injection (DI), and seamless ORM persistence.\n\n### 🎯 Key Learning Objectives\n* Understand Inversion of Control (IoC) and the ApplicationContext.\n* Master Spring Stereotype Annotations: `@RestController`, `@Service`, `@Repository`.\n* Map database entities with Jakarta Persistence API (JPA) and Spring Data.\n\n---\n\n## [SLIDE 2] 🧠 Spring Inversion of Control (IoC) Flow\n```text\nSpring Boot Application Startup\n      │\n      ▼ Component Scan\nDiscovers @Component, @Service, @Repository, @RestController\n      │\n      ▼ IoC Container\nInstantiates Beans and injects dependencies via Constructor Injection\n      │\n      ▼ Ready to serve HTTP Traffic\nClient Request ──► @RestController ──► @Service ──► @Repository (JPA) ──► PostgreSQL\n```\n\n---\n\n## [SLIDE 3] 🏗️ Spring Stereotype Architecture\n| Annotation | Role in Architecture |\n| :--- | :--- |\n| **`@RestController`** | Handles HTTP requests, serializes responses to JSON |\n| **`@Service`** | Encapsulates business logic, transactional boundaries (`@Transactional`) |\n| **`@Repository`** | Data access layer, translates database exceptions |\n| **`@Entity`** | Maps Java class to relational database table |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Spring Boot REST Controller\n```java\npackage com.studyos.api;\n\nimport org.springframework.web.bind.annotation.*;\nimport org.springframework.http.ResponseEntity;\nimport java.util.List;\n\n@RestController\n@RequestMapping(\"/api/v1/courses\")\npublic class CourseController {\n    private final CourseService courseService;\n\n    // Preferred: Constructor Injection\n    public CourseController(CourseService courseService) {\n        this.courseService = courseService;\n    }\n\n    @GetMapping\n    public ResponseEntity<List<CourseDto>> listActiveCourses() {\n        return ResponseEntity.ok(courseService.getAllActive());\n    }\n\n    @PostMapping\n    public ResponseEntity<CourseDto> createCourse(@RequestBody CourseCreateRequest req) {\n        CourseDto created = courseService.create(req);\n        return ResponseEntity.status(201).body(created);\n    }\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Field Injection with `@Autowired`:** Field injection hides dependencies, makes unit testing difficult, and prevents immutable final fields. Always use **Constructor Injection**!\n2. **LazyInitializationException in JPA:** Accessing lazy-loaded relations outside a transactional boundary throws this error. Use JOIN FETCH queries or DTO projections.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is Inversion of Control (IoC)?\n  * *Answer:* A design principle where the framework controls the program's execution flow and creates/wires dependencies rather than individual classes instantiating them directly.\n* **Q2:** Why is Constructor Injection preferred over Field Injection in Spring?\n  * *Answer:* It allows dependencies to be marked `final` (immutability), prevents partially initialized objects, and makes testing trivial without Spring reflections."
    }
  ],
  "dailyLessons": [
    {
      "dayNumber": 1,
      "title": "Java Setup: JDK 21, JVM Internals & Hello World",
      "subtasks": [
        "Install OpenJDK 21 and verify with java -version and javac -version",
        "Compile source with javac Main.java and inspect generated Main.class bytecode",
        "Disassemble bytecode using javap -c Main to view JVM opcodes",
        "Execute application with java Main and verify return status"
      ],
      "notes": "# Java Setup & The JVM\\n\\nThe Java compiler outputs platform-independent bytecode executed by the JVM."
    },
    {
      "dayNumber": 2,
      "title": "Java Primitives, Wrapper Classes & Autoboxing",
      "subtasks": [
        "Declare all 8 primitive types (byte, short, int, long, float, double, char, boolean)",
        "Explore wrapper classes (Integer, Double) and autoboxing/unboxing overhead",
        "Test Integer cache pooling (-128 to 127) with == and equals()",
        "Use BigInteger and BigDecimal for exact financial arithmetic"
      ],
      "notes": "# Primitives & Wrappers\\n\\nAlways use `BigDecimal` for currency to avoid IEEE 754 precision errors."
    },
    {
      "dayNumber": 3,
      "title": "Java OOP: Classes, Encapsulation & Access Modifiers",
      "subtasks": [
        "Create domain class with private fields and public getters/setters",
        "Validate inputs defensively inside constructors",
        "Compare access levels: private, package-private, protected, and public",
        "Modernize data carrier classes using Java Records"
      ],
      "notes": "# Encapsulation\\n\\nKeep fields private and expose controlled access via getters and constructors."
    },
    {
      "dayNumber": 4,
      "title": "Java OOP: Inheritance, Polymorphism & super Keyword",
      "subtasks": [
        "Extend base class using extends and invoke parent constructor with super()",
        "Override methods with explicit @Override annotation",
        "Demonstrate polymorphic assignment: Animal a = new Dog()",
        "Prevent inheritance using final class and final method declarations"
      ],
      "notes": "# Polymorphism\\n\\nRuntime polymorphism dynamically resolves method implementations via virtual method tables."
    },
    {
      "dayNumber": 5,
      "title": "Java Abstraction: Interfaces vs Abstract Classes",
      "subtasks": [
        "Define an interface with abstract and default methods",
        "Implement multiple interfaces in a single concrete class",
        "Create an abstract class with shared template method logic",
        "Compare interface default methods vs abstract class methods"
      ],
      "notes": "# Interfaces & Abstraction\\n\\nInterfaces define behavioral contracts while abstract classes share state and implementation."
    },
    {
      "dayNumber": 6,
      "title": "Banking Simulation Engine Milestone",
      "subtasks": [
        "Implement Account, SavingsAccount, and CheckingAccount class hierarchy",
        "Enforce transaction limits and throw custom InsufficientFundsException",
        "Maintain chronological transaction log using immutable records",
        "Complete Week 1 Project: Banking Simulation Engine & Transaction Ledger"
      ],
      "notes": "# Banking Simulation Review\\n\\nMastering class hierarchies and exception handling creates robust enterprise software."
    },
    {
      "dayNumber": 7,
      "title": "Java Collections: ArrayList, LinkedList & List Operations",
      "subtasks": [
        "Benchmark random access vs sequential insertion in ArrayList and LinkedList",
        "Sort lists using Collections.sort() and custom Comparator",
        "Transform arrays to lists using Arrays.asList() and List.of()",
        "Iterate safely using Iterator.remove() to avoid concurrent modifications"
      ],
      "notes": "# List Collections\\n\\n`ArrayList` offers $O(1)$ indexed reads; `LinkedList` offers $O(1)$ insertion at boundaries."
    },
    {
      "dayNumber": 8,
      "title": "Java Sets & Maps: HashSet, TreeSet, HashMap & TreeMap",
      "subtasks": [
        "Implement custom key class and override equals() and hashCode() correctly",
        "Verify why violating the equals/hashCode contract corrupts HashSet lookups",
        "Iterate over map entries using entrySet() and keySet()",
        "Use TreeMap for natural sorted key order traversal"
      ],
      "notes": "# Maps & Hash Tables\\n\\n`HashMap` provides $O(1)$ amortized lookups; always implement `equals()` and `hashCode()` together."
    },
    {
      "dayNumber": 9,
      "title": "Java Generics: Type Parameters, Bounds & Wildcards",
      "subtasks": [
        "Create generic class Container<T> with type safety",
        "Use upper bounded wildcards: List<? extends Number>",
        "Apply the PECS guideline (Producer Extends, Consumer Super)",
        "Understand type erasure and its runtime limitations"
      ],
      "notes": "# Generics & Type Erasure\\n\\nGenerics provide compile-time type safety; types are erased to `Object` in bytecode."
    },
    {
      "dayNumber": 10,
      "title": "Functional Java: Lambdas & Built-in Functional Interfaces",
      "subtasks": [
        "Write lambda expressions replacing anonymous inner classes",
        "Apply Predicate<T>, Function<T, R>, and Consumer<T>",
        "Use method references (Class::method, instance::method)",
        "Compose predicates with and(), or(), and negate()"
      ],
      "notes": "# Lambdas & Functional Interfaces\\n\\nLambdas enable concise functional composition across collections."
    },
    {
      "dayNumber": 11,
      "title": "Java Streams API: filter, map, flatMap & collect",
      "subtasks": [
        "Chain intermediate operations (filter, map, sorted, distinct)",
        "Flatten nested collections using flatMap()",
        "Aggregate results with Collectors.toList() and Collectors.joining()",
        "Compute grouped summaries with Collectors.groupingBy()"
      ],
      "notes": "# The Streams API\\n\\nStreams process data declaratively with lazy evaluation."
    },
    {
      "dayNumber": 12,
      "title": "Custom Generic Collections Milestone",
      "subtasks": [
        "Build a custom generic PriorityQueue with binary min-heap backing",
        "Implement Iterable<T> interface to support enhanced for-loops",
        "Write comprehensive JUnit tests verifying edge-case operations",
        "Complete Week 2 Project: Custom Generic Collections & Priority Dispatcher"
      ],
      "notes": "# Collections Project Review\\n\\nImplementing custom data structures sharpens generic programming instincts."
    },
    {
      "dayNumber": 13,
      "title": "Java Concurrency: Threads, Runnable & synchronized",
      "subtasks": [
        "Create and start threads using Thread and Runnable",
        "Synchronize critical sections using the synchronized keyword",
        "Observe race conditions on un-synchronized shared counters",
        "Communicate between threads using wait(), notify(), and notifyAll()"
      ],
      "notes": "# Thread Basics\\n\\n`synchronized` prevents multiple threads from executing critical sections simultaneously."
    },
    {
      "dayNumber": 14,
      "title": "Concurrency Utilities: ExecutorService, Futures & Thread Pools",
      "subtasks": [
        "Manage thread pools using Executors.newFixedThreadPool()",
        "Submit asynchronous Callable<T> tasks and retrieve Future<T> results",
        "Handle task timeouts with future.get(timeout, TimeUnit.SECONDS)",
        "Shut down executors gracefully using shutdown() and awaitTermination()"
      ],
      "notes": "# Thread Pools\\n\\n`ExecutorService` decouples task submission from thread management."
    },
    {
      "dayNumber": 15,
      "title": "Concurrent Collections & Atomic Variables",
      "subtasks": [
        "Use AtomicInteger and AtomicReference for lock-free thread safety",
        "Replace synchronized maps with high-throughput ConcurrentHashMap",
        "Implement producer-consumer queue using ArrayBlockingQueue",
        "Coordinate concurrent worker threads using CountDownLatch"
      ],
      "notes": "# Lock-Free Concurrency\\n\\nAtomic classes use hardware CAS instructions for thread-safe mutations without blocking."
    },
    {
      "dayNumber": 16,
      "title": "Java 21 Virtual Threads & Structured Concurrency",
      "subtasks": [
        "Create virtual threads using Thread.ofVirtual().start()",
        "Spawn 100,000 virtual threads and inspect minimal RAM footprint",
        "Compare virtual thread throughput on blocking I/O vs platform threads",
        "Manage concurrent subtasks using StructuredTaskScope"
      ],
      "notes": "# Project Loom Virtual Threads\\n\\nVirtual threads deliver lightweight, high-scale concurrency for I/O-bound applications."
    },
    {
      "dayNumber": 17,
      "title": "Java NIO.2: Files, Paths & Non-Blocking Channels",
      "subtasks": [
        "Read and write text files using java.nio.file.Files",
        "Stream file contents line-by-line with Files.lines() in try-with-resources",
        "Traverse directory trees recursively with Files.walk()",
        "Watch filesystem events using WatchService"
      ],
      "notes": "# Modern Java File I/O\\n\\nNIO.2 replaces legacy File API with fast, non-blocking path operations."
    },
    {
      "dayNumber": 18,
      "title": "Multi-Threaded Web Crawler Milestone",
      "subtasks": [
        "Build a concurrent crawler fetching URLs using HttpClient and Virtual Threads",
        "Maintain visited URL set using ConcurrentHashMap.newKeySet()",
        "Enforce rate limits using Semaphore",
        "Complete Week 3 Project: Multi-Threaded Web Crawler & Producer-Consumer Pipeline"
      ],
      "notes": "# Concurrency Milestone Review\\n\\nCombining virtual threads with thread-safe sets builds resilient crawler engines."
    },
    {
      "dayNumber": 19,
      "title": "Design Patterns: Singleton, Factory & Builder",
      "subtasks": [
        "Implement Singleton pattern safely using single-element enum",
        "Build object instances with fluent, immutable Builder pattern",
        "Implement Factory pattern to decouple instantiation from client code",
        "Refactor legacy constructor parameters into clean builders"
      ],
      "notes": "# Creational Patterns\\n\\nBuilders construct complex immutable objects with readability and validation."
    },
    {
      "dayNumber": 20,
      "title": "Design Patterns: Strategy, Observer & Decorator",
      "subtasks": [
        "Implement Strategy pattern using interchangeable lambda expressions",
        "Build event notification system using Observer pattern",
        "Wrap I/O streams using Decorator pattern",
        "Apply patterns to eliminate cascading if-else statements"
      ],
      "notes": "# Behavioral Patterns\\n\\nStrategy patterns swap algorithms at runtime without modifying callers."
    },
    {
      "dayNumber": 21,
      "title": "Spring Boot Basics: Inversion of Control & Dependency Injection",
      "subtasks": [
        "Bootstrap Spring Boot project using Spring Initializr",
        "Register service beans with @Service and inject via constructors",
        "Configure application properties in application.yml",
        "Run Spring Boot application and inspect console banner and beans"
      ],
      "notes": "# Spring Boot & IoC\\n\\nSpring's IoC container manages bean lifecycles and dependency wiring."
    },
    {
      "dayNumber": 22,
      "title": "Spring Boot REST: Controllers, RequestMapping & DTO Validation",
      "subtasks": [
        "Expose REST endpoints using @RestController and @GetMapping/@PostMapping",
        "Validate incoming request bodies using Jakarta validation annotations (@NotNull, @Size)",
        "Handle exceptions globally using @ControllerAdvice and @ExceptionHandler",
        "Test endpoints using curl or Postman"
      ],
      "notes": "# RESTful APIs in Spring\\n\\nUse `@RestController` with `@Valid` DTOs for type-safe HTTP endpoints."
    },
    {
      "dayNumber": 23,
      "title": "Spring Data JPA & Hibernate: Entities, Repositories & Postgres",
      "subtasks": [
        "Map relational tables using @Entity, @Id, and @GeneratedValue",
        "Create CRUD repositories extending JpaRepository<Entity, ID>",
        "Write custom derived query methods (findByEmail, findByStatus)",
        "Manage transaction boundaries with @Transactional"
      ],
      "notes": "# Persistence with Spring Data JPA\\n\\n`JpaRepository` provides automatic database operations without boilerplate SQL."
    },
    {
      "dayNumber": 24,
      "title": "Enterprise Java Capstone: Production Deployment & Docker",
      "subtasks": [
        "Package Spring Boot application into executable fat JAR",
        "Containerize application using multi-stage Dockerfile",
        "Write automated integration tests using @SpringBootTest and Testcontainers",
        "Complete Week 4 Capstone: Enterprise Spring Boot REST API with Postgres"
      ],
      "notes": "# Java Mastery\\n\\nCongratulations! You have mastered enterprise Java, OOP design, concurrency, and Spring Boot."
    }
  ]
};
