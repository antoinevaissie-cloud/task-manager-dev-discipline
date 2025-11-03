import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import tasksRouter from './routes/tasks.js';
import projectsRouter from './routes/projects.js';
import aiRouter from './routes/ai.js';
import agentsRouter from './routes/agents.js';
import { scheduleRolloverJob } from './jobs/rollover.js';
import { errorHandler } from './middleware/errorHandler.js';
import { taskEvents } from './realtime/events.js';
import { rolloverOpenTasks } from './services/taskService.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log(`socket connected: ${socket.id}`);
});

taskEvents.on('task.created', (payload) => {
  io.emit('tasks:created', payload);
});

taskEvents.on('task.updated', (payload) => {
  io.emit('tasks:updated', payload);
});

taskEvents.on('task.completed', (payload) => {
  io.emit('tasks:completed', payload);
});

taskEvents.on('task.deleted', (payload) => {
  io.emit('tasks:deleted', payload);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/tasks', tasksRouter);
app.use('/projects', projectsRouter);
app.use('/api', aiRouter);
app.use('/api/agents', agentsRouter);
app.use(errorHandler);

const PORT = Number(process.env.PORT ?? 4000);

server.listen(PORT, () => {
  console.log(`Task Manager API listening on port ${PORT}`);
});

scheduleRolloverJob();
rolloverOpenTasks().catch((error) => {
  console.error('Failed to perform initial rollover', error);
});
