-- =============================================================================
-- Migration: Add rich YOLO fields to ai_reports table
-- Date: 2026-01-03
-- Safe to run on an existing database — all statements use IF NOT EXISTS / IF EXISTS guards.
-- =============================================================================

-- Rich YOLO findings: array of {label, confidence, box[4], suggestion}
ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS findings       JSONB    NOT NULL DEFAULT '[]';

-- Human-readable summary sentence produced by the ML service
ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS summary        TEXT;

-- Count of detected findings (denormalised for quick queries)
ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS finding_count  INTEGER  NOT NULL DEFAULT 0;

-- Annotated image returned by the ML service as a base64 data-URI (data:image/png;base64,…)
-- Can be large (~500 KB); stored as TEXT. Set RETURN_ANNOTATED_IMAGE=false in production
-- if you prefer not to persist it and just use the original upload.
ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS annotated_image TEXT;

-- Backfill finding_count for any existing rows
UPDATE ai_reports
   SET finding_count = jsonb_array_length(findings)
 WHERE finding_count = 0 AND findings IS NOT NULL AND findings != '[]';
