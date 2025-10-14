import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createProject, listProjects } from '../services/projectService.js';

const router = Router();
const statusEnum = z.enum(['Open', 'In Progress', 'Completed']);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const projects = await listProjects();
    res.json({ data: projects });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = z
      .object({
        name: z.string().min(1),
        description: z.string().optional(),
        status: statusEnum.optional(),
      })
      .parse(req.body);
    const project = await createProject(payload);
    res.status(201).json({ data: project });
  }),
);

export default router;
