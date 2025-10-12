import { EventEmitter } from 'node:events';
import type { Task } from '@prisma/client';

type TaskEventPayload = {
  task: Task;
};

type TaskDeletedEventPayload = {
  taskId: string;
};

type TaskEventName = 'task.created' | 'task.updated' | 'task.completed' | 'task.deleted';

class TaskEventEmitter extends EventEmitter {
  emit(eventName: TaskEventName, payload: TaskEventPayload | TaskDeletedEventPayload) {
    return super.emit(eventName, payload);
  }

  on(
    eventName: TaskEventName,
    listener: (payload: TaskEventPayload | TaskDeletedEventPayload) => void,
  ) {
    return super.on(eventName, listener);
  }
}

export const taskEvents = new TaskEventEmitter();
