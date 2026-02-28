import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import type { ArcDatabase } from '../db/database.js';
import type { Task, TaskStatus } from '../types.js';

export function createTaskRoutes(db: ArcDatabase): Router {
  const router = Router();

  // List tasks (filter by squadId, status)
  router.get('/', (req, res) => {
    const squadId = req.query.squadId as string | undefined;
    const status = req.query.status as TaskStatus | undefined;
    res.json(db.listTasks(squadId, status));
  });

  // Get task
  router.get('/:id', (req, res) => {
    const task = db.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  });

  // Create task
  router.post('/', (req, res) => {
    const { squadId, title, description } = req.body;
    if (!squadId || !title) return res.status(400).json({ error: 'squadId and title are required' });

    const squad = db.getSquad(squadId);
    if (!squad) return res.status(404).json({ error: 'Squad not found' });

    const now = Date.now();
    const task: Task = {
      id: uuid(),
      squadId,
      title,
      description: description || '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    db.createTask(task);
    res.status(201).json(task);
  });

  // Update task
  router.patch('/:id', (req, res) => {
    const task = db.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    db.updateTask(req.params.id, req.body);
    res.json(db.getTask(req.params.id));
  });

  // Delete task
  router.delete('/:id', (req, res) => {
    const ok = db.deleteTask(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Task not found' });
    res.json({ deleted: true });
  });

  return router;
}
