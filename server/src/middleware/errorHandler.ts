import type { NextFunction, Request, Response } from 'express';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  if (err instanceof ZodError) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: 'Validation failed', details: err.issues });
    return;
  }

  if (err && typeof err === 'object' && 'status' in err) {
    const status = Number((err as { status: number }).status);
    const message = (err as { message?: string }).message ?? getReasonPhrase(status);
    res.status(status).json({ error: message });
    return;
  }

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    error: 'Unexpected server error',
  });
}
