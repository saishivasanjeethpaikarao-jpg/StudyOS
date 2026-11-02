# StudyOS AI Study Planner (Phase 7)

Phase 7 implements the multi-provider AI subsystem for StudyOS. It introduces an
academic intelligence engine providing automated Knowledge Check (quiz) generation,
AI-assisted study planning, and a contextual learning assistant while keeping
deterministic planning guarantees, academic integrity, and strict key security intact.

---

## 1. Core Architecture & Provider Registry

The AI system is built around a common, provider-agnostic interface (`AIProviderAdapter`)
managed by a centralized registry (`AIProviderRegistry`) and router (`AIRouter`).

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│     Web App / Desktop (Tauri) / Mobile (API Client)         │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      AI Settings & Keys      │ │    Academic Features       │
│  • AES-256-GCM encryption    │ │  • Quiz Generation         │
│  • Masked key display        │ │  • Planning Assistant      │
│  • Account isolation         │ │  • Learning Tutor          │
└──────────────┬───────────────┘ └────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        AI Router                            │
│  • Capability-aware model routing                           │
│  • Bounded retries (429 / 503 backoff)                      │
│  • Provider fallback (Gemini → Groq → NIM)                  │
│  • Audit logging & token tracking (ai_task_history)         │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│Google Gemini │        │     Groq     │        │  NVIDIA NIM  │
│(AI Studio)   │        │(Fast Llama 3)│        │(Enterprise)  │
└──────────────┘        └──────────────┘        └──────────────┘
```

### Supported Provider Families

1. **Google AI Studio (Gemini)**
   - Models: `gemini-2.5-flash` (default, recommended), `gemini-2.5-pro`, `gemini-1.5-flash`.
   - Capabilities: Native JSON schema output, high context window (1M+ tokens), multimodal support.
2. **Groq**
   - Models: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`.
   - Capabilities: Ultra-low latency inference, JSON mode, rate-limit reset parsing.
3. **NVIDIA NIM**
   - Models: `meta/llama-3.3-70b-instruct`, `meta/llama-3.1-8b-instruct`, `mistralai/mistral-large-2-instruct`.
   - Capabilities: Self-hosted / enterprise OpenAI-compatible endpoints with configurable base URLs.

---

## 2. Security & Credential Management

All user credentials and AI configurations are isolated strictly by account (`userId`):

- **Encryption at Rest:** API keys are encrypted with authenticated **AES-256-GCM** before database storage.
  Each key is stored as `iv:tag:ciphertext` (12-byte random IV, 16-byte auth tag). Tampering or ciphertext corruption triggers authentication failure.
- **Master Secret Derivation:** Encryption keys are derived using SHA-256 from `STUDYOS_SECRET_KEY` (or `SESSION_SECRET`).
- **Zero Key Leakage:** Plaintext API keys and ciphertexts are **never** returned in API responses, logs, or client-side storage.
- **Masked Key Display:** When querying configured providers (`GET /ai/providers`), keys are returned masked with only the last 4 characters visible (e.g., `...9876`).
- **Database Schema:**
  - `ai_provider_configs`: Stores encrypted keys, custom base URLs, enabled models, and timestamps per `(userId, provider)`.
  - `ai_user_settings`: User preference for enabled status, primary provider, fallback toggle, and preferred tutor model.
  - `ai_task_history`: Audit trail with task type, model, prompt/completion tokens, latency, status, and error messages.

---

## 3. Ingestion Pipeline

Study materials are ingested and normalized for AI consumption:

- **PDF Documents:** Extracted using `pdf-parse` v2 (`PDFParse`) with page-by-page rendering. Documents yielding fewer than 40 characters are flagged as scanned/image-only PDFs rather than returning empty hallucinations.
- **YouTube Transcripts:** Video IDs are extracted from URLs (`youtu.be`, `watch?v=`, `embed/`). Subtitle/caption tracks are retrieved from YouTube's timedtext endpoint and formatted with timestamp markers (e.g., `[02:15]`). If transcripts are unavailable, a clear error is returned rather than generating hallucinated content.
- **Notes & Pasted Text:** Extracted directly from StudyOS notes or user input.
- **Chunking Engine:** Standardized 10,000-character windows with 1,000-character overlap, respecting paragraph breaks, timestamps, and page boundaries to prevent truncated contexts.

---

