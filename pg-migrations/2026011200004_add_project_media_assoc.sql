-- +goose Up
-- +goose StatementBegin
CREATE TABLE project_media (
    project_id INTEGER NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    is_unused BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, media_id)
);

CREATE INDEX idx_project_media_project_id ON project_media(project_id);
CREATE INDEX idx_project_media_media_id ON project_media(media_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- +goose StatementEnd
