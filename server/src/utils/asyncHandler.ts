import type { NextFunction, Request, Response } from 'express';

export function asyncHandler<
  Req extends Request = Request,
  Res extends Response = Response,
  Params extends any[] = any[],
>(fn: (req: Req, res: Res, next: NextFunction, ...args: Params) => Promise<void>) {
  return (req: Req, res: Res, next: NextFunction, ...args: Params) => {
    fn(req, res, next, ...args).catch(next);
  };
}
