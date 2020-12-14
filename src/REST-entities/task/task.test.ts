import mongoose from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import Server from "../../server/server";
import {
  IChild,
  IChildPopulated,
  ITask,
} from "../../helpers/typescript-helpers/interfaces";
import { Gender } from "../../helpers/typescript-helpers/enums";
import UserModel from "../user/user.model";
import SessionModel from "../session/session.model";
import ChildModel from "../child/child.model";
import TaskModel from "./task.model";
import { TaskStatus } from "../../helpers/typescript-helpers/enums";

describe("Task router test suite", () => {
  let app: Application;
  let createdChild: IChild | IChildPopulated | null;
  let secondCreatedChild: IChild | IChildPopulated | null;
  let response: Response;
  let secondResponse: Response;
  let thirdResponse: Response;
  let fourthResponse: Response;
  let accessToken: string;
  let secondAccessToken: string;
  let createdTask: ITask | null;
  let secondCreatedTask: ITask | null;
  let updatedChild: IChild | IChildPopulated | null;
  let confirmedTask: ITask | null;

  beforeAll(async () => {
    app = new Server().startForTesting();
    const url = `mongodb://127.0.0.1/task`;
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    await supertest(app).post("/auth/register").send({
      email: "test@email.com",
      password: "qwerty123",
      username: "Test",
    });
    await supertest(app).post("/auth/register").send({
      email: "test2@email.com",
      password: "qwerty123",
      username: "Test2",
    });
    response = await supertest(app)
      .post("/auth/login")
      .send({ email: "test@email.com", password: "qwerty123" });
    secondResponse = await supertest(app)
      .post("/auth/login")
      .send({ email: "test2@email.com", password: "qwerty123" });
    accessToken = response.body.accessToken;
    secondAccessToken = secondResponse.body.accessToken;
    thirdResponse = await supertest(app)
      .post("/child")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test", gender: Gender.MALE });
    fourthResponse = await supertest(app)
      .post("/child")
      .set("Authorization", `Bearer ${secondAccessToken}`)
      .send({ name: "Test", gender: Gender.FEMALE });
    createdChild = await ChildModel.findById(thirdResponse.body.id);
    secondCreatedChild = await ChildModel.findById(fourthResponse.body.id);
  });

  afterAll(async () => {
    await UserModel.deleteOne({ email: response.body.data.email });
    await UserModel.deleteOne({ email: secondResponse.body.data.email });
    await SessionModel.deleteOne({ _id: response.body.sid });
    await SessionModel.deleteOne({ _id: secondResponse.body.sid });
    await ChildModel.deleteOne({ _id: (createdChild as IChild)._id });
    await ChildModel.deleteOne({ _id: (secondCreatedChild as IChild)._id });
    await mongoose.connection.close();
  });

  describe("POST /task/{taskId}", () => {
    let response: Response;

    const validReqBody = {
      name: "Test",
      reward: 1,
      daysToComplete: 1,
    };

    const secondValidReqBody = {
      name: "Test",
      reward: 1,
    };

    const invalidReqBody = {
      name: "Test",
      reward: 0,
    };

    const secondInvalidReqBody = {
      name: "Test",
      reward: 1,
      daysToComplete: 0,
    };

    const thirdInvalidReqBody = {
      name: "Test",
    };

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    afterAll(async () => {
      await supertest(app)
        .post(`/task/${(secondCreatedChild as IChild)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`)
        .send(validReqBody);
    });

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/task/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        createdTask = await TaskModel.findById(response.body.id);
        updatedChild = await ChildModel.findById((createdChild as IChild)._id);
      });

      it("Should return a 201 status code", () => {
        expect(response.status).toBe(201);
      });

      it("Should create a new task in DB", () => {
        expect(createdTask).toBeTruthy();
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          name: validReqBody.name,
          reward: validReqBody.reward,
          isCompleted: "unknown",
          daysToComplete: 1,
          startDate: (createdTask as ITask).startDate,
          endDate: (createdTask as ITask).endDate,
          childId: (createdChild as IChild)._id.toString(),
          id: (createdTask as ITask)._id.toString(),
        });
      });

      it("Should add a new task to child document in DB", () => {
        expect(
          (updatedChild as IChild).tasks.find(
            (taskId) => taskId.toString() === response.body.id.toString()
          )
        ).toBeTruthy();
      });
    });

    context("With secondValidReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/task/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(secondValidReqBody);
        secondCreatedTask = await TaskModel.findById(response.body.id);
        updatedChild = await ChildModel.findById((createdChild as IChild)._id);
      });

      it("Should return a 201 status code", () => {
        expect(response.status).toBe(201);
      });

      it("Should create a new task in DB", () => {
        expect(secondCreatedTask).toBeTruthy();
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          name: validReqBody.name,
          reward: validReqBody.reward,
          isCompleted: "unknown",
          childId: (createdChild as IChild)._id.toString(),
          id: (secondCreatedTask as ITask)._id.toString(),
        });
      });

      it("Should add a new task to child document in DB", () => {
        expect(
          (updatedChild as IChild).tasks.find(
            (taskId) => taskId.toString() === response.body.id.toString()
          )
        ).toBeTruthy();
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/task/${(createdChild as IChild)._id}`)
          .send(validReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid accessToken", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/task/${(createdChild as IChild)._id}`)
          .send(validReqBody)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With invalidReqBody ('reward' = 0)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/task/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'reward' must be greater than or equal to 1", () => {
        expect(response.body.message).toBe(
          '"reward" must be greater than or equal to 1'
        );
      });
    });

    context("With secondInvalidReqBody ('daysToComplete' = 0)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/task/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(secondInvalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'daysToComplete' must be greater than or equal to 1", () => {
        expect(response.body.message).toBe(
          '"daysToComplete" must be greater than or equal to 1'
        );
      });
    });

    context("With thirdInvalidReqBody (no 'reward' provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/task/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(thirdInvalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'reward' is required", () => {
        expect(response.body.message).toBe('"reward" is required');
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/task/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`)
          .send(validReqBody);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that child wasn't found", () => {
        expect(response.body.message).toBe("Child not found");
      });
    });

    context("With invalid 'taskId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/task/qwerty123")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'childId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'childId'. Must be a MongoDB ObjectId"
        );
      });
    });
  });

  describe("GET /task", () => {
    let response: Response;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get("/task")
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual([
          [
            {
              name: "Test",
              reward: 1,
              isCompleted: "unknown",
              daysToComplete: 1,
              startDate: (createdTask as ITask).startDate,
              endDate: (createdTask as ITask).endDate,
              childId: (createdChild as IChild)._id.toString(),
              id: (createdTask as ITask)._id.toString(),
            },
            {
              name: "Test",
              reward: 1,
              isCompleted: "unknown",
              childId: (createdChild as IChild)._id.toString(),
              id: (secondCreatedTask as ITask)._id.toString(),
            },
          ],
        ]);
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).get("/task");
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid accessToken", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get("/task")
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });
  });

  describe("PATCH /task/{taskId}", () => {
    let response: Response;
    let updatedTask: ITask | null;

    const validReqBody = {
      name: "Test2",
    };

    const invalidReqBody = {};

    const secondInvalidReqBody = {
      name: "Test2",
      reward: 0,
    };

    const thirdInvalidReqBody = {
      name: "Test2",
      daysToComplete: 0,
    };

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        updatedTask = await TaskModel.findById(
          (createdTask as ITask)._id
        ).lean();
        createdChild = await ChildModel.findById((createdChild as IChild)._id)
          .populate("tasks")
          .lean();
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          name: validReqBody.name,
          reward: 1,
          daysToComplete: 1,
          isCompleted: "unknown",
          startDate: (updatedTask as ITask).startDate,
          endDate: (updatedTask as ITask).endDate,
          childId: (createdChild as IChild)._id.toString(),
          id: (updatedTask as ITask)._id.toString(),
        });
      });

      it("Should update a task in DB", () => {
        expect((updatedTask as ITask).name).toBe("Test2");
      });

      it("Should update a child in DB", () => {
        expect((createdChild as IChild).tasks[0]).toEqual(updatedTask);
      });
    });

    context("Updating secondCreatedTask", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/${(secondCreatedTask as ITask)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        updatedTask = await TaskModel.findById(
          (secondCreatedTask as ITask)._id
        );
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          name: "Test2",
          reward: 1,
          isCompleted: "unknown",
          childId: (createdChild as IChild)._id.toString(),
          id: (updatedTask as ITask)._id.toString(),
        });
      });

      it("Should update a task in DB", () => {
        expect((updatedTask as ITask).name).toBe("Test2");
      });
    });

    context("With invalidReqBody (no fields provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that at least one field is required", () => {
        expect(response.body.message).toBe('"value" must have at least 1 key');
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/${(createdTask as ITask)._id}`)
          .send(validReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid accessToken", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/${(createdTask as ITask)._id}`)
          .send(validReqBody)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With secondInvalidReqBody ('reward' = 0)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(secondInvalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'reward' must be greater than or equal to 1", () => {
        expect(response.body.message).toBe(
          '"reward" must be greater than or equal to 1'
        );
      });
    });

    context("With thirdInvalidReqBody ('daysToComplete' = 0)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(thirdInvalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'daysToComplete' must be greater than or equal to 1", () => {
        expect(response.body.message).toBe(
          '"daysToComplete" must be greater than or equal to 1'
        );
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`)
          .send(validReqBody);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that child wasn't found", () => {
        expect(response.body.message).toBe("Child not found");
      });
    });

    context("With invalid 'taskId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch("/task/qwerty123")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'taskId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'taskId'. Must be a MongoDB ObjectId"
        );
      });
    });
  });

  describe("PATCH /task/confirm/{taskId}", () => {
    let response: Response;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/confirm/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
        confirmedTask = await TaskModel.findById(
          (createdTask as ITask)._id
        ).lean();
        createdChild = await ChildModel.findById((createdChild as IChild)._id)
          .populate("tasks")
          .lean();
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          confirmedTask: {
            name: "Test2",
            reward: 1,
            daysToComplete: 1,
            isCompleted: "confirmed",
            startDate: (confirmedTask as ITask).startDate,
            endDate: (confirmedTask as ITask).endDate,
            childId: (createdChild as IChild)._id.toString(),
            id: (confirmedTask as ITask)._id.toString(),
          },
          updatedRewards: 1,
        });
      });

      it("Should confirm a task in DB", () => {
        expect((confirmedTask as ITask).isCompleted).toBe(TaskStatus.CONFIRMED);
      });

      it("Should update a child in DB", () => {
        expect((createdChild as IChild).tasks[0]).toEqual(confirmedTask);
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).patch(
          `/task/confirm/${(createdTask as ITask)._id}`
        );
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid accessToken", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/confirm/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("Confirming an already confirmed task", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/confirm/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 403 status code", () => {
        expect(response.status).toBe(403);
      });

      it("Should say that this task has already been confirmed", () => {
        expect(response.body.message).toBe("Task is already confirmed");
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/confirm/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that child wasn't found", () => {
        expect(response.body.message).toBe("Child not found");
      });
    });

    context("With invalid 'taskId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch("/task/confirm/qwerty123")
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'taskId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'taskId'. Must be a MongoDB ObjectId"
        );
      });
    });
  });

  describe("GET /finished/{childId}", () => {
    let response: Response;

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get(`/task/finished/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual([
          {
            name: "Test2",
            reward: 1,
            daysToComplete: 1,
            isCompleted: "confirmed",
            startDate: (confirmedTask as ITask).startDate,
            endDate: (confirmedTask as ITask).endDate,
            childId: (createdChild as IChild)._id.toString(),
            id: (confirmedTask as ITask)._id.toString(),
          },
        ]);
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).get(
          `/task/finished/${(createdChild as IChild)._id}`
        );
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get(`/task/finished/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With invalid 'childId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get(`/task/finished/qwerty123`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'childId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'childId'. Must be a MongoDB ObjectId"
        );
      });
    });
  });

  describe("PATCH /task/cancel/{taskId}", () => {
    let response: Response;
    let canceledTask: ITask | null;
    let secondTask: ITask | null;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        secondTask = await TaskModel.findOne({
          childId: (secondCreatedChild as IChild)._id,
        });
        response = await supertest(app)
          .patch(`/task/cancel/${(secondTask as ITask)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`);
        canceledTask = await TaskModel.findById(
          (secondTask as ITask)._id
        ).lean();
        updatedChild = await ChildModel.findById((secondCreatedChild as IChild)._id)
          .populate("tasks")
          .lean();
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          name: "Test",
          reward: 1,
          daysToComplete: 1,
          isCompleted: "canceled",
          startDate: (canceledTask as ITask).startDate,
          endDate: (canceledTask as ITask).endDate,
          childId: (secondCreatedChild as IChild)._id.toString(),
          id: (canceledTask as ITask)._id.toString(),
        });
      });

      it("Should cancel a task in DB", () => {
        expect((canceledTask as ITask).isCompleted).toBe(TaskStatus.CANCELED);
      });

      it("Should update a child in DB", () => {
        expect((updatedChild as IChild).tasks[0]).toEqual(canceledTask);
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).patch(
          `/task/cancel/${(secondTask as ITask)._id}`
        );
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/cancel/${(secondTask as ITask)._id}`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("Canceling an already canceled task", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/cancel/${(secondTask as ITask)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`);
      });

      it("Should return a 403 status code", () => {
        expect(response.status).toBe(403);
      });

      it("Should say that this task has already been canceled", () => {
        expect(response.body.message).toBe("Task is already canceled");
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/cancel/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that child wasn't found", () => {
        expect(response.body.message).toBe("Child not found");
      });
    });

    context("With invalid 'taskId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch("/task/cancel/qwerty123")
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'taskId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'taskId'. Must be a MongoDB ObjectId"
        );
      });
    });
  });

  describe("PATCH /task/reset/{taskId}", () => {
    let response: Response;
    let unknownTask: ITask | null;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/reset/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
        unknownTask = await TaskModel.findById(
          (createdTask as ITask)._id
        ).lean();
        createdChild = await ChildModel.findById((createdChild as IChild)._id)
          .populate("tasks")
          .lean();
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          name: "Test2",
          reward: 1,
          daysToComplete: 1,
          isCompleted: "unknown",
          startDate: (unknownTask as ITask).startDate,
          endDate: (unknownTask as ITask).endDate,
          childId: (createdChild as IChild)._id.toString(),
          id: (unknownTask as ITask)._id.toString(),
        });
      });

      it("Should update a task in DB", () => {
        expect((unknownTask as ITask).isCompleted).toBe(TaskStatus.UNKNOWN);
      });

      it("Should update a child in DB", () => {
        expect((createdChild as IChild).tasks[0]).toEqual(unknownTask);
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).patch(
          `/task/reset/${(createdTask as ITask)._id}`
        );
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid accessToken", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/reset/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("Reseting an already unknown task", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/reset/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 403 status code", () => {
        expect(response.status).toBe(403);
      });

      it("Should say that this task has already been already reset", () => {
        expect(response.body.message).toBe("Task has been already reset");
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/task/reset/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that child wasn't found", () => {
        expect(response.body.message).toBe("Child not found");
      });
    });

    context("With invalid 'taskId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch("/task/reset/qwerty123")
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'taskId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'taskId'. Must be a MongoDB ObjectId"
        );
      });
    });
  });

  describe("DELETE /task/{taskId}", () => {
    let response: Response;
    let secondTask: ITask | null;
    let deletedTask: ITask | null;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    afterAll(async () => {
      await supertest(app)
        .delete(`/task/${(secondTask as ITask)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);
      await supertest(app)
        .delete(`/task/${(secondCreatedTask as ITask)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
    });

    context("With another account", () => {
      beforeAll(async () => {
        secondTask = await TaskModel.findOne({
          childId: (secondCreatedChild as IChild)._id,
        });
        response = await supertest(app)
          .delete(`/task/${(secondTask as ITask)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that child wasn't found", () => {
        expect(response.body.message).toBe("Child not found");
      });
    });

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete(`/task/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
        deletedTask = await TaskModel.findById((createdTask as ITask)._id);
      });

      it("Should return a 204 status code", () => {
        expect(response.status).toBe(204);
      });

      it("Should delete a task from DB", () => {
        expect(deletedTask).toBeFalsy();
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).delete(
          `/task/${(createdTask as ITask)._id}`
        );
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid accessToken", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete(`/task/${(createdTask as ITask)._id}`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With invalid 'taskId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete("/task/qwerty123")
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'taskId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'taskId'. Must be a MongoDB ObjectId"
        );
      });
    });
  });
});
