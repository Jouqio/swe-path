-- ====================================================================
-- BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
-- MODUL 8: DATABASE ENGINEERING (POSTGRESQL & SQL)
-- PRACTICAL ASSESSMENT: TaskFlow Enterprise Database Architecture & Analytics
-- ====================================================================
--
-- DOKUMEN SPESIFIKASI DDL & ANALYTICAL SQL ASSESSMENT MODULE 8
-- Memenuhi standar Normalisasi 3NF, Integritas Referensial Ketat,
-- Strategi Indexing B-Tree, dan Kueri Agregasi Multi-Tabel.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. EXTENSION & CLEANUP
-- --------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS task_tags CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS task_audit_logs CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- --------------------------------------------------------------------
-- 2. DDL SCHEMA DEFINITION (3NF NORMALIZED)
-- --------------------------------------------------------------------

-- Tabel 1: USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabel 2: WORKSPACES
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    owner_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workspace_owner FOREIGN KEY (owner_id) 
        REFERENCES users(id) ON DELETE RESTRICT
);

-- Tabel 3: WORKSPACE_MEMBERS (M-to-N Junction)
CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, user_id),
    CONSTRAINT fk_member_workspace FOREIGN KEY (workspace_id) 
        REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_member_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT check_member_role CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER'))
);

-- Tabel 4: TASKS
CREATE TABLE tasks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workspace_id UUID NOT NULL,
    creator_id UUID NOT NULL,
    assignee_id UUID,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(20) NOT NULL DEFAULT 'TODO',
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_workspace FOREIGN KEY (workspace_id) 
        REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_creator FOREIGN KEY (creator_id) 
        REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_task_assignee FOREIGN KEY (assignee_id) 
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT check_task_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    CONSTRAINT check_task_status CHECK (status IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'))
);

-- Tabel 5: TAGS
CREATE TABLE tags (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workspace_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    CONSTRAINT fk_tag_workspace FOREIGN KEY (workspace_id) 
        REFERENCES workspaces(id) ON DELETE CASCADE,
    CONSTRAINT uq_workspace_tag UNIQUE (workspace_id, name)
);

-- Tabel 6: TASK_TAGS (M-to-N Junction)
CREATE TABLE task_tags (
    task_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    CONSTRAINT fk_tasktag_task FOREIGN KEY (task_id) 
        REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasktag_tag FOREIGN KEY (tag_id) 
        REFERENCES tags(id) ON DELETE CASCADE
);

-- Tabel 7: TASK_COMMENTS
CREATE TABLE task_comments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id BIGINT NOT NULL,
    author_id UUID,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_comment_task FOREIGN KEY (task_id) 
        REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_author FOREIGN KEY (author_id) 
        REFERENCES users(id) ON DELETE SET NULL
);

-- Tabel 8: TASK_AUDIT_LOGS
CREATE TABLE task_audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id BIGINT NOT NULL,
    actor_id UUID,
    action VARCHAR(30) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_task FOREIGN KEY (task_id) 
        REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) 
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT check_audit_action CHECK (action IN ('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'DELETED'))
);

-- --------------------------------------------------------------------
-- 3. PRODUCTION INDEXING STRATEGY
-- --------------------------------------------------------------------
-- Indeks Foreign Keys
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_tasks_creator ON tasks(creator_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_comments_task ON task_comments(task_id);
CREATE INDEX idx_audit_task ON task_audit_logs(task_id);

-- Indeks Komposit untuk Kueri Dashboard (Workspace & Status Filtering)
CREATE INDEX idx_tasks_workspace_status ON tasks(workspace_id, status);

-- Partial Index untuk Task yang Belum Selesai (Menghemat Memori Buffer)
CREATE INDEX idx_tasks_open_urgent ON tasks(workspace_id, priority) 
WHERE status != 'DONE';

-- --------------------------------------------------------------------
-- 4. ADVANCED ANALYTICAL REPORTING QUERY: EXECUTIVE DASHBOARD
-- --------------------------------------------------------------------
-- Menghitung agregat metrik produktivitas workspace dalam satu query efisien:
SELECT 
    w.id AS workspace_id,
    w.name AS workspace_name,
    w.slug AS workspace_slug,
    u_owner.full_name AS owner_name,
    COUNT(DISTINCT wm.user_id) AS total_members,
    COUNT(DISTINCT t.id) AS total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'DONE' THEN t.id END) AS completed_tasks,
    COUNT(DISTINCT CASE WHEN t.priority = 'URGENT' AND t.status != 'DONE' THEN t.id END) AS urgent_open_tasks,
    ROUND(
        (COUNT(DISTINCT CASE WHEN t.status = 'DONE' THEN t.id END)::NUMERIC / 
        NULLIF(COUNT(DISTINCT t.id), 0)) * 100, 
        2
    ) AS workspace_completion_rate_pct
FROM workspaces w
JOIN users u_owner ON w.owner_id = u_owner.id
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
LEFT JOIN tasks t ON w.id = t.workspace_id
GROUP BY w.id, w.name, w.slug, u_owner.full_name
ORDER BY workspace_completion_rate_pct DESC NULLS LAST;
