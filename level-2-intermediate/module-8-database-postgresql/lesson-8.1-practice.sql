-- ====================================================================
-- BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
-- MODUL 8: DATABASE ENGINEERING (POSTGRESQL & SQL)
-- File Praktik: Lesson 8.1 — Relational Data Modeling & Normalization
-- ====================================================================
--
-- Petunjuk:
-- 1. Baca materi konsep di: lesson-8.1-relational-modeling.md
-- 2. Kerjakan script DDL di bawah ini untuk mengimplementasikan fitur
--    Task Comments dan Audit Logs berstandar 3NF.
-- 3. File ini dapat dijalankan pada instans PostgreSQL lokal / container Docker.
-- ====================================================================

-- --------------------------------------------------------------------
-- BAGIAN 1: TABEL PENDUKUNG DASAR (Skema TaskFlow Inti)
-- --------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'TODO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- BAGIAN 2: EXERCISE (Implementasi 2 Tabel Baru Berstandar 3NF)
-- --------------------------------------------------------------------

-- TUGAS 1: TABEL TASK_COMMENTS
-- Kriteria:
-- - id: BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
-- - task_id: Foreign key ke tasks(id) ON DELETE CASCADE
-- - author_id: Foreign key ke users(id) ON DELETE SET NULL (dapat NULL)
-- - content: TEXT NOT NULL
-- - created_at: TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

CREATE TABLE IF NOT EXISTS task_comments (
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

-- TUGAS 2: TABEL TASK_AUDIT_LOGS
-- Kriteria:
-- - id: BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
-- - task_id: Foreign key ke tasks(id) ON DELETE CASCADE
-- - actor_id: Foreign key ke users(id) ON DELETE SET NULL
-- - action: VARCHAR(30) NOT NULL dengan CHECK ('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'DELETED')
-- - details: JSONB NOT NULL DEFAULT '{}'::jsonb
-- - created_at: TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

CREATE TABLE IF NOT EXISTS task_audit_logs (
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
-- BAGIAN 3: VERIFIKASI DATA SAMPLE & UJI INTEGRITAS REFERENSIAL
-- --------------------------------------------------------------------
-- Contoh skenario pengujian integritas:
-- 1. Insert User & Workspace
-- 2. Insert Task
-- 3. Insert Comment & Audit Log
-- 4. Uji Cascade: Saat Task dihapus, Comment dan Audit Log otomatis ikut terhapus.
-- 5. Uji Check Constraint: Nilai action yang tidak valid ('HACKED') akan ditolak oleh Postgres.
