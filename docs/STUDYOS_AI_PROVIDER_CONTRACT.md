# StudyOS AI provider contract (Phase 7 design only)

Phase 3 does not call an LLM. Resources, notes, manually authored quizzes, attempts, and deterministic scoring are canonical StudyOS data and work without AI. This document fixes the intended Phase 7 boundary; it does not enable provider settings, transcript extraction, or generation.

## Provider boundary

`AIProvider → provider configuration → available model selection → selected/default model → StudyOS AI services`

Phase 7 must support configurable adapters for Google AI Studio/Gemini API, NVIDIA NIM API, and Groq API. Settings → AI should let a user enter a provider API key, test the connection, select a supported model, and choose a default provider/model with ordered fallbacks where supported. Keys stay server-side, encrypted at rest, redacted in logs, and never appear in client responses or source control. Provider unavailability must not disable manual quizzes or normal planning.

Adapters should expose normalized model capabilities where possible: context/output limits, structured-output reliability, modalities, rate limits, and relevant cost/availability. Do not impose one tiny universal token limit. Apply technical safeguards per model; segment long sources when necessary. A fallback must preserve the same StudyOS validation and user-confirmation rules, not silently change task semantics.

## Future grounded quiz pipeline

Resource or Note → extract actual source content → normalize transcript/text → chunk only when needed → extract concepts → generate balanced candidate questions → structured quiz JSON → schema validation → answer/question consistency checks → repair or retry malformed output → persist through the canonical Phase 3 Quiz domain.

Question provenance may identify a source Resource and segment/reference through existing neutral fields. Generation metadata should remain provider-neutral and must not override canonical ownership, authoring, scoring, or attempt history. AI produces candidates; StudyOS validates and persists them. There is no AI scoring for Phase 3 MCQs.

The validation gate should reject malformed JSON; empty prompts; missing, duplicate, or invalid options; unsupported question types; no correct answer; multiple correct answers for a single-answer question; invalid option references; and explanation/answer inconsistencies where deterministically detectable. Weaker or free models may use bounded repair/retry, but invalid content must never bypass the gate. Any source-content extraction and provider call requires explicit Phase 7 implementation and security review.
