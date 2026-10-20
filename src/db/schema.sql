CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS widgets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('signup', 'cta', 'popover')),
  title       text NOT NULL,
  description text,
  fields      jsonb NOT NULL DEFAULT '[]'::jsonb,
  button_text text NOT NULL DEFAULT 'Submit',
  display     jsonb NOT NULL DEFAULT '{}'::jsonb,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS widgets_owner_created_idx ON widgets (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS submissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id   uuid NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload     jsonb NOT NULL,
  ip          text,
  user_agent  text,
  geo         jsonb,
  is_spam     boolean NOT NULL DEFAULT false,
  spam_reason text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS submissions_widget_created_idx ON submissions (widget_id, created_at DESC);
CREATE INDEX IF NOT EXISTS submissions_owner_created_idx ON submissions (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS submissions_created_idx ON submissions (created_at);
