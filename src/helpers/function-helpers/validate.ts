import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";
import { ControllerFunction } from "../typescript-helpers/types";
import { ReqBodyParts } from "../typescript-helpers/enums";

export default (schema: ObjectSchema, reqPart = "body"): ControllerFunction => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationResult = schema.validate(req[reqPart as ReqBodyParts]);
    if (validationResult.error) {
      return res.status(400).send({ message: validationResult.error.message });
    }
    next();
  };
};
