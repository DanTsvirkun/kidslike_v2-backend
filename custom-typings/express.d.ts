import {
  IParent,
  ISession,
  IParentPopulated,
} from "../src/helpers/typescript-helpers/interfaces";

declare global {
  namespace Express {
    interface Request {
      user: IParent | IParentPopulated | null;
      session: ISession | null;
      fileValidationError: string;
    }
  }
}
