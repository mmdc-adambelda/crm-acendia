-- ============================================================
-- Personal Trello-style task boards — private per-user, not
-- shared with the team. Mirrors Trello's own data model:
-- Board -> List -> Card, plus Label, Checklist item, Comment.
-- ============================================================

CREATE TABLE task_boards (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  color      TEXT,
  position   INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_lists (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id   UUID        NOT NULL REFERENCES task_boards(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  position   INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_cards (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id     UUID        NOT NULL REFERENCES task_lists(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  due_date    TIMESTAMPTZ,
  position    INT         NOT NULL DEFAULT 0,
  is_archived BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_labels (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id   UUID        NOT NULL REFERENCES task_boards(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  color      TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_card_labels (
  card_id  UUID NOT NULL REFERENCES task_cards(id)  ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

CREATE TABLE task_checklist_items (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id    UUID        NOT NULL REFERENCES task_cards(id) ON DELETE CASCADE,
  text       TEXT        NOT NULL,
  is_done    BOOLEAN     NOT NULL DEFAULT false,
  position   INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_card_comments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id    UUID        NOT NULL REFERENCES task_cards(id) ON DELETE CASCADE,
  author_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_lists_board_id           ON task_lists (board_id);
CREATE INDEX idx_task_cards_list_id            ON task_cards (list_id);
CREATE INDEX idx_task_cards_due_date           ON task_cards (due_date) WHERE is_archived = false;
CREATE INDEX idx_task_labels_board_id          ON task_labels (board_id);
CREATE INDEX idx_task_checklist_items_card_id  ON task_checklist_items (card_id);
CREATE INDEX idx_task_card_comments_card_id    ON task_card_comments (card_id);

-- ============================================================
-- RLS — every table scoped to the board's owner via the
-- ownership chain (board -> list -> card -> checklist/comment).
-- ============================================================

ALTER TABLE task_boards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_lists           ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_cards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_labels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_card_labels     ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_card_comments   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_boards_owner" ON task_boards FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "task_lists_owner" ON task_lists FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM task_boards tb WHERE tb.id = task_lists.board_id AND tb.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM task_boards tb WHERE tb.id = task_lists.board_id AND tb.owner_id = auth.uid()
  ));

CREATE POLICY "task_cards_owner" ON task_cards FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM task_lists tl JOIN task_boards tb ON tb.id = tl.board_id
    WHERE tl.id = task_cards.list_id AND tb.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM task_lists tl JOIN task_boards tb ON tb.id = tl.board_id
    WHERE tl.id = task_cards.list_id AND tb.owner_id = auth.uid()
  ));

CREATE POLICY "task_labels_owner" ON task_labels FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM task_boards tb WHERE tb.id = task_labels.board_id AND tb.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM task_boards tb WHERE tb.id = task_labels.board_id AND tb.owner_id = auth.uid()
  ));

CREATE POLICY "task_card_labels_owner" ON task_card_labels FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM task_cards tc
    JOIN task_lists tl ON tl.id = tc.list_id
    JOIN task_boards tb ON tb.id = tl.board_id
    WHERE tc.id = task_card_labels.card_id AND tb.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM task_cards tc
    JOIN task_lists tl ON tl.id = tc.list_id
    JOIN task_boards tb ON tb.id = tl.board_id
    WHERE tc.id = task_card_labels.card_id AND tb.owner_id = auth.uid()
  ));

CREATE POLICY "task_checklist_items_owner" ON task_checklist_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM task_cards tc
    JOIN task_lists tl ON tl.id = tc.list_id
    JOIN task_boards tb ON tb.id = tl.board_id
    WHERE tc.id = task_checklist_items.card_id AND tb.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM task_cards tc
    JOIN task_lists tl ON tl.id = tc.list_id
    JOIN task_boards tb ON tb.id = tl.board_id
    WHERE tc.id = task_checklist_items.card_id AND tb.owner_id = auth.uid()
  ));

CREATE POLICY "task_card_comments_owner" ON task_card_comments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM task_cards tc
    JOIN task_lists tl ON tl.id = tc.list_id
    JOIN task_boards tb ON tb.id = tl.board_id
    WHERE tc.id = task_card_comments.card_id AND tb.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM task_cards tc
    JOIN task_lists tl ON tl.id = tc.list_id
    JOIN task_boards tb ON tb.id = tl.board_id
    WHERE tc.id = task_card_comments.card_id AND tb.owner_id = auth.uid()
  ));
