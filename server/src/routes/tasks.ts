import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  markTaskComplete,
  moveTaskDueDate,
  moveTaskPriority,
  updateTask,
} from '../services/taskService.js';

const router = Router();

const urgencyEnum = z.enum(['P1', 'P2', 'P3', 'P4']);
const statusEnum = z.enum(['Open', 'Completed']);
const statusFilterEnum = z.enum(['Open', 'Completed', 'All']);

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  urgency: urgencyEnum.optional(),
  projectId: z.string().optional(),
  followUpItem: z.boolean().optional(),
  url1: z.string().url().optional(),
  url2: z.string().url().optional(),
  url3: z.string().url().optional(),
});

const updateTaskSchema = createTaskSchema
  .extend({
    projectId: z.string().nullable().optional(),
    status: statusEnum.optional(),
  })
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one field must be provided to update.',
  );

const movePrioritySchema = z.object({
  direction: z.enum(['up', 'down']),
});

const moveDateSchema = z.object({
  type: z.enum(['nextDay', 'plusTwo', 'nextMonday']),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      status: statusFilterEnum.optional(),
      search: z.string().optional(),
      projectId: z.string().optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    });

    const filters = querySchema.parse(req.query);
    const rawProjectId = filters.projectId;
    const tasks = await listTasks({
      status: filters.status === 'All' ? undefined : filters.status,
      search: filters.search,
      projectId:
        rawProjectId === '__unassigned__'
          ? null
          : rawProjectId ?? undefined,
      from: filters.from ?? null,
      to: filters.to ?? null,
    });
    res.json({ data: tasks });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = createTaskSchema.parse(req.body);
    const task = await createTask(payload);
    res.status(201).json({ data: task });
  }),
);

router.get(
  '/:taskId',
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const task = await getTaskById(taskId);
    res.json({ data: task });
  }),
);

router.patch(
  '/:taskId',
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const payload = updateTaskSchema.parse(req.body);
    const task = await updateTask(taskId, payload);
    res.json({ data: task });
  }),
);

router.delete(
  '/:taskId',
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    await deleteTask(taskId);
    res.status(204).send();
  }),
);

router.post(
  '/:taskId/actions/move-priority',
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const payload = movePrioritySchema.parse(req.body);
    const task = await moveTaskPriority(taskId, payload.direction);
    res.json({ data: task });
  }),
);

router.post(
  '/:taskId/actions/move-date',
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const payload = moveDateSchema.parse(req.body);
    const task = await moveTaskDueDate(taskId, payload.type);
    res.json({ data: task });
  }),
);

router.post(
  '/:taskId/actions/complete',
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const task = await markTaskComplete(taskId);
    res.json({ data: task });
  }),
);

export default router;
