BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS knowledge_agent;

CREATE TYPE knowledge_agent.member_role AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE knowledge_agent.document_version_status AS ENUM (
  'pending_materialization',
  'active',
  'conflict',
  'superseded'
);
CREATE TYPE knowledge_agent.run_status AS ENUM (
  'queued',
  'running',
  'awaiting_approval',
  'succeeded',
  'failed',
  'cancelled'
);
CREATE TYPE knowledge_agent.proposal_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'applied',
  'conflict'
);
CREATE TYPE knowledge_agent.approval_decision AS ENUM ('approved', 'rejected');
CREATE TYPE knowledge_agent.idempotency_status AS ENUM ('processing', 'completed', 'failed');

CREATE TABLE knowledge_agent.principals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_subject text NOT NULL UNIQUE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_agent.knowledge_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES knowledge_agent.principals(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_agent.knowledge_base_members (
  knowledge_base_id uuid NOT NULL REFERENCES knowledge_agent.knowledge_bases(id),
  principal_id uuid NOT NULL REFERENCES knowledge_agent.principals(id),
  role knowledge_agent.member_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (knowledge_base_id, principal_id)
);

CREATE TABLE knowledge_agent.knowledge_roots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id uuid NOT NULL REFERENCES knowledge_agent.knowledge_bases(id),
  canonical_path text NOT NULL,
  allowed_extensions text[] NOT NULL DEFAULT ARRAY['.md']::text[],
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (knowledge_base_id, canonical_path)
);

CREATE TABLE knowledge_agent.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id uuid NOT NULL REFERENCES knowledge_agent.knowledge_bases(id),
  root_id uuid NOT NULL REFERENCES knowledge_agent.knowledge_roots(id),
  relative_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'text/markdown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT normalized_relative_path CHECK (
    relative_path <> ''
    AND relative_path !~ '(^|/)\.\.(/|$)'
    AND relative_path !~ '^/'
    AND relative_path !~ '^[A-Za-z]:'
    AND relative_path !~ '\\'
  ),
  UNIQUE (root_id, relative_path)
);

CREATE TABLE knowledge_agent.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES knowledge_agent.knowledge_documents(id),
  version_number bigint NOT NULL,
  base_version_id uuid REFERENCES knowledge_agent.document_versions(id),
  content text NOT NULL,
  content_sha256 char(64) NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  materialized_sha256 char(64) CHECK (
    materialized_sha256 IS NULL OR materialized_sha256 ~ '^[0-9a-f]{64}$'
  ),
  status knowledge_agent.document_version_status NOT NULL,
  created_by uuid NOT NULL REFERENCES knowledge_agent.principals(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  materialized_at timestamptz,
  CONSTRAINT document_version_identity UNIQUE (document_id, id),
  CONSTRAINT document_version_number UNIQUE (document_id, version_number)
);

ALTER TABLE knowledge_agent.knowledge_documents
  ADD COLUMN current_version_id uuid,
  ADD CONSTRAINT knowledge_documents_current_version_fk
    FOREIGN KEY (id, current_version_id)
    REFERENCES knowledge_agent.document_versions(document_id, id)
    DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE knowledge_agent.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id uuid NOT NULL REFERENCES knowledge_agent.document_versions(id),
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  heading_path text[] NOT NULL DEFAULT ARRAY[]::text[],
  content text NOT NULL,
  token_count integer NOT NULL CHECK (token_count >= 0),
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_version_id, chunk_index)
);

CREATE INDEX document_chunks_embedding_hnsw
  ON knowledge_agent.document_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE TABLE knowledge_agent.agent_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id uuid NOT NULL REFERENCES knowledge_agent.knowledge_bases(id),
  principal_id uuid NOT NULL REFERENCES knowledge_agent.principals(id),
  langgraph_thread_id varchar(255) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_agent.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES knowledge_agent.agent_threads(id),
  correlation_id uuid NOT NULL UNIQUE,
  status knowledge_agent.run_status NOT NULL,
  user_request text NOT NULL,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX agent_runs_thread_created_at_idx
  ON knowledge_agent.agent_runs (thread_id, created_at DESC);

CREATE TABLE knowledge_agent.change_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES knowledge_agent.agent_runs(id),
  document_id uuid NOT NULL REFERENCES knowledge_agent.knowledge_documents(id),
  base_version_id uuid NOT NULL REFERENCES knowledge_agent.document_versions(id),
  operation_key text NOT NULL UNIQUE,
  unified_diff text NOT NULL,
  proposed_content text NOT NULL,
  proposed_sha256 char(64) NOT NULL CHECK (proposed_sha256 ~ '^[0-9a-f]{64}$'),
  rationale text NOT NULL,
  status knowledge_agent.proposal_status NOT NULL DEFAULT 'pending',
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_agent.approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL,
  decided_by uuid NOT NULL REFERENCES knowledge_agent.principals(id),
  decision knowledge_agent.approval_decision NOT NULL,
  proposal_revision integer NOT NULL CHECK (proposal_revision > 0),
  reason text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id),
  FOREIGN KEY (proposal_id) REFERENCES knowledge_agent.change_proposals(id)
);

CREATE TABLE knowledge_agent.idempotency_records (
  principal_id uuid NOT NULL REFERENCES knowledge_agent.principals(id),
  route text NOT NULL,
  idempotency_key text NOT NULL,
  request_sha256 char(64) NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  status knowledge_agent.idempotency_status NOT NULL,
  response_status integer,
  response_body jsonb,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (principal_id, route, idempotency_key)
);

CREATE TABLE knowledge_agent.outbox_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_type text NOT NULL,
  dedupe_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  publish_attempts integer NOT NULL DEFAULT 0 CHECK (publish_attempts >= 0),
  last_error text
);

CREATE INDEX outbox_events_unpublished_idx
  ON knowledge_agent.outbox_events (occurred_at)
  WHERE published_at IS NULL;

CREATE TABLE knowledge_agent.audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_principal_id uuid REFERENCES knowledge_agent.principals(id),
  correlation_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  outcome text NOT NULL,
  policy_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX audit_events_correlation_idx
  ON knowledge_agent.audit_events (correlation_id, occurred_at);

COMMIT;
