import { Prisma } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { prisma } from '../lib/prisma.js';
import {
  moveToNextDay,
  moveToNextWeek,
  moveToPlusTwoDays,
  toStartOfDay,
} from '../utils/date.js';
import { taskEvents } from '../realtime/events.js';

const URGENCY_SEQUENCE = ['P1', 'P2', 'P3', 'P4'] as const;

type Urgency = (typeof URGENCY_SEQUENCE)[number];

export type ListTasksOptions = {
  status?: 'Open' | 'Completed';
  search?: string;
  projectId?: string | null;
  from?: Date | null;
  to?: Date | null;
};

const taskInclude = {
  project: true,
} satisfies Prisma.TaskInclude;

function clampUrgency(direction: 'up' | 'down', current: Urgency) {
  const index = URGENCY_SEQUENCE.indexOf(current);
  if (direction === 'up' && index === 0) {
    throw new BadRequestError('Cannot increase priority beyond P1.');
  }
  if (direction === 'down' && index === URGENCY_SEQUENCE.length - 1) {
    throw new BadRequestError('Cannot decrease priority below P4.');
  }

  return direction === 'up'
    ? URGENCY_SEQUENCE[index - 1]
    : URGENCY_SEQUENCE[index + 1];
}

function assertTaskFound<T>(task: T | null, taskId: string): asserts task is T {
  if (!task) {
    throw new NotFoundError(`Task ${taskId} not found.`);
  }
}

export async function listTasks(options: ListTasksOptions = {}) {
  const { status = 'Open', search, projectId, from, to } = options;

  const where: Prisma.TaskWhereInput = {
    status,
    projectId:
      projectId === null
        ? null
        : projectId === undefined
        ? undefined
        : projectId,
  };

  if (from || to) {
    where.dueDate = {
      gte: from ?? undefined,
      lte: to ?? undefined,
    };
  }

  if (search) {
    const trimmed = search.trim();
    if (trimmed.length === 0) {
      return prisma.task.findMany({
        where,
        include: taskInclude,
        orderBy: [{ dueDate: 'asc' }, { urgency: 'asc' }, { createdAt: 'asc' }],
      });
    }

    const containsFilter: Prisma.StringFilter = {
      contains: trimmed,
    };

    where.OR = [
      { title: containsFilter },
      { description: containsFilter },
      { project: { is: { name: containsFilter } } },
      { url1: containsFilter },
      { url2: containsFilter },
      { url3: containsFilter },
    ];
  }

  return prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ dueDate: 'asc' }, { urgency: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getTaskById(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: taskInclude,
  });
  assertTaskFound(task, taskId);
  return task;
}

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  dueDate?: Date;
  urgency?: Urgency;
  projectId?: string | null;
  followUpItem?: boolean;
  url1?: string | null;
  url2?: string | null;
  url3?: string | null;
};

export async function createTask(input: CreateTaskInput) {
  const dueDate = toStartOfDay(input.dueDate ?? new Date());

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      dueDate,
      urgency: input.urgency ?? 'P3',
      projectId: input.projectId ?? undefined,
      followUpItem: input.followUpItem ?? false,
      url1: input.url1,
      url2: input.url2,
      url3: input.url3,
    },
    include: taskInclude,
  });

  taskEvents.emit('task.created', { task });
  return task;
}

export type UpdateTaskInput = Partial<Omit<CreateTaskInput, 'title'>> & {
  title?: string;
  status?: 'Open' | 'Completed';
};

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
  });
  assertTaskFound(existing, taskId);

  const data: Prisma.TaskUpdateInput = {
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    urgency: input.urgency ?? existing.urgency,
    followUpItem: input.followUpItem ?? existing.followUpItem,
    url1: input.url1 ?? existing.url1,
    url2: input.url2 ?? existing.url2,
    url3: input.url3 ?? existing.url3,
  };

  if (input.projectId !== undefined) {
    data.project =
      input.projectId === null
        ? { disconnect: true }
        : { connect: { id: input.projectId } };
  }

  if (input.dueDate) {
    data.dueDate = toStartOfDay(input.dueDate);
  }

  if (input.status) {
    data.status = input.status;
    if (input.status === 'Completed') {
      data.completedDate = new Date();
    } else {
      data.completedDate = null;
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data,
    include: taskInclude,
  });

  taskEvents.emit('task.updated', { task: updated });
  return updated;
}

export async function deleteTask(taskId: string) {
  await prisma.task.delete({ where: { id: taskId } });
  taskEvents.emit('task.deleted', { taskId });
}

export async function moveTaskPriority(taskId: string, direction: 'up' | 'down') {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  assertTaskFound(task, taskId);

  const nextUrgency = clampUrgency(direction, task.urgency as Urgency);

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { urgency: nextUrgency },
    include: taskInclude,
  });

  taskEvents.emit('task.updated', { task: updated });
  return updated;
}

export async function moveTaskDueDate(
  taskId: string,
  type: 'nextDay' | 'plusTwo' | 'nextMonday',
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  assertTaskFound(task, taskId);

  const current = toStartOfDay(task.dueDate);

  const newDate =
    type === 'nextDay'
      ? moveToNextDay(current)
      : type === 'plusTwo'
      ? moveToPlusTwoDays(current)
      : moveToNextWeek(current);

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { dueDate: newDate },
    include: taskInclude,
  });

  taskEvents.emit('task.updated', { task: updated });
  return updated;
}

export async function markTaskComplete(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  assertTaskFound(task, taskId);

  if (task.status === 'Completed') {
    return task;
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: 'Completed', completedDate: new Date() },
    include: taskInclude,
  });

  taskEvents.emit('task.completed', { task: updated });
  return updated;
}

export async function rolloverOpenTasks(today = new Date()) {
  const todayStart = toStartOfDay(today);

  const overdueTasks = await prisma.task.findMany({
    where: {
      status: 'Open',
      dueDate: {
        lt: todayStart,
      },
    },
  });

  if (overdueTasks.length === 0) {
    return [];
  }

  const updates = await prisma.$transaction(
    overdueTasks.map((task) =>
      prisma.task.update({
        where: { id: task.id },
        data: { dueDate: todayStart },
        include: taskInclude,
      }),
    ),
  );

  updates.forEach((task) => taskEvents.emit('task.updated', { task }));
  return updates;
}
