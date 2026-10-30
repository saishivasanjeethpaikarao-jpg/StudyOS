-- Sync/bootstrap payloads must not expose quiz answer keys to a taking client.
CREATE OR REPLACE FUNCTION studyos_capture_sync_change() RETURNS trigger AS $$
DECLARE
  row_data jsonb;
  owner_id uuid;
  row_id uuid;
  seq bigint;
  op text;
  revision_value integer;
  entity_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN row_data := to_jsonb(OLD); ELSE row_data := to_jsonb(NEW); END IF;
  IF TG_TABLE_NAME = 'users' AND TG_OP = 'DELETE' THEN RETURN OLD;
  ELSIF TG_TABLE_NAME = 'users' THEN
    owner_id := (row_data->>'id')::uuid; row_id := owner_id;
    row_data := row_data - 'password_hash' - 'password_reset_token' - 'password_reset_expires'; entity_name := 'profile';
  ELSIF TG_TABLE_NAME = 'quiz_questions' THEN
    row_id := nullif(row_data->>'id', '')::uuid;
    SELECT quizzes.user_id INTO owner_id FROM quizzes WHERE quizzes.id = nullif(row_data->>'quiz_id', '')::uuid;
    entity_name := 'quiz-question';
  ELSIF TG_TABLE_NAME = 'quiz_options' THEN
    row_id := nullif(row_data->>'id', '')::uuid;
    SELECT quizzes.user_id INTO owner_id FROM quiz_questions JOIN quizzes ON quizzes.id = quiz_questions.quiz_id
      WHERE quiz_questions.id = nullif(row_data->>'question_id', '')::uuid;
    row_data := row_data - 'is_correct'; entity_name := 'quiz-option';
  ELSIF TG_TABLE_NAME = 'quiz_answers' THEN
    SELECT quiz_attempts.user_id INTO owner_id FROM quiz_attempts WHERE quiz_attempts.id = nullif(row_data->>'attempt_id', '')::uuid;
    row_id := (substr(md5(row_data->>'attempt_id' || ':' || row_data->>'question_id'), 1, 8) || '-' ||
      substr(md5(row_data->>'attempt_id' || ':' || row_data->>'question_id'), 9, 4) || '-' ||
      substr(md5(row_data->>'attempt_id' || ':' || row_data->>'question_id'), 13, 4) || '-' ||
      substr(md5(row_data->>'attempt_id' || ':' || row_data->>'question_id'), 17, 4) || '-' ||
      substr(md5(row_data->>'attempt_id' || ':' || row_data->>'question_id'), 21, 12))::uuid;
    entity_name := 'quiz-answer';
  ELSIF TG_TABLE_NAME = 'subtasks' THEN
    row_id := nullif(row_data->>'id', '')::uuid;
    SELECT tasks.user_id INTO owner_id FROM tasks WHERE tasks.id = nullif(row_data->>'task_id', '')::uuid; entity_name := 'subtask';
  ELSIF TG_TABLE_NAME = 'idea_subtasks' THEN
    row_id := nullif(row_data->>'id', '')::uuid;
    SELECT ideas.user_id INTO owner_id FROM ideas WHERE ideas.id = nullif(row_data->>'idea_id', '')::uuid; entity_name := 'idea-subtask';
  ELSE
    owner_id := nullif(row_data->>'user_id', '')::uuid; row_id := nullif(row_data->>'id', '')::uuid; entity_name := replace(TG_TABLE_NAME, '_', '-');
  END IF;
  IF owner_id IS NULL OR row_id IS NULL OR NOT EXISTS (SELECT 1 FROM users WHERE id = owner_id) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_OP = 'DELETE' OR nullif(row_data->>'deleted_at', '') IS NOT NULL THEN op := 'delete'; ELSE op := 'upsert'; END IF;
  IF TG_TABLE_NAME = 'quiz_attempts' THEN row_data := row_data - 'snapshot'; END IF;
  IF TG_TABLE_NAME = 'resources' THEN row_data := row_data - 'storage_key'; END IF;
  IF TG_TABLE_NAME = 'attachments' THEN row_data := row_data - 's3_key'; END IF;
  revision_value := nullif(row_data->>'revision', '')::integer;
  INSERT INTO user_sync_states (user_id, sequence, retention_floor, updated_at)
  VALUES (owner_id, 1, 0, now()) ON CONFLICT (user_id) DO UPDATE SET sequence = user_sync_states.sequence + 1, updated_at = now()
  RETURNING sequence INTO seq;
  INSERT INTO sync_changes (user_id, sequence, entity_type, entity_id, revision, operation, payload, changed_at)
  VALUES (owner_id, seq, entity_name, row_id, revision_value, op, row_data, now());
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;
