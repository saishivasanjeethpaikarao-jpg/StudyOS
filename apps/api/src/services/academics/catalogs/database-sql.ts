import type { SubjectCurriculumPackage } from '../types.js';

export const databaseSqlPackage: SubjectCurriculumPackage = {
  "id": "database-sql",
  "aliases": [
    "sql",
    "database",
    "postgres",
    "postgresql",
    "rdbms",
    "mysql",
    "relational database"
  ],
  "subject": {
    "name": "SQL & Relational Database Engineering",
    "description": "Relational modeling, complex queries, window functions, indexing (B-Trees), query planning, ACID transactions, and normalization.",
    "color": "#0284C7",
    "icon": "database"
  },
  "assignments": [
    {
      "title": "Week 1 Project: Normalized E-Commerce Schema (3NF) & DDL Scripting",
      "description": "Design and implement a fully normalized 3NF relational database schema in PostgreSQL with foreign keys, checks, enums, and timestamps.",
      "daysDue": 7
    },
    {
      "title": "Week 2 Project: Analytical Reporting Engine with Window Functions & CTEs",
      "description": "Construct advanced analytical reporting queries using Common Table Expressions (CTEs), ROW_NUMBER(), RANK(), DENSE_RANK(), and running totals.",
      "daysDue": 14
    },
    {
      "title": "Week 3 Project: Query Optimization & B-Tree Index Performance Tuning",
      "description": "Analyze slow queries on a 1-million-row dataset using EXPLAIN ANALYZE; eliminate sequential table scans using composite B-Tree indexes.",
      "daysDue": 21
    },
    {
      "title": "Week 4 Capstone: ACID Concurrent Banking Ledger with Row-Level Locking",
      "description": "Implement a fault-tolerant banking transaction engine with isolation levels (Read Committed vs Serializable) and SELECT FOR UPDATE locking.",
      "daysDue": 28
    }
  ],
  "resources": [
    {
      "type": "youtube",
      "title": "SQL Tutorial - Full Database Course for Beginners (freeCodeCamp)",
      "url": "https://www.youtube.com/watch?v=HXV3zeQKqGY",
      "providerItemId": "HXV3zeQKqGY"
    },
    {
      "type": "youtube",
      "title": "SQL Course for Beginners [Full Course] (Programming with Mosh)",
      "url": "https://www.youtube.com/watch?v=7S_tz1z_5bA",
      "providerItemId": "7S_tz1z_5bA"
    },
    {
      "type": "web",
      "title": "PostgreSQL Official Documentation & Manual",
      "url": "https://www.postgresql.org/docs/current/",
      "providerItemId": null
    },
    {
      "type": "web",
      "title": "Use The Index, Luke! - Guide to Database Performance for Developers",
      "url": "https://use-the-index-luke.com/",
      "providerItemId": null
    }
  ],
  "lectureDecks": [
    {
      "title": "Lecture 1: The Relational Model, PostgreSQL & Query Execution Pipeline",
      "body": "## [SLIDE 1] 🎯 Course Objectives & The Relational Engine\nRelational databases remain the backbone of the global digital economy, storing critical financial transactions, inventory, and identity records with mathematical integrity.\n\n### 🎯 Key Learning Objectives\n* Understand Codd's Relational Algebra: Relations, Tuples, and Attributes.\n* Trace the PostgreSQL Query Execution Pipeline: Parser $\\to$ Planner $\\to$ Executor.\n* Master DDL vs DML commands and strict schema constraints.\n\n💡 **Professor's Tip:** SQL is a **declarative** language—you describe *what* data you want; the database query optimizer figures out *how* to retrieve it efficiently!\n\n---\n\n## [SLIDE 2] 🧠 PostgreSQL Query Execution Pipeline\n```text\nSQL Query: SELECT * FROM users WHERE status = 'active'\n      │\n      ▼ 1. Parser & Lexer\nAbstract Syntax Tree (AST) & Parse Tree\n      │\n      ▼ 2. Query Rewriter\nApplies views, rules, and security constraints\n      │\n      ▼ 3. Query Planner / Cost-Based Optimizer\nEvaluates index scans, sequential scans, hash joins, and calculates cost (disk I/O + CPU)\n      │\n      ▼ 4. Execution Engine\nFetches blocks from Buffer Pool (Shared Memory) or Storage Engine\n      │\nReturns Rows to Client\n```\n\n---\n\n## [SLIDE 3] 🏗️ Relational Integrity Constraints\n| Constraint | Purpose | Example |\n| :--- | :--- | :--- |\n| **PRIMARY KEY** | Uniquely identifies each row; enforces NOT NULL and UNIQUE | `id UUID PRIMARY KEY` |\n| **FOREIGN KEY** | Guarantees referential integrity across related tables | `user_id UUID REFERENCES users(id)` |\n| **CHECK** | Restricts column values to boolean predicates | `CHECK (price >= 0)` |\n| **UNIQUE** | Prevents duplicate column values | `email VARCHAR(255) UNIQUE` |\n\n---\n\n## [SLIDE 4] 💻 Production Code: High-Integrity Table Schema\n```sql\nCREATE TABLE courses (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    code VARCHAR(16) NOT NULL UNIQUE,\n    title VARCHAR(120) NOT NULL,\n    credits INTEGER NOT NULL CHECK (credits BETWEEN 1 AND 6),\n    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),\n    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()\n);\n\nCREATE TABLE enrollments (\n    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,\n    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),\n    grade NUMERIC(3, 2) CHECK (grade BETWEEN 0.00 AND 4.00),\n    CONSTRAINT unique_student_course UNIQUE (student_id, course_id)\n);\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **NULL Comparison with `=`:** In SQL, `NULL = NULL` evaluates to `UNKNOWN`, NOT `TRUE`! Always use `IS NULL` and `IS NOT NULL`.\n2. **Missing Foreign Key Indexes:** PostgreSQL does NOT automatically create indexes on foreign key columns! Without an index on `enrollments(student_id)`, querying student enrollments or deleting users triggers a full table scan.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the difference between `WHERE` and `HAVING` in SQL?\n  * *Answer:* `WHERE` filters individual rows before grouping; `HAVING` filters aggregated groups after the `GROUP BY` operation.\n* **Q2:** What does `ON DELETE CASCADE` do on a foreign key?\n  * *Answer:* Automatically deletes all referencing child rows when the parent referenced row is deleted."
    },
    {
      "title": "Lecture 2: Advanced Joins, Set Operations & Aggregations",
      "body": "## [SLIDE 1] 🎯 Combining Relations & Aggregating Data\nRelational databases shine when querying multiple interconnected tables through deterministic relational joins.\n\n### 🎯 Key Learning Objectives\n* Master Join Semantics: INNER, LEFT, RIGHT, FULL OUTER, and CROSS joins.\n* Execute Aggregations with `GROUP BY` and `HAVING`.\n* Understand Set Operations: `UNION`, `INTERSECT`, and `EXCEPT`.\n\n---\n\n## [SLIDE 2] 🧠 Relational Join Venn Diagrams\n```text\n  Table A         Table B\n ╭───────╮       ╭───────╮\n │       │ ╭───╮ │       │\n │ A only│ │A∩B│ │ B only│\n │       │ ╰───╯ │       │\n ╰───────╯       ╰───────╯\n* INNER JOIN: Returns only intersection (A ∩ B)\n* LEFT JOIN:  Returns entire Table A + matched B (A only + A ∩ B)\n* FULL JOIN:  Returns all records from both tables (A ∪ B)\n```\n\n---\n\n## [SLIDE 3] 🏗️ Join Algorithms Inside the Engine\n| Join Engine | When the Planner Uses It | Complexity |\n| :--- | :--- | :--- |\n| **Nested Loop Join** | One small table and an index on the other table | $O(N \\log M)$ |\n| **Hash Join** | Large equality joins without indexes | $O(N + M)$ |\n| **Merge Join** | Both tables are already sorted on join keys | $O(N + M)$ |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Aggregated Multi-Table Query\n```sql\nSELECT \n    c.title AS course_title,\n    c.code,\n    COUNT(e.id) AS total_enrolled,\n    ROUND(AVG(e.grade), 2) AS average_grade,\n    MAX(e.grade) AS highest_grade\nFROM courses c\nLEFT JOIN enrollments e ON c.id = e.course_id\nWHERE c.status = 'active'\nGROUP BY c.id, c.title, c.code\nHAVING COUNT(e.id) >= 5\nORDER BY average_grade DESC;\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Filtering in `WHERE` on a LEFT JOIN:** Placing a filter condition on the right table in the `WHERE` clause (`WHERE b.status = 'active'`) accidentally converts the LEFT JOIN into an INNER JOIN, because NULL rows are discarded! Move conditions on the right table into the `ON` clause.\n2. **`UNION` vs `UNION ALL`:** `UNION` performs an expensive sort to deduplicate rows across queries; `UNION ALL` concatenates results directly without sorting overhead.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** When should you use `UNION ALL` instead of `UNION`?\n  * *Answer:* When duplicate rows are acceptable or impossible, because `UNION ALL` avoids the CPU and memory cost of deduplication sorting.\n* **Q2:** What happens when an aggregate function like `AVG(score)` encounters `NULL` values in a column?\n  * *Answer:* Aggregate functions automatically ignore `NULL` values when calculating totals and averages (unlike `COUNT(*)` which counts all rows)."
    },
    {
      "title": "Lecture 3: Window Functions & Common Table Expressions (CTEs)",
      "body": "## [SLIDE 1] 🎯 Analytical Power with Window Functions\nWindow functions perform calculations across a set of table rows that are related to the current row, without collapsing rows like `GROUP BY` does!\n\n### 🎯 Key Learning Objectives\n* Understand the `OVER (PARTITION BY ... ORDER BY ...)` clause.\n* Master Ranking Functions: `ROW_NUMBER()`, `RANK()`, and `DENSE_RANK()`.\n* Compute Running Totals, Moving Averages, and Lag/Lead temporal trends.\n* Structure complex analytical queries using Common Table Expressions (CTEs).\n\n---\n\n## [SLIDE 2] 🧠 Window Function Processing Pipeline\n```text\nRow 1: [ Engineering | Alice | $120k ] ──► Rank: 1  (Within Engineering partition)\nRow 2: [ Engineering | Bob   | $110k ] ──► Rank: 2\nRow 3: [ Marketing   | Carol | $95k  ] ──► Rank: 1  (Within Marketing partition)\n```\nEvery original row is preserved; analytical metrics are appended as new columns!\n\n---\n\n## [SLIDE 3] 🏗️ Ranking Functions Compared\n| Function | Ties Behavior | Example Sequence |\n| :--- | :--- | :--- |\n| **`ROW_NUMBER()`** | Strict unique sequential integers | 1, 2, 3, 4 |\n| **`RANK()`** | Leaves gaps after ties | 1, 2, 2, 4 |\n| **`DENSE_RANK()`** | Never leaves gaps after ties | 1, 2, 2, 3 |\n\n---\n\n## [SLIDE 4] 💻 Production Code: Top Students Per Course with CTE\n```sql\nWITH RankedStudentGrades AS (\n    SELECT \n        e.course_id,\n        u.name AS student_name,\n        e.grade,\n        ROW_NUMBER() OVER(\n            PARTITION BY e.course_id \n            ORDER BY e.grade DESC, e.enrolled_at ASC\n        ) AS class_rank\n    FROM enrollments e\n    JOIN users u ON e.student_id = u.id\n    WHERE e.grade IS NOT NULL\n)\nSELECT \n    course_id,\n    class_rank,\n    student_name,\n    grade\nFROM RankedStudentGrades\nWHERE class_rank <= 3\nORDER BY course_id, class_rank;\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Using Window Functions in `WHERE` Clauses:** Window functions execute AFTER the `WHERE` and `HAVING` clauses! You cannot write `WHERE ROW_NUMBER() = 1`. You MUST wrap the query in a CTE or subquery first!\n2. **Default Window Frame:** In `OVER (ORDER BY date)`, the default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, which computes a cumulative running sum rather than the total partition sum.\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What is the fundamental difference between `GROUP BY` and a window function?\n  * *Answer:* `GROUP BY` collapses multiple rows into a single summary row; window functions compute values across partitions while preserving all original rows.\n* **Q2:** What does `LAG(salary, 1) OVER (ORDER BY year)` do?\n  * *Answer:* Accesses the `salary` value from the immediately preceding row in the partition."
    },
    {
      "title": "Lecture 4: Database Internals: B-Tree Indexes, EXPLAIN ANALYZE & ACID",
      "body": "## [SLIDE 1] 🎯 Performance Engineering & Index Internals\nWithout indexes, finding a record requires scanning every disk page in the table ($O(N)$ Sequential Scan). Indexes provide $O(\\log N)$ balanced search trees.\n\n### 🎯 Key Learning Objectives\n* Understand B-Tree Index architecture: Root, Internal nodes, and Leaf pages.\n* Decipher query plans using `EXPLAIN (ANALYZE, BUFFERS)`.\n* Master ACID Guarantees: Atomicity, Consistency, Isolation, and Durability.\n* Mitigate Concurrency Anomalies: Dirty Reads, Non-Repeatable Reads, and Phantom Reads.\n\n---\n\n## [SLIDE 2] 🧠 B-Tree Index Hierarchy\n```text\n                      [ Root Node: 50 | 100 ]\n                     /           |           \\\n    [ Internal: 20 | 35 ]  [ Internal: 70 ]  [ Internal: 120 | 150 ]\n        /      |      \\\n   [ Leaf Page: 1, 5, 20 ] ──► Points to physical disk Heap Tuple ID (ctid)!\n```\nTraversing a 10-million-row B-tree takes only 3 to 4 page reads!\n\n---\n\n## [SLIDE 3] 🏗️ ACID Transaction Properties\n* **Atomicity:** All operations succeed, or all roll back (All-or-Nothing).\n* **Consistency:** Data must satisfy all schema constraints before and after commit.\n* **Isolation:** Concurrent transactions cannot see uncommitted changes.\n* **Durability:** Committed transactions survive sudden power loss via Write-Ahead Logging (WAL).\n\n---\n\n## [SLIDE 4] 💻 Production Code: Safe Atomic Transfer with Row Locking\n```sql\nBEGIN;\n\n-- Lock specific rows to prevent concurrent balance overdrafts\nSELECT balance FROM bank_accounts WHERE id = 'acc_101' FOR UPDATE;\n\nUPDATE bank_accounts SET balance = balance - 500.00 WHERE id = 'acc_101';\nUPDATE bank_accounts SET balance = balance + 500.00 WHERE id = 'acc_202';\n\nINSERT INTO transfer_audit_log (sender_id, receiver_id, amount) \nVALUES ('acc_101', 'acc_202', 500.00);\n\nCOMMIT;\n```\n\n---\n\n## [SLIDE 5] ⚠️ Exam Traps & Common Gotchas\n1. **Index Ignored Due to Function Wrapping:** Writing `WHERE LOWER(email) = 'user@example.com'` ignores standard B-tree indexes on `email` because the function alters the search key! You must create a functional index: `CREATE INDEX ON users(LOWER(email))`.\n2. **Left-to-Right Composite Index Rule:** An index on `(last_name, first_name)` accelerates queries on `last_name` and `(last_name, first_name)`, but CANNOT be used efficiently for queries filtering only by `first_name`!\n\n---\n\n## [SLIDE 6] 📝 Quick Self-Assessment Quiz\n* **Q1:** What does `SELECT ... FOR UPDATE` do?\n  * *Answer:* Acquires exclusive row-level locks on the selected rows, blocking other transactions from modifying or locking them until the current transaction completes.\n* **Q2:** What does the Write-Ahead Log (WAL) do in PostgreSQL?\n  * *Answer:* Records database changes to disk sequentially before data pages are written to tables, ensuring crash recovery and durability."
    }
  ],
  "dailyLessons": [
    {
      "dayNumber": 1,
      "title": "SQL Foundations: Relational Theory, Tables, DDL & DML",
      "subtasks": [
        "Create tables with typed columns (VARCHAR, INTEGER, BOOLEAN, TIMESTAMPTZ)",
        "Enforce PRIMARY KEY, NOT NULL, and DEFAULT constraints",
        "Insert, update, and delete records with standard DML statements",
        "Inspect table structure and schemas using psql \\d commands"
      ],
      "notes": "# Relational Foundations\\n\\nRelational tables organize data into structured tuples with strict typing constraints."
    },
    {
      "dayNumber": 2,
      "title": "Data Integrity: Foreign Keys, Unique & Check Constraints",
      "subtasks": [
        "Enforce referential integrity with FOREIGN KEY constraints",
        "Configure ON DELETE CASCADE and ON DELETE RESTRICT cascades",
        "Validate column ranges using CHECK constraints",
        "Enforce business uniqueness using composite UNIQUE constraints"
      ],
      "notes": "# Constraints & Integrity\\n\\nConstraints guarantee data validity at the database engine level."
    },
    {
      "dayNumber": 3,
      "title": "SQL Filtering: WHERE, Operators, LIKE & NULL Semantics",
      "subtasks": [
        "Filter records using comparison, logical (AND, OR, NOT), and IN operators",
        "Perform pattern matching using LIKE, ILIKE, and regular expressions (~)",
        "Demonstrate three-valued logic (TRUE, FALSE, UNKNOWN) with NULL",
        "Replace NULL values using COALESCE() and NULLIF()"
      ],
      "notes": "# Query Filtering\\n\\nSQL uses three-valued logic; always test for nullability with `IS NULL`."
    },
    {
      "dayNumber": 4,
      "title": "SQL Joins: INNER, LEFT, RIGHT & FULL OUTER Joins",
      "subtasks": [
        "Join tables on foreign key relations with INNER JOIN",
        "Retrieve unmatched parent rows using LEFT OUTER JOIN",
        "Combine all records from both relations with FULL OUTER JOIN",
        "Prevent accidental Cartesian products by asserting explicit join predicates"
      ],
      "notes": "# Relational Joins\\n\\nJoins correlate related records across tables using relational algebra."
    },
    {
      "dayNumber": 5,
      "title": "SQL Aggregations: GROUP BY, HAVING, COUNT, SUM & AVG",
      "subtasks": [
        "Aggregate records into groups using GROUP BY",
        "Filter summarized groups using HAVING clauses",
        "Calculate counts (COUNT(*), COUNT(DISTINCT col)) and statistical averages",
        "Explain why columns in SELECT must appear in GROUP BY or aggregate functions"
      ],
      "notes": "# Aggregations\\n\\n`GROUP BY` collapses records into summary rows; `HAVING` filters the resulting groups."
    },
    {
      "dayNumber": 6,
      "title": "Normalized E-Commerce Schema Milestone",
      "subtasks": [
        "Design 3NF schema for customers, orders, order_items, and products",
        "Write idempotent migration script with CREATE TABLE IF NOT EXISTS",
        "Populate database with realistic test seed records",
        "Complete Week 1 Project: Normalized E-Commerce Schema & DDL Scripting"
      ],
      "notes": "# Schema Design Review\\n\\nThird Normal Form (3NF) eliminates data redundancy and prevents update anomalies."
    },
    {
      "dayNumber": 7,
      "title": "Subqueries: Scalar, Correlated & Subqueries in FROM/WHERE",
      "subtasks": [
        "Write scalar subqueries returning single values in SELECT and WHERE",
        "Construct correlated subqueries that reference outer query aliases",
        "Use EXISTS and NOT EXISTS for efficient existence checks",
        "Compare performance of IN vs EXISTS on nullable columns"
      ],
      "notes": "# Subqueries\\n\\nCorrelated subqueries execute once per outer row; `EXISTS` short-circuits on the first match."
    },
    {
      "dayNumber": 8,
      "title": "Common Table Expressions (CTEs): WITH Clause & Readability",
      "subtasks": [
        "Deconstruct complex multi-stage queries into readable CTEs using WITH",
        "Chain multiple CTEs sequentially to transform data in pipelines",
        "Compare CTE materialization behavior in PostgreSQL 12+",
        "Refactor nested subqueries into modular CTE steps"
      ],
      "notes": "# Common Table Expressions\\n\\nCTEs improve query readability and modularity."
    },
    {
      "dayNumber": 9,
      "title": "Recursive CTEs: Hierarchical Trees & Graphs",
      "subtasks": [
        "Understand recursive CTE structure: Anchor member UNION ALL Recursive member",
        "Traverse organizational hierarchies (employee $\\to$ manager tree)",
        "Traverse graph paths and bill-of-materials dependencies",
        "Prevent infinite recursion loops with termination conditions"
      ],
      "notes": "# Recursive Queries\\n\\nRecursive CTEs traverse arbitrary tree hierarchies and graphs in SQL."
    },
    {
      "dayNumber": 10,
      "title": "Window Functions: OVER, PARTITION BY & ORDER BY",
      "subtasks": [
        "Calculate partition summaries without collapsing rows using OVER(PARTITION BY)",
        "Compute cumulative running totals using ORDER BY inside window specifications",
        "Calculate moving averages across sliding frame boundaries",
        "Compare window function performance vs self-joins"
      ],
      "notes": "# Window Specifications\\n\\nWindow functions compute analytical metrics while preserving all individual rows."
    },
    {
      "dayNumber": 11,
      "title": "Ranking Functions: ROW_NUMBER, RANK, DENSE_RANK & NTILE",
      "subtasks": [
        "Deduplicate records by keeping ROW_NUMBER() = 1 in subqueries",
        "Rank sales performance with RANK() and DENSE_RANK()",
        "Partition data into quartiles and deciles using NTILE()",
        "Access adjacent row values with LAG() and LEAD()"
      ],
      "notes": "# Analytical Ranking\\n\\n`ROW_NUMBER()` provides strict sequence numbering; `RANK()` leaves gaps after ties."
    },
    {
      "dayNumber": 12,
      "title": "Analytical Reporting Engine Milestone",
      "subtasks": [
        "Generate multi-month cohort retention report",
        "Calculate month-over-month revenue growth using LAG()",
        "Identify top 3 selling products per category using DENSE_RANK()",
        "Complete Week 2 Project: Analytical Reporting Engine with Window Functions"
      ],
      "notes": "# Analytics Review\\n\\nWindow functions and CTEs provide SQL-native Business Intelligence analytics."
    },
    {
      "dayNumber": 13,
      "title": "Database Indexing: B-Tree Indexes & Table Scans",
      "subtasks": [
        "Inspect table storage pages and tuples using psql",
        "Create B-Tree index on high-cardinality search columns",
        "Observe query plan transitions from Seq Scan to Index Scan",
        "Calculate index storage disk overhead using pg_size_pretty"
      ],
      "notes": "# B-Tree Indexes\\n\\nB-Trees reduce row search complexity from $O(N)$ sequential scans to $O(\\log N)$."
    },
    {
      "dayNumber": 14,
      "title": "Composite Indexes & Covering Indexes (Index-Only Scans)",
      "subtasks": [
        "Create composite index on multiple columns (col_a, col_b)",
        "Verify left-to-right prefix matching rule",
        "Build covering index with INCLUDE clause to achieve Index-Only Scan",
        "Avoid over-indexing write-heavy transactional tables"
      ],
      "notes": "# Covering Indexes\\n\\nIndex-Only scans satisfy queries directly from index leaf pages without visiting table heap pages."
    },
    {
      "dayNumber": 15,
      "title": "Query Optimization: EXPLAIN (ANALYZE, BUFFERS)",
      "subtasks": [
        "Read query plans: costs, actual time, loops, and rows returned",
        "Measure disk read hits vs cache hits using BUFFERS option",
        "Identify estimation skew between planner estimates and actual rows",
        "Update database statistics manually using ANALYZE table_name"
      ],
      "notes": "# EXPLAIN ANALYZE\\n\\nQuery plans display the cost estimates, join algorithms, and buffer usage."
    },
    {
      "dayNumber": 16,
      "title": "Partial Indexes, Expression Indexes & Full-Text Search",
      "subtasks": [
        "Create partial index filtering active records (WHERE status = 'active')",
        "Create expression index for case-insensitive search (LOWER(email))",
        "Implement full-text search with tsvector and tsquery",
        "Create GIN (Generalized Inverted Index) on JSONB and text columns"
      ],
      "notes": "# Specialized Indexes\\n\\nPartial indexes minimize index size by indexing only active or relevant rows."
    },
    {
      "dayNumber": 17,
      "title": "Query Optimization Milestone",
      "subtasks": [
        "Seed 500,000 synthetic records and measure unindexed query latency",
        "Optimize slow query plan from 850ms down to sub-10ms using composite index",
        "Verify elimination of disk-based external sorts with work_mem tuning",
        "Complete Week 3 Project: Query Optimization & B-Tree Index Tuning"
      ],
      "notes": "# Performance Review\\n\\nTargeted indexes and query rewriting dramatically improve database throughput."
    },
    {
      "dayNumber": 18,
      "title": "Transactions & ACID Guarantees: BEGIN, COMMIT, ROLLBACK",
      "subtasks": [
        "Execute multi-statement transactions atomically",
        "Roll back transaction state on error with ROLLBACK",
        "Create partial transaction checkpoints using SAVEPOINT",
        "Understand Write-Ahead Logging (WAL) for durability"
      ],
      "notes": "# Transactions & ACID\\n\\nTransactions ensure all changes commit together or leave the database completely unaltered."
    },
    {
      "dayNumber": 19,
      "title": "Transaction Isolation Levels: Read Committed to Serializable",
      "subtasks": [
        "Compare Read Committed, Repeatable Read, and Serializable levels",
        "Simulate non-repeatable read anomalies across two concurrent sessions",
        "Simulate phantom read anomalies on range queries",
        "Inspect PostgreSQL Multi-Version Concurrency Control (MVCC) mechanics"
      ],
      "notes": "# Isolation Levels\\n\\nPostgreSQL uses MVCC so readers never block writers and writers never block readers."
    },
    {
      "dayNumber": 20,
      "title": "Concurrency Control: Row-Level Locking & Deadlocks",
      "subtasks": [
        "Lock rows explicitly using SELECT ... FOR UPDATE",
        "Acquire share locks using SELECT ... FOR SHARE",
        "Trigger concurrent deadlock intentionally and inspect error 40P01",
        "Prevent deadlocks by sorting resource IDs before locking"
      ],
      "notes": "# Row Locking\\n\\nRow-level locks prevent concurrent double-spending and inventory over-allocations."
    },
    {
      "dayNumber": 21,
      "title": "JSONB in PostgreSQL: Document Storage in Relational DB",
      "subtasks": [
        "Store semi-structured payloads in JSONB columns",
        "Query JSON fields using arrow operators (->, ->>)",
        "Filter records using JSON containment operator (@>)",
        "Index JSONB keys using GIN indexes"
      ],
      "notes": "# JSONB in PostgreSQL\\n\\nJSONB combines the schema flexibility of document databases with relational ACID guarantees."
    },
    {
      "dayNumber": 22,
      "title": "Database Normalization: 1NF, 2NF, 3NF & BCNF",
      "subtasks": [
        "Eliminate repeating groups for First Normal Form (1NF)",
        "Eliminate partial functional dependencies for Second Normal Form (2NF)",
        "Eliminate transitive dependencies for Third Normal Form (3NF)",
        "Analyze intentional denormalization trade-offs for high-volume analytics"
      ],
      "notes": "# Normalization Rules\\n\\nNormalization decomposes tables to ensure every non-key attribute depends on the key, the whole key, and nothing but the key."
    },
    {
      "dayNumber": 23,
      "title": "Database Migrations & Schema Versioning",
      "subtasks": [
        "Write backward-compatible zero-downtime database migrations",
        "Manage migrations using Drizzle ORM / Flyway",
        "Add NOT NULL columns safely with default values in production",
        "Audit schema evolution and rollback procedures"
      ],
      "notes": "# Migrations\\n\\nProduction schema changes require zero-downtime migration patterns."
    },
    {
      "dayNumber": 24,
      "title": "ACID Banking Ledger Capstone & Final Review",
      "subtasks": [
        "Implement double-entry bookkeeping ledger with strict balance constraints",
        "Verify concurrent transaction safety under high multi-threaded load",
        "Export final comprehensive SQL certification summary",
        "Complete Week 4 Capstone: ACID Concurrent Banking Ledger with Row Locking"
      ],
      "notes": "# SQL Mastery\\n\\nCongratulations! You have mastered SQL, relational modeling, performance indexing, and ACID concurrency."
    }
  ]
};
