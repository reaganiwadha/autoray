-- +goose Up
-- +goose StatementBegin
CREATE TABLE media_summary (
    id SERIAL PRIMARY KEY,
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_summary_media_id ON media_summary(media_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE media_summary;
-- +goose StatementEnd
