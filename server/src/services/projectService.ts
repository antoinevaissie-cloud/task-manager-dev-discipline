import { prisma } from '../lib/prisma.js';
import { BadRequestError } from '../utils/errors.js';

export const PROJECT_STATUSES = ['Open', 'In Progress', 'Completed'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export async function listProjects() {
  return prisma.project.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });
}

type CreateProjectInput = {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
};

export async function createProject(input: CreateProjectInput) {
  const name = input.name.trim();
  if (!name) {
    throw new BadRequestError('Project name is required.');
  }

  const status = input.status ?? 'Open';
  if (!PROJECT_STATUSES.includes(status)) {
    throw new BadRequestError('Invalid project status.');
  }

  return prisma.project.create({
    data: {
      name,
      description: input.description?.trim() || null,
      status,
    },
  });
}
