import mongoose from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import Server from "../../server/server";
import { Gender } from "../../helpers/typescript-helpers/enums";
import {
  IChild,
  IChildPopulated,
  IParent,
  IParentPopulated,
  IHabit,
  ITask,
  IGift,
} from "../../helpers/typescript-helpers/interfaces";
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
  let populatedData: {
    email: string;
    username: string;
    id: string;
    children: IChildPopulated[];
  };

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
      .send({ name: "Test", gender: Gender.MALE });
    createdHabit = await supertest(app)
      .post(`/habit/${createdChild.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test", rewardPerDay: 5 });
    createdTask = await supertest(app)
      .post(`/task/${createdChild.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test", reward: 5 });
    createdGift = await supertest(app)
      .post(`/gift/${createdChild.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test", price: 5 });
    await UserModel.findOne({ email: "test@email.com" })
      .lean()
      .populate({
        path: "children",
        model: ChildModel,
        populate: [
          { path: "habits", model: HabitModel },
          { path: "tasks", model: TaskModel },
          { path: "gifts", model: GiftModel },
        ],
      })
      .exec((err, data) => {
        populatedData = {
          email: (data as IParentPopulated).email,
          username: (data as IParentPopulated).username,
          id: (data as IParentPopulated)._id.toString(),
          children: (data as IParentPopulated).children.map((child) => {
            child._id = child._id.toString();
            child.habits.map((habit) => {
              habit._id = habit._id.toString();
              ((habit.childId as unknown) as string) = habit.childId.toString();
              return habit;
            });
            child.tasks.map((task) => {
              task._id = task._id.toString();
              ((task.childId as unknown) as string) = task.childId.toString();
              return task;
            });
            child.gifts.map((gift) => {
              gift._id = gift._id.toString();
              ((gift.childId as unknown) as string) = gift.childId.toString();
              return gift;
            });
            return child;
          }),
        };
      });
  });

  afterAll(async () => {
    await SessionModel.deleteOne({ _id: response.body.sid });
  });

  describe("GET /user", () => {
    let response: Response;

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get("/user")
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual(populatedData);
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).get("/user");
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
          .get("/user")
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

  describe("DELETE /user", () => {
    let response: Response;
    let deletedUser: IParent | IParentPopulated | null;
    let deletedChild: IChild | IChildPopulated | null;
    let deletedHabit: IHabit | null;
    let deletedTask: ITask | null;
    let deletedGift: IGift | null;

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
