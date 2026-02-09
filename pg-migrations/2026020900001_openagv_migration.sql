-- +goose Up
-- +goose StatementBegin
-- Add JSONB column for openagv project state
ALTER TABLE project ADD COLUMN data JSONB;
-- +goose StatementEnd

-- Drop tables replaced by openagv
DROP TABLE IF EXISTS project_media CASCADE;
DROP TABLE IF EXISTS media_summary CASCADE;
DROP TABLE IF EXISTS thumbnail CASCADE;
DROP TABLE IF EXISTS media CASCADE;


-- +goose Down
-- +goose StatementBegin
-- +goose StatementEnd
