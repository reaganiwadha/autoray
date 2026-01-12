-- +goose Up
-- +goose StatementBegin
ALTER TABLE media_summary ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'visual';
CREATE INDEX idx_media_summary_type ON media_summary(type);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX idx_media_summary_type;
ALTER TABLE media_summary DROP COLUMN type;
-- +goose StatementEnd
