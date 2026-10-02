CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  post_title TEXT NOT NULL,
  parent_id TEXT REFERENCES comments(id),
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ip_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX comments_post_status_created
  ON comments (post_id, status, created_at DESC, id DESC);

CREATE INDEX comments_ip_created
  ON comments (ip_hash, created_at DESC);