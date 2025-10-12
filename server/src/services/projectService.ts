import { prisma } from '../lib/prisma.js';
import { BadRequestError } from '../utils/errors.js';

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

export async function createProject(name: string) {
  if (!name.trim()) {
    throw new BadRequestError('Project name is required.');
  }

  return prisma.project.create({
    data: { name: name.trim() },
  });
}
