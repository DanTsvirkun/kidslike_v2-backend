import mongoose, { Document } from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import Server from "../../server/server";
import UserModel from "./user.model";
import SessionModel from "../session/session.model";
import HabitModel from "../habit/habit.model";
import TaskModel from "../task/task.model";
import GiftModel from "../gift/gift.model";
import ChildModel from "../child/child.model";

describe("Child router test suite", () => {
  let app: Application;
  let response: Response;
  let accessToken: string;
  let createdChild: Response;
  let createdHabit: Response;
  let createdTask: Response;
  let createdGift: Response;

  beforeAll(async () => {
    app = new Server().startForTesting();
    const url = `mongodb://127.0.0.1/user`;
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
    response = await supertest(app)
      .post("/auth/login")
      .send({ email: "test@email.com", password: "qwerty123" });
    accessToken = response.body.accessToken;
    createdChild = await supertest(app)
      .post("/child")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test", gender: "male" });
    createdHabit = await supertest(app)
      .post(`/habit/${createdChild.body._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test", rewardPerDay: 5 });
    createdTask = await supertest(app)
      .post(`/task/${createdChild.body._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test", reward: 5 });
    createdGift = await supertest(app)
      .post(`/gift/${createdChild.body._id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test", price: 5 });
  });

  afterAll(async () => {
    await SessionModel.deleteOne({ _id: response.body.sid });
  });

  describe("DELETE /user", () => {
    let response: Response;
    let deletedUser: Document | null;
    let deletedChild: Document | null;
    let deletedHabit: Document | null;
    let deletedTask: Document | null;
    let deletedGift: Document | null;

    const validReqBody = {
      email: "test@email.com",
      password: "qwerty123",
    };

    const invalidReqBody = {
      email: "test@email.com",
    };

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete("/user")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        setTimeout(async () => {
          deletedTask = await TaskModel.findById(createdTask.body._id);
          deletedHabit = await HabitModel.findById(createdHabit.body._id);
          deletedGift = await GiftModel.findById(createdGift.body._id);
          deletedChild = await ChildModel.findById(createdChild.body._id);
          deletedUser = await UserModel.findOne({ email: "test@email.com" });
        }, 100);
      });

      it("Should return a 204 status", () => {
        expect(response.status).toBe(204);
      });

      it("Should delete user", () => {
        expect(deletedUser).toBeFalsy();
      });

      it("Should delete child", () => {
        expect(deletedChild).toBeFalsy();
      });

      it("Should delete child's habit", () => {
        expect(deletedHabit).toBeFalsy();
      });

      it("Should delete child's task", () => {
        expect(deletedTask).toBeFalsy();
      });

      it("Should delete child's gift", () => {
        expect(deletedGift).toBeFalsy();
      });
    });

    context("With invalidReqBody (no 'password' provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete("/user")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'password' is required", () => {
        expect(response.body.message).toBe('"password" is required');
      });
    });
  });
});
