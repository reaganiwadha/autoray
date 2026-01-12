-- +goose Up
-- +goose StatementBegin
ALTER TABLE media ADD COLUMN binary_metadata JSONB;

CREATE TABLE thumbnail (
    id SERIAL PRIMARY KEY,
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    size INTEGER NOT NULL,
    s3_key VARCHAR(255) NOT NULL,
    width INTEGER,
    height INTEGER,
    type VARCHAR(50) NOT NULL, -- 'original', 'large', 'small', 'gif'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_thumbnail_media_id ON thumbnail(media_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- +goose StatementEnd
