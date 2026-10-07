CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo',
  position double precision NOT NULL DEFAULT 0,
  due_at timestamptz,
  estimate_minutes integer,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO anon, authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public board access" ON public.tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO anon, authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public threads access" ON public.chat_threads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  role text NOT NULL,
  message jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, message_id)
);
CREATE INDEX ON public.chat_messages(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public messages access" ON public.chat_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.tasks (title, description, status, position, due_at, estimate_minutes, tags) VALUES
('Team meeting prep', 'Prepare agenda and slides for weekly sync.', 'todo', 1, now() + interval '1 day', 60, ARRAY['meeting']),
('Marketing course', 'Finish module 3 on audience research.', 'todo', 2, now() + interval '3 days', 120, ARRAY['learning']),
('Buy Anna''s birthday gift', 'Something from the Cedar shop.', 'todo', 3, now() + interval '2 days', 45, ARRAY['personal']),
('Upgrade Slack plan', 'Compare plans at app.slack.com/plans and upgrade.', 'in_progress', 1, now() + interval '5 hours', 30, ARRAY['finance','ops']),
('Facebook campaign', 'Draft ad copy and pick creatives.', 'in_progress', 2, now() + interval '4 days', 180, ARRAY['marketing']),
('Hubstaff broadcast', 'Record the async team update.', 'done', 1, now() - interval '1 day', 40, ARRAY['meeting']),
('Set up new project repo', 'Init repo, CI and README.', 'done', 2, now() - interval '2 days', 90, ARRAY['dev']);