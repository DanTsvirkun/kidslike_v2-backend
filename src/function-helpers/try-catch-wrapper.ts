import { Request, Response, NextFunction } from "express";
import { AxiosError } from "axios";

type ControllerFunction = (
  req: Request,
  res: Response,
  next?: NextFunction
) => any;

export default (cb: ControllerFunction) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return cb(req, res, next).catch((err: AxiosError) => next(err));
};
