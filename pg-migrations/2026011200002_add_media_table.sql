-- +goose Up
-- +goose StatementBegin
CREATE TABLE media (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    s3_key TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    FOREIGN KEY (user_id) REFERENCES "user"(id)
);

CREATE INDEX ix_media_user_id ON media (user_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE media;
-- +goose StatementEnd
