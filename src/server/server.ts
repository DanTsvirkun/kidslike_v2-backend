import cors from "cors";
import path from "path";
import express, { Application, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import authRouter from "../auth/auth.router";
import childRouter from "../DB-entities/child/child.router";
import taskRouter from "../DB-entities/task/task.router";
import habitRouter from "../DB-entities/habit/habit.router";
import giftRouter from "../DB-entities/gift/gift.router";
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const swaggerDocument = require("../../swagger.json");

export default class Server {
  app: Application;

  constructor() {
    this.app = (null as unknown) as Application;
  }

  async start() {
    this.initServer();
    this.initMiddlewares();
    await this.initDbConnection();
    this.initRoutes();
    this.initErrorHandling();
    this.initListening();
  }

  startForTesting() {
    this.initServer();
    this.initMiddlewares();
    this.initRoutes();
    this.initErrorHandling();
    return this.app;
  }

  private initServer() {
    this.app = express();
  }

  private initMiddlewares() {
    this.app.use(express.json());
    this.app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
  }

  private async initDbConnection() {
    try {
      await mongoose.connect(process.env.MONGODB_URL as string, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true,
      });
      console.log("Database connection is successful");
    } catch (error) {
      console.log("Database connection failed");
      process.exit(1);
    }
  }

  private initRoutes() {
    this.app.use("/auth", authRouter);
    this.app.use("/child", childRouter);
    this.app.use("/task", taskRouter);
    this.app.use("/habit", habitRouter);
    this.app.use("/gift", giftRouter);
    this.app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument)
    );
  }

  private initErrorHandling() {
    this.app.use(
      (err: any, req: Request, res: Response, next: NextFunction): Response => {
        let status = 500;
        if (err.response) {
          status = err.response.status;
        }
        return res.status(status).send(err.message);
      }
    );
  }

  private initListening() {
    this.app.listen(process.env.PORT || 3000, () =>
      console.log("Started listening on port", process.env.PORT)
    );
  }
}