## 4. Knowledge Check (Quiz) Generation

AI-generated quizzes follow strict validation and student review protocols:

- **Structured Output:** Questions are returned in strict JSON format conforming to the StudyOS quiz question schema.
- **Validation Gate:** Every generated candidate is verified against:
  - Minimum 2 options for multiple-choice questions.
  - Option text uniqueness (no duplicate answer choices).
  - Single-choice questions must have exactly 1 correct answer.
  - Multiple-choice questions must have at least 1 correct answer.
  - Explanation and source citation grounding.
- **Human-in-the-Loop Review:** The Web UI displays a candidate review modal where students can inspect, edit, or regenerate individual questions before saving.
- **Canonical Storage & Scoring:** Saved questions are inserted into the canonical `quizzes`, `quizQuestions`, and `quizOptions` tables with `provenance: "ai_generated"`.
- **Integrity Preservation:** The deterministic quiz scoring engine (`scoreQuiz`) and the secure taking payload generator (`takingPayload`, which hides correct answers during quiz attempts) remain completely intact and untouched.

---

## 5. Deterministic AI Study Planning

The AI Study Planning assistant adheres strictly to the rule that **AI provides suggestions, but the deterministic planner controls the calendar**:

1. **AI Workload Analysis:** Evaluates assignment title, description, estimated minutes, due date, and user timezone.
2. **Distribution Suggestion:** Proposes a spaced session breakdown (e.g., Session 1: Research, Session 2: Drafting, Session 3: Review).
3. **Deterministic Preview Integration:** The proposed parameters are fed directly into the canonical `previewStudyPlan()` engine. This verifies existing calendar events, sleep windows, and user preferences to generate collision-free calendar slots and compute an `availabilityFingerprint`.
4. **Explicit User Approval:** No calendar events or study sessions are created until the user explicitly reviews the schedule and clicks "Apply Plan to Calendar", invoking `confirmStudyPlan()`. If calendar state changes between preview and confirmation, conflict detection prevents stale overwrites.

---

## 6. Contextual Learning Assistant

The Learning Assistant provides an interactive academic tutor accessible from the StudyOS header:

- **Context Grounding:** Incorporates context from the student's active Subject, Assignment, Resource, Note, or Knowledge Check.
- **Grounding Citations:** References source material with explicit citations.
- **Quick Action Prompts:** Preconfigured prompts for summarizing, explaining complex concepts, generating practice problems, and breaking down study steps.

---

## 7. Fault Tolerance, Retries & Fallback

- **Transient Error Retries:** 429 (Rate Limit) and 503 (Service Unavailable) errors trigger a bounded retry with backoff.
- **Provider Fallback:** If `fallbackEnabled` is active in user settings and the primary provider fails, the router automatically attempts the task using the next configured secondary provider.
- **Normalized Errors:** All provider errors are translated into uniform domain errors: `AIRateLimitError`, `AIAuthenticationError`, `AIQuotaError`, `AITimeoutError`, `AIInvalidOutputError`, and `AIConnectionError`.

---

## 8. Verification & Test Suite

The Phase 7 implementation is validated with comprehensive automated tests:

- **Cryptographic & Unit Tests:** `apps/api/src/services/ai/ai.unit.test.ts`
  - AES-256-GCM encryption, decryption, and tampering detection.
  - API key masking.
  - Provider adapters (Gemini, Groq, NIM) request construction and error mapping.
  - Text chunking and windowing.
- **Integration Tests (PostgreSQL):** `apps/api/src/routes/ai.test.ts`
  - Provider configuration storage and encrypted key persistence.
  - Masked key response validation (never exposing raw keys).
  - Account isolation (User B cannot access or modify User A's AI settings or configs).
  - Connection test endpoint handling.
  - Quiz generation schema validation.
  - Planning suggestion and assistant chat endpoints.
  - Task history audit logging.
- **Full Typecheck:** All 10 workspace packages compile with 0 errors (`types`, `database`, `api-client`, `api`, `web`, `expo-mobile`, etc.).
- **Production Build:** Vite production web build and desktop frontend bundle succeeded.

> **Note on Live Provider Credentials:** Automated test suites verify simulated provider exchanges, request contracts, and error handling. Testing against live upstream Google AI Studio, Groq, or NVIDIA endpoints requires valid user-provided API keys entered via the StudyOS Settings > AI tab.
