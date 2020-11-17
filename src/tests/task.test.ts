import mongoose, { Document } from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import Server from "../server/server";
import { IChild, ITask } from "./../helpers/typescript-helpers/interfaces";
import UserModel from "../DB-entities/user/user.model";
import SessionModel from "../DB-entities/session/session.model";
import ChildModel from "../DB-entities/child/child.model";
import TaskModel from "../DB-entities/task/task.model";
import { TaskStatus } from "../helpers/typescript-helpers/enums";

describe("Task router test suite", () => {
  let app: Application;
  let createdChild: Document | null;
  let secondCreatedChild: Document | null;
  let response: Response;
  let secondResponse: Response;
  let thirdResponse: Response;
  let fourthResponse: Response;
  let accessToken: string;
  let secondAccessToken: string;
  let createdTask: Document | null;
  let updatedChild: Document | null;

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
      .send({ name: "Test", gender: "male" });
    fourthResponse = await supertest(app)
      .post("/child")
      .set("Authorization", `Bearer ${secondAccessToken}`)
      .send({ name: "Test", gender: "female" });
    createdChild = await ChildModel.findById(thirdResponse.body._id);
    secondCreatedChild = await ChildModel.findById(fourthResponse.body._id);
  });

  afterAll(async () => {
    await UserModel.deleteOne({ email: "test@email.com" });
    await UserModel.deleteOne({ email: "test2@email.com" });
    await SessionModel.deleteOne({ _id: response.body.sid });
    await SessionModel.deleteOne({ _id: secondResponse.body.sid });
    await ChildModel.deleteOne({ _id: (createdChild as IChild)._id });
    await ChildModel.deleteOne({ _id: (secondCreatedChild as IChild)._id });
    await mongoose.connection.close();
  });

  describe("POST /task/{taskId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let fifthResponse: Response;
    let sixthResponse: Response;
    let seventhResponse: Response;

    const validReqBody = {
      name: "Test",
      reward: 1,
      daysToComplete: 1,
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

    beforeAll(async () => {
      response = await supertest(app)
        .post(`/task/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(validReqBody);
      secondResponse = await supertest(app)
        .post(`/task/${(createdChild as IChild)._id}`)
        .send(validReqBody);
      thirdResponse = await supertest(app)
        .post(`/task/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer qwerty123`)
        .send(validReqBody);
      fourthResponse = await supertest(app)
        .post(`/task/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(invalidReqBody);
      fifthResponse = await supertest(app)
        .post(`/task/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(secondInvalidReqBody);
      sixthResponse = await supertest(app)
        .post(`/task/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(thirdInvalidReqBody);
      seventhResponse = await supertest(app)
        .post(`/task/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`)
        .send(validReqBody);
      await supertest(app)
        .post(`/task/${(secondCreatedChild as IChild)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`)
        .send(validReqBody);
      createdTask = await TaskModel.findById(response.body._id);
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
        ...(createdTask as ITask).toObject(),
        childId: (createdTask as ITask).childId.toString(),
        _id: (createdTask as ITask)._id.toString(),
      });
    });

    it("Should add a new task to child document in DB", () => {
      expect(
        (updatedChild as IChild).tasks.find(
          (taskId) => taskId.toString() === response.body._id.toString()
        )
      ).toBeTruthy();
    });

    it("Should return a 400 status code", () => {
      expect(secondResponse.status).toBe(400);
    });

    it("Should say that token wasn't provided", () => {
      expect(secondResponse.body.message).toBe("No token provided");
    });

    it("Should return a 401 status code", () => {
      expect(thirdResponse.status).toBe(401);
    });

    it("Should return an unauthorized status", () => {
      expect(thirdResponse.body.message).toBe("Unauthorized");
    });

    it("Should return a 400 status code", () => {
      expect(fourthResponse.status).toBe(400);
    });

    it("Should say that reward must be greater or equal to 1", () => {
      expect(fourthResponse.body.message).toBe(
        "reward must be greater or equal to 1"
      );
    });

    it("Should return a 400 status code", () => {
      expect(fifthResponse.status).toBe(400);
    });

    it("Should say that daysToComplete must be greater or equal to 1", () => {
      expect(fifthResponse.body.message).toBe(
        "daysToComplete must be greater or equal to 1"
      );
    });

    it("Should return a 400 status code", () => {
      expect(sixthResponse.status).toBe(400);
    });

    it("Should return a 404 status code", () => {
      expect(seventhResponse.status).toBe(404);
    });

    it("Should say that child wasn't found", () => {
      expect(seventhResponse.body.message).toBe("Child not found");
    });
  });

  describe("GET /task", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let updatedTask: Document | null;

    beforeAll(async () => {
      response = await supertest(app)
        .get("/task")
        .set("Authorization", `Bearer ${accessToken}`);
      secondResponse = await supertest(app).get("/task");
      thirdResponse = await supertest(app)
        .get("/task")
        .set("Authorization", `Bearer qwerty123`);
      updatedTask = await TaskModel.findById((createdTask as ITask)._id);
    });

    it("Should return a 200 status code", () => {
      expect(response.status).toBe(200);
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual([
        [
          {
            ...(updatedTask as ITask).toObject(),
            childId: (updatedTask as ITask).childId.toString(),
            _id: (updatedTask as ITask)._id.toString(),
          },
        ],
      ]);
    });

    it("Should return a 400 status code", () => {
      expect(secondResponse.status).toBe(400);
    });

    it("Should return a 401 status code", () => {
      expect(thirdResponse.status).toBe(401);
    });

    it("Should return an unauthorized status", () => {
      expect(thirdResponse.body.message).toBe("Unauthorized");
    });
  });

  describe("PATCH /task/{taskId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let fifthResponse: Response;
    let sixthResponse: Response;
    let seventhResponse: Response;
    let updatedTask: Document | null;
    let secondTask: Document | null;

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

    beforeAll(async () => {
      response = await supertest(app)
        .patch(`/task/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(validReqBody);
      secondResponse = await supertest(app)
        .patch(`/task/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(invalidReqBody);
      thirdResponse = await supertest(app)
        .patch(`/task/${(createdTask as ITask)._id}`)
        .send(validReqBody);
      fourthResponse = await supertest(app)
        .patch(`/task/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer qwerty123`)
        .send(validReqBody);
      fifthResponse = await supertest(app)
        .patch(`/task/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(secondInvalidReqBody);
      sixthResponse = await supertest(app)
        .patch(`/task/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(thirdInvalidReqBody);
      updatedTask = await TaskModel.findById((createdTask as ITask)._id);
      secondTask = await TaskModel.findOne({
        childId: (secondCreatedChild as IChild)._id,
      });
      seventhResponse = await supertest(app)
        .patch(`/task/${(secondTask as ITask)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(validReqBody);
    });

    it("Should return a 200 status code", () => {
      expect(response.status).toBe(200);
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual({
        ...(updatedTask as ITask).toObject(),
        ...validReqBody,
        childId: (updatedTask as ITask).childId.toString(),
        _id: (updatedTask as ITask)._id.toString(),
      });
    });

    it("Should update a task in DB", () => {
      expect((updatedTask as ITask).name).toBe("Test2");
    });

    it("Should return a 400 status code", () => {
      expect(secondResponse.status).toBe(400);
    });

    it("Should return a 400 status code", () => {
      expect(thirdResponse.status).toBe(400);
    });

    it("Should say that token wasn't provided", () => {
      expect(thirdResponse.body.message).toBe("No token provided");
    });

    it("Should return a 401 status code", () => {
      expect(fourthResponse.status).toBe(401);
    });

    it("Should return an unauthorized status", () => {
      expect(fourthResponse.body.message).toBe("Unauthorized");
    });

    it("Should return a 400 status code", () => {
      expect(fifthResponse.status).toBe(400);
    });

    it("Should say that reward must be greater or equal to 1", () => {
      expect(fifthResponse.body.message).toBe(
        "reward must be greater or equal to 1"
      );
    });

    it("Should return a 400 status code", () => {
      expect(sixthResponse.status).toBe(400);
    });

    it("Should say that daysToComplete must be greater or equal to 1", () => {
      expect(sixthResponse.body.message).toBe(
        "daysToComplete must be greater or equal to 1"
      );
    });

    it("Should return a 404 status code", () => {
      expect(seventhResponse.status).toBe(404);
    });

    it("Should say that child wasn't found", () => {
      expect(seventhResponse.body.message).toBe("Child not found");
    });
  });

  describe("PATCH /task/confirm/{taskId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let fifthResponse: Response;
    let confirmedTask: Document | null;
    let secondTask: Document | null;

    beforeAll(async () => {
      response = await supertest(app)
        .patch(`/task/confirm/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      secondResponse = await supertest(app).patch(
        `/task/confirm/${(createdTask as ITask)._id}`
      );
      thirdResponse = await supertest(app)
        .patch(`/task/confirm/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer qwerty123`);
      fourthResponse = await supertest(app)
        .patch(`/task/confirm/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      confirmedTask = await TaskModel.findById((createdTask as ITask)._id);
      secondTask = await TaskModel.findOne({
        childId: (secondCreatedChild as IChild)._id,
      });
      fifthResponse = await supertest(app)
        .patch(`/task/confirm/${(secondTask as ITask)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
    });

    it("Should return a 200 status code", () => {
      expect(response.status).toBe(200);
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual({
        confirmedTask: {
          ...(confirmedTask as ITask).toObject(),
          _id: (confirmedTask as ITask)._id.toString(),
          childId: (confirmedTask as ITask).childId.toString(),
        },
        updatedRewards: 1,
      });
    });

    it("Should confirm a task in DB", () => {
      expect((confirmedTask as ITask).isCompleted).toBe(TaskStatus.Confirmed);
    });

    it("Should return a 400 status code", () => {
      expect(secondResponse.status).toBe(400);
    });

    it("Should say that token wasn't provided", () => {
      expect(secondResponse.body.message).toBe("No token provided");
    });

    it("Should return a 401 status code", () => {
      expect(thirdResponse.status).toBe(401);
    });

    it("Should return an unauthorized status", () => {
      expect(thirdResponse.body.message).toBe("Unauthorized");
    });

    it("Should return a 403 status code", () => {
      expect(fourthResponse.status).toBe(403);
    });

    it("Should say that this task has already been confirmed", () => {
      expect(fourthResponse.body.message).toBe("Task is already confirmed");
    });

    it("Should return a 404 status code", () => {
      expect(fifthResponse.status).toBe(404);
    });

    it("Should say that child wasn't found", () => {
      expect(fifthResponse.body.message).toBe("Child not found");
    });
  });

  describe("PATCH /task/cancel/{taskId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let fifthResponse: Response;
    let canceledTask: Document | null;
    let secondTask: Document | null;

    beforeAll(async () => {
      secondTask = await TaskModel.findOne({
        childId: (secondCreatedChild as IChild)._id,
      });
      response = await supertest(app)
        .patch(`/task/cancel/${(secondTask as ITask)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);
      secondResponse = await supertest(app).patch(
        `/task/confirm/${(secondTask as ITask)._id}`
      );
      thirdResponse = await supertest(app)
        .patch(`/task/cancel/${(secondTask as ITask)._id}`)
        .set("Authorization", `Bearer qwerty123`);
      fourthResponse = await supertest(app)
        .patch(`/task/cancel/${(secondTask as ITask)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);
      canceledTask = await TaskModel.findById((secondTask as ITask)._id);
      fifthResponse = await supertest(app)
        .patch(`/task/cancel/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);
    });

    it("Should return a 200 status code", () => {
      expect(response.status).toBe(200);
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual({
        ...(canceledTask as ITask).toObject(),
        _id: (canceledTask as ITask)._id.toString(),
        childId: (canceledTask as ITask).childId.toString(),
      });
    });

    it("Should cancel a task in DB", () => {
      expect((canceledTask as ITask).isCompleted).toBe(TaskStatus.Canceled);
    });

    it("Should return a 400 status code", () => {
      expect(secondResponse.status).toBe(400);
    });

    it("Should say that token wasn't provided", () => {
      expect(secondResponse.body.message).toBe("No token provided");
    });

    it("Should return a 401 status code", () => {
      expect(thirdResponse.status).toBe(401);
    });

    it("Should return an unauthorized status", () => {
      expect(thirdResponse.body.message).toBe("Unauthorized");
    });

    it("Should return a 403 status code", () => {
      expect(fourthResponse.status).toBe(403);
    });

    it("Should say that this task has already been canceled", () => {
      expect(fourthResponse.body.message).toBe("Task is already canceled");
    });

    it("Should return a 404 status code", () => {
      expect(fifthResponse.status).toBe(404);
    });

    it("Should say that child wasn't found", () => {
      expect(fifthResponse.body.message).toBe("Child not found");
    });
  });

  describe("PATCH /task/reset/{taskId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let fifthResponse: Response;
    let unknownTask: Document | null;
    let secondTask: Document | null;

    beforeAll(async () => {
      response = await supertest(app)
        .patch(`/task/reset/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      secondResponse = await supertest(app).patch(
        `/task/reset/${(createdTask as ITask)._id}`
      );
      thirdResponse = await supertest(app)
        .patch(`/task/reset/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer qwerty123`);
      fourthResponse = await supertest(app)
        .patch(`/task/reset/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      unknownTask = await TaskModel.findById((createdTask as ITask)._id);
      secondTask = await TaskModel.findOne({
        childId: (secondCreatedChild as IChild)._id,
      });
      fourthResponse = await supertest(app)
        .patch(`/task/reset/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      fifthResponse = await supertest(app)
        .patch(`/task/reset/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);
    });

    it("Should return a 200 status code", () => {
      expect(response.status).toBe(200);
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual({
        ...(unknownTask as ITask).toObject(),
        _id: (unknownTask as ITask)._id.toString(),
        childId: (unknownTask as ITask).childId.toString(),
      });
    });

    it("Should update a task in DB", () => {
      expect((unknownTask as ITask).isCompleted).toBe(TaskStatus.Unknown);
    });

    it("Should return a 400 status code", () => {
      expect(secondResponse.status).toBe(400);
    });

    it("Should say that token wasn't provided", () => {
      expect(secondResponse.body.message).toBe("No token provided");
    });

    it("Should return a 401 status code", () => {
      expect(thirdResponse.status).toBe(401);
    });

    it("Should return an unauthorized status", () => {
      expect(thirdResponse.body.message).toBe("Unauthorized");
    });

    it("Should return a 403 status code", () => {
      expect(fourthResponse.status).toBe(403);
    });

    it("Should say that this task has already been already reset", () => {
      expect(fourthResponse.body.message).toBe("Task has been already reset");
    });

    it("Should return a 404 status code", () => {
      expect(fifthResponse.status).toBe(404);
    });

    it("Should say that child wasn't found", () => {
      expect(fifthResponse.body.message).toBe("Child not found");
    });
  });

  describe("DELETE /task/{taskId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let secondTask: Document | null;
    let deletedTask: Document | null;

    beforeAll(async () => {
      response = await supertest(app)
        .delete(`/task/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      secondResponse = await supertest(app).delete(
        `/task/${createdTask as ITask}._id`
      );
      thirdResponse = await supertest(app)
        .delete(`/task/${(createdTask as ITask)._id}`)
        .set("Authorization", `Bearer qwerty123`);
      secondTask = await TaskModel.findOne({
        childId: (secondCreatedChild as IChild)._id,
      });
      deletedTask = await TaskModel.findOne({
        childId: (createdChild as IChild)._id,
      });
      fourthResponse = await supertest(app)
        .delete(`/task/${(secondTask as ITask)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      await supertest(app)
        .delete(`/task/${(secondTask as ITask)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);
    });

    it("Should return a 204 status code", () => {
      expect(response.status).toBe(204);
    });

    it("Should delete a task from DB", () => {
      expect(deletedTask).toBeFalsy();
    });

    it("Should return a 400 status code", () => {
      expect(secondResponse.status).toBe(400);
    });

    it("Should say that token wasn't provided", () => {
      expect(secondResponse.body.message).toBe("No token provided");
    });

    it("Should return a 401 status code", () => {
      expect(thirdResponse.status).toBe(401);
    });

    it("Should return an unauthorized status", () => {
      expect(thirdResponse.body.message).toBe("Unauthorized");
    });

    it("Should return a 404 status code", () => {
      expect(fourthResponse.status).toBe(404);
    });

    it("Should say that child wasn't found", () => {
      expect(fourthResponse.body.message).toBe("Child not found");
    });
  });
});
