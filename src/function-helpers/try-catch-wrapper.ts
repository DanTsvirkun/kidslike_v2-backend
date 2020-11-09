import { Request, Response, NextFunction } from "express";
import { ControllerFunction } from "../typescript-helpers/types";

export default (cb: ControllerFunction) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  return cb(req, res, next).catch((err: any) => next(err));
};
