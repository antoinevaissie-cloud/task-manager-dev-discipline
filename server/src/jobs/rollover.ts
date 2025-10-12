import cron from 'node-cron';
import { rolloverOpenTasks } from '../services/taskService.js';

const DEFAULT_CRON = '0 2 * * *';

export function scheduleRolloverJob() {
  const cronExpression = process.env.ROLL_OVER_CRON ?? DEFAULT_CRON;

  return cron.schedule(
    cronExpression,
    async () => {
      try {
        const updates = await rolloverOpenTasks();
        if (updates.length > 0) {
          console.log(`Rollover job updated ${updates.length} task(s).`);
        }
      } catch (error) {
        console.error('Failed to execute rollover job', error);
      }
    },
    { timezone: process.env.TZ ?? 'UTC' },
  );
}
