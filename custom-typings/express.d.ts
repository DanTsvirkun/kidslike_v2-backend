import { Document } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      user: Document | null;
      session: Document | null;
      fileValidationError: string;
    }
  }
}
