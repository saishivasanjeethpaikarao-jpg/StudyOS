import type { SubjectCurriculumPackage } from '../types.js';

export const operatingSystemsPackage: SubjectCurriculumPackage = {
  "id": "operating-systems",
  "aliases": [
    "operating systems",
    "os",
    "computer architecture",
    "systems",
    "posix",
    "linux kernel"
  ],
  "subject": {
    "name": "Operating Systems & Computer Architecture",
    "description": "Kernel architecture, process/thread scheduling, virtual memory, paging, filesystems, and POSIX concurrency.",
    "color": "#64748B",
    "icon": "cpu"
  },
  "assignments": [
    {
      "title": "Week 1 Project: Interactive Unix Shell in C with Pipelines & Redirection",
      "description": "Implement a POSIX shell supporting fork(), execvp(), waitpid(), stdin/stdout redirection (<, >), and pipelines (|).",
      "daysDue": 7
    },
    {
      "title": "Week 2 Project: Multi-Threaded Round-Robin & Priority CPU Scheduler",
      "description": "Build a discrete event simulation of OS scheduling algorithms (FCFS, SJF, Round Robin, Multilevel Feedback Queue) and compute average turnaround and wait times.",
      "daysDue": 14
    },
    {
      "title": "Week 3 Project: Virtual Memory Paging Simulator with Page Replacement",
      "description": "Simulate a 2-level page table, TLB cache, and page replacement policies (FIFO, LRU, Clock) to track page hit rates and page faults.",
      "daysDue": 21
    },
    {
      "title": "Week 4 Capstone: Micro-Kernel File System & Directory Inode Parser",
      "description": "Implement a simplified user-space file system (ext2-style) with superblock, inode tables, bitmap allocation, and file read/write operations.",
      "daysDue": 28
    }
  ],
  "resources": [
    {
      "type": "youtube",
      "title": "Operating Systems: Crash Course Computer Science (freeCodeCamp)",
      "url": "https://www.youtube.com/watch?v=26QPDBe-NB8",
      "providerItemId": "26QPDBe-NB8"
    },
    {
      "type": "youtube",
      "title": "Operating System Full Course | University Syllabus (Neso Academy)",
      "url": "https://www.youtube.com/watch?v=mXw9ruZaxzQ",
      "providerItemId": "mXw9ruZaxzQ"
    },
    {
      "type": "youtube",
      "title": "Operating System Syllabus & CPU Scheduling (Gate Smashers)",
      "url": "https://www.youtube.com/watch?v=bkSWJJZNgf8",
      "providerItemId": "bkSWJJZNgf8"
    },
    {
      "type": "web",
      "title": "Operating Systems: Three Easy Pieces (OSTEP - Free Book)",
      "url": "https://pages.cs.wisc.edu/~remzi/OSTEP/",
      "providerItemId": null
    }
  ],
  "lectureDecks": [
    {
      "title": "Lecture 1: The Kernel Architecture, System Calls & Dual Mode Operation",
      "body": "## [SLIDE 1] 🎯 Course Objectives & The Core Mission of an OS\nThe Operating System is the resource manager that transforms raw hardware (CPU, RAM, Disks) into a secure, virtualized computing environment.\n\n### 🎯 Key Learning Objectives\n* Understand Dual-Mode Execution: User Mode (Ring 3) vs Kernel Mode (Ring 0).\n* Trace the System Call Traps and Hardware Interrupts.\n* Master Monolithic vs Microkernel architectures.\n\n💡 **Professor's Tip:** User code cannot touch hardware directly. Every file access, packet send, and memory allocation is mediated by the Kernel via System Calls!\n\n---\n\n## [SLIDE 2] 🧠 Dual-Mode Execution & System Call Trap\n```text\nUser Space (Ring 3 - Restricted)\nUser Application: read(fd, buf, size)\n      │\n      ▼ CPU Software Interrupt (e.g. syscall / int 0x80)\nHardware Mode Switch (User Mode ──► Kernel Mode)\n      │\nKernel Space (Ring 0 - Privileged)\nSystem Call Dispatch Table ──► sys_read() Handler\n      │ Access Device Driver & Hardware Buffers\nHardware Mode Switch (Kernel Mode ──► User Mode)\n      │\nReturn bytes to User Application\n```\n\n---\n\n## [SLIDE 3] 🏗️ Kernel Architectures Compared\n| Architecture | Design Philosophy | Performance | Reliability | Examples |\n| :--- | :--- | :--- | :--- | :--- |\n| **Monolithic** | All OS services (drivers, FS, scheduler) live in kernel space | High (Direct function calls) | Single driver bug crashes entire kernel | Linux, Unix, Windows NT |\n| **Microkernel** | Only IPC, minimal memory, and scheduling in kernel; services run in user space | Lower (IPC context switches) | High (Crashed driver can be restarted) | seL4, QNX, Minix |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Low-Level POSIX System Call\n```c\n#include <unistd.h>\n#include <fcntl.h>\n#include <stdio.h>\n\nint main(void) {\n    // Direct system call bypasses standard library buffers\n    int fd = open(\"log.txt\", O_WRONLY | O_CREAT | O_TRUNC, 0644);\n    if (fd < 0) {\n        perror(\"Failed to open file descriptor\");\n        return 1;\n    }\n\n    const char msg[] = \"StudyOS Kernel: Direct write() syscall executed!\\n\";\n    ssize_t bytes_written = write(fd, msg, sizeof(msg) - 1);\n    \n    close(fd);\n    printf(\"Wrote %zd bytes to disk via kernel trap.\\n\", bytes_written);\n    return 0;\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Context Switch Overhead:** Switching between User Mode and Kernel Mode requires saving CPU registers, flushing pipeline buffers, and altering memory mapping, incurring real performance costs.\n2. **Ignoring System Call Return Codes:** System calls return `-1` on failure and set the global `errno`. Never assume a syscall succeeded without checking its return value!\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What prevents a malicious user program from directly overwriting the operating system kernel memory?\n  * *Answer:* CPU hardware memory protection (Page Tables with Supervisor/User privilege bits) and dual-mode CPU enforcement.\n* **Q2:** What happens when an illegal instruction or memory access occurs in user space?\n  * *Answer:* The CPU triggers a hardware exception/trap, switching execution to the kernel's fault handler, which typically terminates the offending process with a signal (e.g. SIGSEGV)."
    },
    {
      "title": "Lecture 2: Processes, Thread Lifecycle & Inter-Process Communication (IPC)",
      "body": "## [SLIDE 1] 🎯 Processes vs Threads\nA Process is an executing program with isolated address space, while Threads are lightweight execution paths sharing the process's memory.\n\n### 🎯 Key Learning Objectives\n* Understand the Process Control Block (PCB) and state lifecycle.\n* Master `fork()`, `execvp()`, and `waitpid()`.\n* Contrast Inter-Process Communication (Pipes, Shared Memory) vs Thread Concurrency.\n\n---\n\n## [SLIDE 2] 🧠 The 5-State Process Model\n```text\n         New\n          │\n          ▼\n       Ready ◄───────────────┐\n          │                  │\n   CPU    ▼ Preemption       │ I/O Completion\n Scheduled│                  │\n          ▼                  │\n       Running ────────► Blocked / Waiting\n          │        I/O Request\n          ▼\n      Terminated\n```\n\n---\n\n## [SLIDE 3] 🏗️ Process vs Thread Memory Sharing\n| Memory Segment | Separate per Process? | Shared between Threads of same Process? |\n| :--- | :--- | :--- |\n| **Address Space** | YES | YES |\n| **Global Data & Heap**| YES | YES |\n| **Open File Descriptors**| YES | YES |\n| **Program Counter (PC)** | YES | NO (Each thread has independent PC) |\n| **Stack & Registers** | YES | NO (Each thread has independent Stack) |\n\n---\n\n## [SLIDE 4] 💻 Production Code: The Fork-Exec Pipeline\n```c\n#include <stdio.h>\n#include <unistd.h>\n#include <sys/wait.h>\n\nvoid execute_external_command(char *cmd, char *args[]) {\n    pid_t pid = fork();\n\n    if (pid < 0) {\n        perror(\"Fork failed\");\n    } else if (pid == 0) {\n        // Child Process: Replace memory image with new binary\n        execvp(cmd, args);\n        perror(\"Exec failed\"); // Reached only if execvp fails\n        _exit(1);\n    } else {\n        // Parent Process: Await child termination\n        int status;\n        waitpid(pid, &status, 0);\n        if (WIFEXITED(status)) {\n            printf(\"Child process terminated with exit code: %d\\n\", WEXITSTATUS(status));\n        }\n    }\n}\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Zombie Processes:** A child process that terminates becomes a \"Zombie\" until its parent calls `wait()` or `waitpid()` to reap its exit status!\n2. **Orphan Processes:** If a parent terminates before its child, the child becomes an \"Orphan\" and is automatically adopted by the `init` / `systemd` process (PID 1).\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What does `fork()` return to the parent process versus the child process?\n  * *Answer:* Returns the Child's PID (positive integer) to the parent, and returns 0 to the child process.\n* **Q2:** Why are threads called \"lightweight processes\"?\n  * *Answer:* Because creating a thread does not allocate a new virtual memory address space, page table, or file table; it shares memory with other threads in the process."
    },
    {
      "title": "Lecture 3: CPU Scheduling Algorithms: FCFS, Round-Robin & Multilevel Queues",
      "body": "## [SLIDE 1] 🎯 CPU Scheduling & Fairness\nThe CPU scheduler decides which Ready process gets the CPU core next, balancing throughput, latency, and fairness.\n\n### 🎯 Key Learning Objectives\n* Understand Preemptive vs Non-Preemptive scheduling.\n* Master Classic Algorithms: FCFS, Shortest Job First (SJF), and Round-Robin.\n* Compute Turnaround Time, Waiting Time, and Response Time.\n\n---\n\n## [SLIDE 2] 🧠 Round-Robin Scheduling with Time Quantum (q)\n```text\nProcesses: P1 (Burst 8), P2 (Burst 4), P3 (Burst 2). Quantum q = 3.\n\nGantt Chart:\n[ P1 (3) ][ P2 (3) ][ P3 (2) ][ P1 (3) ][ P2 (1) ][ P1 (2) ]\n0        3          6         8         11        12        14\n```\n* If Quantum is too large: Degrades to FCFS.\n* If Quantum is too small: Context-switch overhead dominates execution!\n\n---\n\n## [SLIDE 3] 🏗️ Scheduling Performance Metrics\n* **Turnaround Time ($T_{\\text{tat}}$):** Completion Time - Arrival Time\n* **Waiting Time ($T_{\\text{wait}}$):** Turnaround Time - Burst Time\n* **Response Time ($T_{\\text{resp}}$):** First Execution Time - Arrival Time\n\n---\n\n## [SLIDE 4] 💻 Production Code: Round-Robin Simulation\n```python\ndef calculate_round_robin_metrics(processes: list[dict], quantum: int) -> dict:\n    # processes: [{\"id\": \"P1\", \"burst\": 8}, ...]\n    time = 0\n    queue = [p.copy() for p in processes]\n    completion_times = {}\n    \n    while queue:\n        curr = queue.pop(0)\n        exec_time = min(curr[\"burst\"], quantum)\n        curr[\"burst\"] -= exec_time\n        time += exec_time\n        \n        if curr[\"burst\"] > 0:\n            queue.append(curr)\n        else:\n            completion_times[curr[\"id\"]] = time\n            \n    return completion_times\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Convoy Effect in FCFS:** A single long CPU-bound process running ahead of short I/O-bound processes creates severe queue delays (the Convoy Effect).\n2. **Starvation in Priority / Shortest Job First:** Continuous arrivals of short jobs can permanently starve long jobs. Use **Aging** (gradually increasing process priority over wait time) to prevent starvation.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** Which scheduling algorithm is provably optimal for minimizing average waiting time?\n  * *Answer:* Shortest Job First (SJF) / Shortest Remaining Time First (SRTF).\n* **Q2:** What technique prevents indefinite starvation in priority scheduling?\n  * *Answer:* Aging (gradually increasing the priority of processes that wait in the system for a long time)."
    },
    {
      "title": "Lecture 4: Virtual Memory, Paging, Page Tables & TLB Architecture",
      "body": "## [SLIDE 1] 🎯 Virtual Memory & Memory Virtualization\nVirtual memory provides each process with the illusion of a vast, contiguous address space while mapping physical frames dynamically across RAM.\n\n### 🎯 Key Learning Objectives\n* Understand Virtual Addresses vs Physical Addresses.\n* Master Page Tables, Page Offsets, and Multi-Level Paging.\n* Master Translation Lookaside Buffer (TLB) caching and Page Faults.\n\n---\n\n## [SLIDE 2] 🧠 Virtual Address to Physical Address Translation\n```text\n32-bit Virtual Address:\n[ Virtual Page Number (20 bits) | Offset (12 bits) ]\n                 │                          │\n                 ▼ (Page Table Lookup)      │\n       Physical Frame Number (20 bits)      │\n                 │                          │\n                 ▼                          ▼\n32-bit Physical Address: [ Frame Number (20 bits) | Offset (12 bits) ]\n```\nOffset (12 bits) defines a standard 4 KB page size ($2^{12} = 4096$ bytes).\n\n---\n\n## [SLIDE 3] 🏗️ TLB (Translation Lookaside Buffer) Flow\n```text\nVirtual Address ──► Check Hardware TLB Cache\n                         ├──► TLB HIT (Fast ~1 CPU cycle!) ──► Physical Address\n                         └──► TLB MISS (Slow memory walk!)\n                                    ├──► Walk Multi-level Page Table\n                                    └──► Update TLB Cache\n```\n\n---\n\n## [SLIDE 4] 💻 Production Code: Page Table Simulation\n```python\nclass SimpleMMU:\n    PAGE_SIZE = 4096  # 4 KB\n\n    def __init__(self):\n        self.page_table = {}  # VPN -> PFN\n\n    def map_page(self, vpn: int, pfn: int):\n        self.page_table[vpn] = pfn\n\n    def translate(self, virtual_address: int) -> int:\n        vpn = virtual_address // self.PAGE_SIZE\n        offset = virtual_address % self.PAGE_SIZE\n        \n        if vpn not in self.page_table:\n            raise RuntimeError(f\"Page Fault! VPN {vpn} not mapped in physical RAM.\")\n            \n        pfn = self.page_table[vpn]\n        physical_address = (pfn * self.PAGE_SIZE) + offset\n        return physical_address\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Thrashing:** When processes do not have enough physical memory frames to hold their working sets, the OS spends more time swapping pages in/out of disk than executing instructions!\n2. **Belady's Anomaly:** In FIFO page replacement, increasing physical page frames can sometimes INCREASE the number of page faults! (LRU and optimal replacement are immune to Belady's anomaly).\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is a Page Fault?\n  * *Answer:* A hardware interrupt triggered by the MMU when a program accesses a virtual page whose valid bit is 0 (not currently present in physical RAM), causing the OS to fetch it from disk.\n* **Q2:** Why do modern 64-bit operating systems use Multi-Level Page Tables instead of a single flat table?\n  * *Answer:* A single flat page table for a 64-bit space would consume terabytes of RAM; multi-level tables allocate memory only for address regions that are actually in use."
    }
  ],
  "dailyLessons": [
    {
      "dayNumber": 1,
      "title": "OS Architecture: Hardware Rings, Dual-Mode & Traps",
      "subtasks": [
        "Explain Kernel Mode (Ring 0) vs User Mode (Ring 3) security boundaries",
        "Trace CPU hardware interrupt mechanism and interrupt vector tables",
        "Differentiate between hardware interrupts, software traps, and CPU exceptions",
        "Inspect Linux kernel version and modules using uname -r and lsmod"
      ],
      "notes": "# Dual-Mode Execution\\n\\nHardware protection rings isolate privileged kernel operations from user applications."
    },
    {
      "dayNumber": 2,
      "title": "POSIX System Calls: File Descriptors, open(), read(), write()",
      "subtasks": [
        "Open, read, and write files using raw POSIX system calls",
        "Trace system calls using strace ./my_program in Linux",
        "Inspect standard streams: stdin (0), stdout (1), stderr (2)",
        "Handle partial writes and EINTR interrupted syscalls"
      ],
      "notes": "# Low-Level System Calls\\n\\nPOSIX system calls provide the primitive API interface between applications and the kernel."
    },
    {
      "dayNumber": 3,
      "title": "Process Creation: fork(), exec(), wait() & Process Trees",
      "subtasks": [
        "Create child processes using fork() and inspect returned PIDs",
        "Replace address space images using execvp()",
        "Harvest child exit status codes with waitpid()",
        "View process tree hierarchy in terminal with pstree"
      ],
      "notes": "# Process Lifecycle\\n\\n`fork()` clones the address space; `exec()` replaces the memory image with a new binary."
    },
    {
      "dayNumber": 4,
      "title": "Process Control: Signals, kill, sigaction & Signal Handlers",
      "subtasks": [
        "Register signal handlers using sigaction() for SIGINT and SIGTERM",
        "Send signals between processes using kill() system call",
        "Explain why SIGKILL (9) and SIGSTOP cannot be caught or ignored",
        "Handle zombie process reaping asynchronously using SIGCHLD handler"
      ],
      "notes": "# POSIX Signals\\n\\nSignals deliver asynchronous software notifications to processes."
    },
    {
      "dayNumber": 5,
      "title": "Inter-Process Communication: Pipes & File Redirection",
      "subtasks": [
        "Create unidirectional byte streams between processes with pipe()",
        "Redirect stdout using dup2(pipe_fd, STDOUT_FILENO)",
        "Chain two processes together to implement command pipelines: cat | grep",
        "Close unused pipe descriptors to prevent deadlock on read"
      ],
      "notes": "# Anonymous Pipes\\n\\nPipes buffer byte streams between cooperating processes via kernel memory."
    },
    {
      "dayNumber": 6,
      "title": "Unix Shell Milestone",
      "subtasks": [
        "Implement command parsing and tokenization loop",
        "Support pipeline execution (|) and output redirection (>)",
        "Implement built-in commands (cd, exit)",
        "Complete Week 1 Project: Interactive Unix Shell in C with Pipelines"
      ],
      "notes": "# Shell Project Review\\n\\nBuilding a shell provides deep, permanent intuition for processes, file descriptors, and IPC."
    },
    {
      "dayNumber": 7,
      "title": "CPU Scheduling: First-Come First-Served & Shortest Job First",
      "subtasks": [
        "Calculate turnaround time and waiting time for FCFS schedules",
        "Demonstrate the Convoy Effect mathematically",
        "Implement Shortest Job First (SJF) and prove its optimality",
        "Analyze starvation risks on continuous arrivals of short jobs"
      ],
      "notes": "# Non-Preemptive Scheduling\\n\\nSJF minimizes average waiting time but requires prior knowledge of burst durations."
    },
    {
      "dayNumber": 8,
      "title": "Preemptive Scheduling: Round Robin & Multilevel Feedback Queues",
      "subtasks": [
        "Simulate Round-Robin execution with variable time quantums",
        "Evaluate trade-offs between context switch overhead and response time",
        "Design Multilevel Feedback Queue (MLFQ) with dynamic priority decay",
        "Observe interactive vs batch process prioritization"
      ],
      "notes": "# Preemptive CPU Scheduling\\n\\nRound-Robin guarantees bounded response times across all ready processes."
    },
    {
      "dayNumber": 9,
      "title": "Process Synchronization: Critical Sections & Race Conditions",
      "subtasks": [
        "Demonstrate race conditions on shared counters in multi-threaded C",
        "Define 3 requirements for critical sections: Mutual Exclusion, Progress, Bounded Waiting",
        "Implement Peterson's algorithm for two processes",
        "Analyze hardware atomic instructions (Test-and-Set, Compare-and-Swap)"
      ],
      "notes": "# Critical Section Problem\\n\\nSynchronization guarantees race-free mutations across concurrent execution paths."
    },
    {
      "dayNumber": 10,
      "title": "Synchronization Primitives: Mutexes, Semaphores & Condition Variables",
      "subtasks": [
        "Protect critical sections using pthread_mutex_lock and unlock",
        "Implement counting semaphore with sem_wait and sem_post",
        "Coordinate producer-consumer buffer with condition variables",
        "Prevent busy waiting using sleeping synchronization locks"
      ],
      "notes": "# Mutexes & Semaphores\\n\\nSemaphores manage shared resource pools; mutexes provide mutual exclusion."
    },
    {
      "dayNumber": 11,
      "title": "Deadlocks: 4 Coffman Conditions & Prevention Strategies",
      "subtasks": [
        "Identify 4 Coffman conditions: Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait",
        "Construct Resource Allocation Graphs (RAG) and detect cycles",
        "Simulate Banker's Algorithm for deadlock avoidance",
        "Implement lock ordering to eliminate circular wait deadlocks"
      ],
      "notes": "# Deadlocks\\n\\nEliminating circular wait via strict hierarchical lock ordering prevents deadlocks."
    },
    {
      "dayNumber": 12,
      "title": "CPU Scheduler Simulation Milestone",
      "subtasks": [
        "Build discrete event scheduler supporting FCFS, Round-Robin, and Priority",
        "Compute and display comparative performance metrics",
        "Plot Gantt chart visualizations of CPU execution intervals",
        "Complete Week 2 Project: Multi-Threaded Round-Robin & Priority CPU Scheduler"
      ],
      "notes": "# Scheduling Review\\n\\nSimulating schedulers reinforces trade-offs between throughput, fairness, and latency."
    },
    {
      "dayNumber": 13,
      "title": "Memory Management: Contiguous Allocation & Fragmentation",
      "subtasks": [
        "Differentiate internal fragmentation vs external fragmentation",
        "Simulate memory placement algorithms: First Fit, Best Fit, Worst Fit",
        "Explain memory compaction costs and address translation limits",
        "Analyze hardware Memory Management Unit (MMU) base and limit registers"
      ],
      "notes": "# Contiguous Allocation\\n\\nExternal fragmentation occurs when free memory is fragmented into non-contiguous slices."
    },
    {
      "dayNumber": 14,
      "title": "Paging & Multi-Level Page Tables",
      "subtasks": [
        "Divide virtual memory into pages and physical RAM into frames",
        "Calculate Virtual Page Number (VPN) and Offset from 32-bit and 64-bit addresses",
        "Construct 2-level page table structure in C",
        "Compute memory space savings of sparse multi-level page tables"
      ],
      "notes": "# Paging Mechanics\\n\\nPaging eliminates external fragmentation by mapping uniform fixed-size memory blocks."
    },
    {
      "dayNumber": 15,
      "title": "TLB Hardware & Translation Performance",
      "subtasks": [
        "Trace TLB lookup and calculate Effective Memory Access Time (EMAT)",
        "Simulate TLB misses and page table memory walks",
        "Explain TLB invalidation on process context switches",
        "Measure TLB reach with Huge Pages (2 MB / 1 GB pages)"
      ],
      "notes": "# The TLB Cache\\n\\nTLB caches virtual-to-physical address mappings for single-cycle memory translations."
    },
    {
      "dayNumber": 16,
      "title": "Page Replacement Algorithms: FIFO, LRU & Clock Algorithm",
      "subtasks": [
        "Simulate FIFO page replacement and observe Belady's Anomaly",
        "Implement Least Recently Used (LRU) page replacement using hash map and linked list",
        "Implement Second-Chance / Clock page replacement using reference bits",
        "Compare page fault rates across algorithms on realistic memory traces"
      ],
      "notes": "# Page Replacement\\n\\nThe Clock algorithm approximates LRU with minimal hardware reference bit overhead."
    },
    {
      "dayNumber": 17,
      "title": "Virtual Memory Paging Simulator Milestone",
      "subtasks": [
        "Implement MMU simulation reading memory trace files",
        "Track page hits, page faults, and TLB hit ratios",
        "Export comparative benchmark report across replacement algorithms",
        "Complete Week 3 Project: Virtual Memory Paging Simulator"
      ],
      "notes": "# Paging Milestone Review\\n\\nVirtual memory is the cornerstone of modern multitasking operating systems."
    },
    {
      "dayNumber": 18,
      "title": "File Systems: Inodes, Superblocks & Directory Structures",
      "subtasks": [
        "Inspect inode metadata using stat and ls -i on Linux",
        "Understand direct, indirect, doubly-indirect, and triply-indirect block pointers",
        "Compare hard links (link) vs symbolic/soft links (symlink)",
        "Examine superblock backup redundancy in ext4 filesystems"
      ],
      "notes": "# Inode Architecture\\n\\nInodes store file metadata and data block pointers independently of filenames."
    },
    {
      "dayNumber": 19,
      "title": "File Allocation & Free Space Management",
      "subtasks": [
        "Compare contiguous, linked-list, and indexed file allocation",
        "Manage free disk blocks using Bitmaps and Free Space Lists",
        "Calculate maximum addressable file sizes under 32-bit block pointers",
        "Analyze journaled file systems (ext4, NTFS) for crash recovery"
      ],
      "notes": "# Disk Allocation\\n\\nJournaling logs filesystem metadata changes before writing to disk, preventing corruption on sudden crashes."
    },
    {
      "dayNumber": 20,
      "title": "I/O Hardware & Disk Scheduling",
      "subtasks": [
        "Understand Polling vs Interrupt-Driven I/O vs Direct Memory Access (DMA)",
        "Trace DMA transfer cycles between disk controller and RAM",
        "Simulate disk scheduling algorithms: FCFS, SSTF, SCAN (Elevator), C-SCAN",
        "Calculate total disk head movement"
      ],
      "notes": "# I/O Architecture\\n\\nDMA transfers data blocks directly between devices and memory without CPU intervention."
    },
    {
      "dayNumber": 21,
      "title": "Virtual File System (VFS) & Device Drivers",
      "subtasks": [
        "Explore Linux VFS abstraction layer (dentry, inode, file, superblock structs)",
        "Differentiate block devices (/dev/sda) vs character devices (/dev/tty, /dev/urandom)",
        "Write a basic Linux kernel loadable module (LKM) template",
        "Read kernel log ring buffer using dmesg"
      ],
      "notes": "# The Virtual File System (VFS)\\n\\nVFS provides a unified POSIX interface over diverse underlying filesystems."
    },
    {
      "dayNumber": 22,
      "title": "Operating System Security: Access Control & Capabilities",
      "subtasks": [
        "Examine Unix file permission bits (rwxrwxrwx, setuid, setgid)",
        "Audit setuid binaries and understand privilege escalation risks",
        "Explore Linux capabilities (cap_net_bind_service) vs root user",
        "Understand sandboxing mechanisms: chroot, namespaces, and cgroups"
      ],
      "notes": "# OS Security\\n\\nLinux namespaces and cgroups form the kernel foundation of modern container engines (Docker)."
    },
    {
      "dayNumber": 23,
      "title": "Containers, Namespaces & Cgroups (OS Virtualization)",
      "subtasks": [
        "Create an isolated process tree using unshare --pid --fork",
        "Constrain memory and CPU quotas using Linux cgroups v2",
        "Mount an isolated root filesystem using pivot_root",
        "Build a container from scratch using bash and kernel primitives"
      ],
      "notes": "# Container Virtualization\\n\\nContainers are regular Linux processes isolated via kernel namespaces and constrained by cgroups."
    },
    {
      "dayNumber": 24,
      "title": "Operating Systems Capstone: Micro-Kernel File System",
      "subtasks": [
        "Implement user-space virtual file system with superblock and inodes",
        "Support file creation, directory traversal, reading, and writing",
        "Verify clean memory management and zero memory leaks with Valgrind",
        "Complete Week 4 Capstone: Micro-Kernel File System & Directory Inode Parser"
      ],
      "notes": "# Systems Mastery\\n\\nCongratulations! You have mastered OS kernel architecture, scheduling, virtual memory, and filesystems."
    }
  ]
};
