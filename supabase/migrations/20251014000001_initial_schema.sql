-- Initial Schema for Task Manager
-- This migration creates the core tables with Row Level Security

-- Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Completed', 'Archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Completed')),
  due_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  urgency TEXT NOT NULL DEFAULT 'P3' CHECK (urgency IN ('P1', 'P2', 'P3', 'P4')),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_date TIMESTAMPTZ,
  follow_up_item BOOLEAN NOT NULL DEFAULT FALSE,
  url1 TEXT,
  url2 TEXT,
  url3 TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_urgency ON tasks(urgency);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_due_date ON tasks(user_id, due_date);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Projects
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Tasks
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get tasks with project info (useful for queries)
CREATE OR REPLACE FUNCTION get_tasks_with_projects(
  user_uuid UUID,
  task_status TEXT DEFAULT NULL,
  search_term TEXT DEFAULT NULL,
  project_uuid UUID DEFAULT NULL,
  from_date TIMESTAMPTZ DEFAULT NULL,
  to_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  due_date TIMESTAMPTZ,
  urgency TEXT,
  project_id UUID,
  project_name TEXT,
  project_description TEXT,
  created_at TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  follow_up_item BOOLEAN,
  url1 TEXT,
  url2 TEXT,
  url3 TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.user_id,
    t.title,
    t.description,
    t.status,
    t.due_date,
    t.urgency,
    t.project_id,
    p.name AS project_name,
    p.description AS project_description,
    t.created_at,
    t.completed_date,
    t.follow_up_item,
    t.url1,
    t.url2,
    t.url3,
    t.updated_at
  FROM tasks t
  LEFT JOIN projects p ON t.project_id = p.id
  WHERE
    t.user_id = user_uuid
    AND (task_status IS NULL OR t.status = task_status)
    AND (search_term IS NULL OR t.title ILIKE '%' || search_term || '%' OR t.description ILIKE '%' || search_term || '%')
    AND (project_uuid IS NULL OR t.project_id = project_uuid)
    AND (from_date IS NULL OR t.due_date >= from_date)
    AND (to_date IS NULL OR t.due_date <= to_date)
  ORDER BY t.due_date ASC, t.urgency ASC;
END;
$$;

-- Function to get project statistics
CREATE OR REPLACE FUNCTION get_project_stats(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  status TEXT,
  total_tasks BIGINT,
  open_tasks BIGINT,
  completed_tasks BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.status,
    COUNT(t.id) AS total_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'Open') AS open_tasks,
    COUNT(t.id) FILTER (WHERE t.status = 'Completed') AS completed_tasks,
    p.created_at,
    p.updated_at
  FROM projects p
  LEFT JOIN tasks t ON p.id = t.project_id
  WHERE p.user_id = user_uuid
  GROUP BY p.id, p.name, p.description, p.status, p.created_at, p.updated_at
  ORDER BY p.created_at DESC;
END;
$$;
