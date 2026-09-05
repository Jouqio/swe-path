-- ====================================================================
-- BOOTCAMP SOFTWARE ENGINEERING — LEVEL 2 (INTERMEDIATE: BACKEND)
-- MODUL 8: DATABASE ENGINEERING (POSTGRESQL & SQL)
-- File Praktik: Lesson 8.2 — Advanced SQL Queries, Joins, Aggregations & Indexing
-- ====================================================================
--
-- Petunjuk:
-- 1. Baca materi konsep di: lesson-8.2-advanced-sql-indexing.md
-- 2. Kerjakan kueri analitik dan DDL indexing di bawah ini.
-- 3. File ini siap dijalankan di PostgreSQL untuk verifikasi data.
-- ====================================================================

-- --------------------------------------------------------------------
-- BAGIAN 1: SAMPLE SEED DATA UNTUK PENGUJIAN KUERI
-- --------------------------------------------------------------------
-- Asumsikan tabel users dan tasks dari Lesson 8.1 sudah dibuat.

-- --------------------------------------------------------------------
-- BAGIAN 2: EXERCISE (Kueri Analitik Metrik Beban Kerja Tim)
-- --------------------------------------------------------------------
-- TUGAS:
-- Tulis kueri analitik untuk menghasilkan laporan beban kerja tim TaskFlow:
-- - user_id, full_name, email
-- - total_assigned: jumlah seluruh task yang ditugaskan kepada user
-- - completed_tasks: jumlah task dengan status 'DONE'
-- - urgent_tasks: jumlah task prioritas 'URGENT' yang belum selesai (status != 'DONE')
-- - completion_rate_pct: persentase penyelesaian (0 - 100%)
-- Ketentuan: User tanpa task tetap harus tampil dengan angka 0.

SELECT 
    u.id AS user_id,
    u.full_name,
    u.email,
    COUNT(t.id) AS total_assigned,
    COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) AS completed_tasks,
    COUNT(CASE WHEN t.priority = 'URGENT' AND t.status != 'DONE' THEN 1 END) AS urgent_tasks,
    ROUND(
        (COUNT(CASE WHEN t.status = 'DONE' THEN 1 END)::NUMERIC / NULLIF(COUNT(t.id), 0)) * 100, 
        2
    ) AS completion_rate_pct
FROM users u
LEFT JOIN tasks t ON u.id = t.assignee_id
GROUP BY u.id, u.full_name, u.email
ORDER BY 
    urgent_tasks DESC,
    total_assigned DESC;

-- --------------------------------------------------------------------
-- BAGIAN 3: DDL STRATEGI INDEXING UNTUK OPTIMASI KUERI DI ATAS
-- --------------------------------------------------------------------

-- 1. Index Foreign Key pada assignee_id (sangat krusial untuk mempercepat LEFT JOIN)
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);

-- 2. Composite Index untuk filter prioritas dan status
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status_priority 
ON tasks(assignee_id, status, priority);

-- 3. Partial Index untuk pencarian cepat task-task yang masih aktif (belum selesai)
CREATE INDEX IF NOT EXISTS idx_tasks_active_urgent 
ON tasks(assignee_id, priority) 
WHERE status != 'DONE';
