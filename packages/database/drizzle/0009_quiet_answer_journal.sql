-- Quiz answer rows use their question UUID as the journal identity. The
-- attempt UUID remains in the payload, avoiding expression parsing and keeping
-- answer events account-scoped without exposing answer keys.
CREATE OR REPLACE FUNCTION studyos_capture_quiz_answer_change() RETURNS trigger AS $$
DECLARE
  row_data jsonb;
  owner_id uuid;
  row_id uuid;
  seq bigint;
  op text;
BEGIN
  IF TG_OP = 'DELETE' THEN row_data := to_jsonb(OLD); ELSE row_data := to_jsonb(NEW); END IF;
  SELECT quiz_attempts.user_id INTO owner_id FROM quiz_attempts
    WHERE quiz_attempts.id = nullif(row_data->>'attempt_id', '')::uuid;
  row_id := nullif(row_data->>'question_id', '')::uuid;
  IF owner_id IS NULL OR row_id IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE id = owner_id) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  op := CASE WHEN TG_OP = 'DELETE' THEN 'delete' ELSE 'upsert' END;
  INSERT INTO user_sync_states (user_id, sequence, retention_floor, updated_at)
  VALUES (owner_id, 1, 0, now()) ON CONFLICT (user_id) DO UPDATE SET sequence = user_sync_states.sequence + 1, updated_at = now()
  RETURNING sequence INTO seq;
  INSERT INTO sync_changes (user_id, sequence, entity_type, entity_id, revision, operation, payload, changed_at)
  VALUES (owner_id, seq, 'quiz-answer', row_id, NULL, op, row_data, now());
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS studyos_sync_change ON public.quiz_answers;
CREATE TRIGGER studyos_sync_change AFTER INSERT OR UPDATE OR DELETE ON public.quiz_answers FOR EACH ROW EXECUTE FUNCTION studyos_capture_quiz_answer_change();
