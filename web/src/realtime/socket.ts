import { io, Socket } from 'socket.io-client';
import type { Task } from '@/types/task';

type TaskServerEvents = {
  'tasks:created': { task: Task };
  'tasks:updated': { task: Task };
  'tasks:completed': { task: Task };
  'tasks:deleted': { taskId: string };
};

type TaskClientEvents = Record<string, never>;

let socket: Socket<TaskServerEvents, TaskClientEvents> | null = null;

export function getSocket() {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket'],
    });
  }
  return socket;
}
