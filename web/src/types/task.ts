export type Urgency = 'P1' | 'P2' | 'P3' | 'P4';
export type TaskStatus = 'Open' | 'Completed';

export type Project = {
  id: string;
  name: string;
  _count?: {
    tasks: number;
  };
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  dueDate: string;
  urgency: Urgency;
  projectId?: string | null;
  project?: Project | null;
  createdAt: string;
  completedDate?: string | null;
  followUpItem: boolean;
  url1?: string | null;
  url2?: string | null;
  url3?: string | null;
};

export type TaskActionType = 'nextDay' | 'plusTwo' | 'nextMonday';
