declare global {
  namespace Express {
    interface Request {
      propertyName: string;
    }
  }
}
