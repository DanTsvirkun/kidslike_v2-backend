import mongoose, { Document } from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import Server from "../../server/server";
import { IChild, IHabit } from "../../helpers/typescript-helpers/interfaces";
import { Gender } from "../../helpers/typescript-helpers/enums";
import UserModel from "../user/user.model";
import SessionModel from "../session/session.model";
import ChildModel from "../child/child.model";
import HabitModel from "./habit.model";

describe("Habit router test suite", () => {
  let app: Application;
  let createdChild: Document | null;
  let secondCreatedChild: Document | null;
  let response: Response;
  let secondResponse: Response;
  let thirdResponse: Response;
  let fourthResponse: Response;
  let accessToken: string;
  let secondAccessToken: string;
  let createdHabit: Document | null;
  let updatedChild: Document | null;

  beforeAll(async () => {
    app = new Server().startForTesting();
    const url = `mongodb://127.0.0.1/habit`;
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
    await UserModel.deleteOne({ email: "test@email.com" });
    await UserModel.deleteOne({ email: "test2@email.com" });
    await SessionModel.deleteOne({ _id: response.body.sid });
    await SessionModel.deleteOne({ _id: secondResponse.body.sid });
    await ChildModel.deleteOne({ _id: (createdChild as IChild)._id });
    await ChildModel.deleteOne({ _id: (secondCreatedChild as IChild)._id });
    await mongoose.connection.close();
  });

  describe("POST /habit/{childId}", () => {
    let response: Response;

    const validReqBody = {
      name: "Test",
      rewardPerDay: 1,
    };

    const invalidReqBody = {
      name: "Test",
      rewardPerDay: 0,
    };

    const secondInvalidReqBody = {
      name: "Test",
    };

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    afterAll(async () => {
      await supertest(app)
        .post(`/habit/${(secondCreatedChild as IChild)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`)
        .send(validReqBody);
    });

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/habit/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        createdHabit = await HabitModel.findById(response.body.id).lean();
        updatedChild = await ChildModel.findById((createdChild as IChild)._id);
      });

      it("Should return a 201 status code", () => {
        expect(response.status).toBe(201);
      });

      it("Should create a new habit in DB", () => {
        expect(createdHabit).toBeTruthy();
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          days: (createdHabit as IHabit).days,
          name: "Test",
          rewardPerDay: 1,
          childId: (createdChild as IChild)._id.toString(),
          id: (createdHabit as IHabit)._id.toString(),
        });
      });

      it("Should add a new habit to child document in DB", () => {
        expect(
          (updatedChild as IChild).habits.find(
            (habitId) => habitId.toString() === response.body.id.toString()
          )
        ).toBeTruthy();
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/habit/${(createdChild as IChild)._id}`)
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
          .post(`/habit/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer qwerty123`)
          .send(validReqBody);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With invalidReqBody ('rewardPerDay' = 0)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/habit/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'rewardPerDay' must be greater than or equal to 1", () => {
        expect(response.body.message).toBe(
          '"rewardPerDay" must be greater than or equal to 1'
        );
      });
    });

    context("With secondInvalidReqBody (no 'rewardPerDay' provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/habit/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(secondInvalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'rewardPerDay' is required", () => {
        expect(response.body.message).toBe('"rewardPerDay" is required');
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/habit/${(createdChild as IChild)._id}`)
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

    context("With invalid 'habitId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/habit/qwerty123")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'childId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'childId'. Must be MongoDB ObjectId"
        );
      });
    });
  });

  describe("GET /habit", () => {
    let response: Response;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get("/habit")
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual([
          [
            {
              days: (createdHabit as IHabit).days,
              name: "Test",
              rewardPerDay: 1,
              childId: (createdChild as IChild)._id.toString(),
              id: (createdHabit as IHabit)._id.toString(),
            },
          ],
        ]);
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).get("/habit");
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
        response = await supertest(app).get("/habit");
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });
  });

  describe("PATCH /habit/{habitId}", () => {
    let response: Response;
    let updatedHabit: Document | null;
    let secondHabit: Document | null;

    const validReqBody = {
      name: "Test2",
    };

    const invalidReqBody = {};

    const secondInvalidReqBody = {
      name: "Test2",
      rewardPerDay: 0,
    };

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/habit/${(createdHabit as IHabit)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        updatedHabit = await HabitModel.findById(
          (createdHabit as IHabit)._id
        ).lean();
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          days: (updatedHabit as IHabit).days,
          name: "Test2",
          rewardPerDay: 1,
          childId: (createdChild as IChild)._id.toString(),
          id: (updatedHabit as IHabit)._id.toString(),
        });
      });

      it("Should update a habit in DB", () => {
        expect((updatedHabit as IHabit).name).toBe("Test2");
      });
    });

    context("With invalidReqBody (no fields provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/habit/${(createdHabit as IHabit)._id}`)
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
          .patch(`/habit/${(createdHabit as IHabit)._id}`)
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
          .patch(`/habit/${(createdHabit as IHabit)._id}`)
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

    context("With secondInvalidReqBody ('rewardPerDay' = 0)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/habit/${(createdHabit as IHabit)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(secondInvalidReqBody);
        secondHabit = await HabitModel.findOne({
          childId: (secondCreatedChild as IChild)._id,
        });
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'rewardPerDay' must be greater than or equal to 1", () => {
        expect(response.body.message).toBe(
          '"rewardPerDay" must be greater than or equal to 1'
        );
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/habit/${(secondHabit as IHabit)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that child wasn't found", () => {
        expect(response.body.message).toBe("Child not found");
      });
    });

    context("With invalid 'habitId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch("/habit/qwerty123")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'habitId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'habitId'. Must be MongoDB ObjectId"
        );
      });
    });
  });

  describe("PATCH /habit/confirm/{habitId}", () => {
    let response: Response;
    let updatedHabit: Document | null;
    let secondHabit: Document | null;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/habit/confirm/${(createdHabit as IHabit)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
        updatedHabit = await HabitModel.findById(
          (createdHabit as IHabit)._id
        ).lean();
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          updatedHabit: {
            days: (updatedHabit as IHabit).days,
            name: "Test2",
            rewardPerDay: 1,
            childId: (createdChild as IChild)._id.toString(),
            id: (updatedHabit as IHabit)._id.toString(),
          },
          updatedRewards: 1,
        });
      });

      it("Should update a habit in DB", () => {
        expect((updatedHabit as IHabit).days[0].isCompleted).toBe("confirmed");
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).patch(
          `/habit/confirm/${(createdHabit as IHabit)._id}`
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
          .patch(`/habit/confirm/${(createdHabit as IHabit)._id}`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("Confirming an already confirmed day", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/habit/confirm/${(createdHabit as IHabit)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
        secondHabit = await HabitModel.findOne({
          childId: (secondCreatedChild as IChild)._id,
        });
      });

      it("Should return a 403 status code", () => {
        expect(response.status).toBe(403);
      });

      it("Should say that this day has already been confirmed", () => {
        expect(response.body.message).toBe(
          "This day has already been confirmed"
        );
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/habit/confirm/${(secondHabit as IHabit)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that child wasn't found", () => {
        expect(response.body.message).toBe("Child not found");
      });
    });

    context("With invalid 'habitId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch("/habit/confirm/qwerty123")
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'habitId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'habitId'. Must be MongoDB ObjectId"
        );
      });
    });
  });

  describe("PATCH /habit/cancel/{habitId}", () => {
    let response: Response;
    let updatedHabit: Document | null;
    let secondHabit: Document | null;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        secondHabit = await HabitModel.findOne({
          childId: (secondCreatedChild as IChild)._id,
        });
        response = await supertest(app)
          .patch(`/habit/cancel/${(secondHabit as IHabit)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`);
        updatedHabit = await HabitModel.findById(
          (secondHabit as IHabit)._id
        ).lean();
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          days: (updatedHabit as IHabit).days,
          name: "Test",
          rewardPerDay: 1,
          childId: (secondCreatedChild as IChild)._id.toString(),
          id: (updatedHabit as IHabit)._id.toString(),
        });
      });

      it("Should update a habit in DB", () => {
        expect((updatedHabit as IHabit).days[0].isCompleted).toBe("canceled");
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).patch(
          `/habit/cancel/${(secondHabit as IHabit)._id}`
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
          .patch(`/habit/cancel/${(secondHabit as IHabit)._id}`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("Canceling an already canceled day", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/habit/cancel/${(secondHabit as IHabit)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`);
      });

      it("Should return a 403 status code", () => {
        expect(response.status).toBe(403);
      });

      it("Should say that this day has already been canceled", () => {
        expect(response.body.message).toBe(
          "This day has already been canceled"
        );
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/habit/cancel/${(createdHabit as IHabit)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that child wasn't found", () => {
        expect(response.body.message).toBe("Child not found");
      });
    });

    context("With invalid 'habitId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch("/habit/cancel/qwerty123")
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'habitId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'habitId'. Must be MongoDB ObjectId"
        );
      });
    });
  });

  describe("DELETE /habit/{habitId}", () => {
    let response: Response;
    let secondHabit: Document | null;
    let deletedHabit: Document | null;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    afterAll(async () => {
      await supertest(app)
        .delete(`/habit/${(secondHabit as IHabit)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete(`/habit/${(createdHabit as IHabit)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
        deletedHabit = await HabitModel.findOne({
          childId: (createdChild as IChild)._id,
        });
      });

      it("Should return a 204 status code", () => {
        expect(response.status).toBe(204);
      });

      it("Should delete a habit from DB", () => {
        expect(deletedHabit).toBeFalsy();
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).delete(
          `/habit/${(createdHabit as IHabit)._id}`
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
          .delete(`/habit/${(createdHabit as IHabit)._id}`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        secondHabit = await HabitModel.findOne({
          childId: (secondCreatedChild as IChild)._id,
        });
        response = await supertest(app)
          .delete(`/habit/${(secondHabit as IHabit)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that child wasn't found", () => {
        expect(response.body.message).toBe("Child not found");
      });
    });

    context("With invalid 'habitId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete("/habit/qwerty123")
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'habitId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'habitId'. Must be MongoDB ObjectId"
        );
      });
    });
  });
});
