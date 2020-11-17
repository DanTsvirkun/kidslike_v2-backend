import mongoose, { Document } from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import Server from "../server/server";
import { IChild, IHabit } from "./../helpers/typescript-helpers/interfaces";
import UserModel from "../DB-entities/user/user.model";
import SessionModel from "../DB-entities/session/session.model";
import ChildModel from "../DB-entities/child/child.model";
import HabitModel from "../DB-entities/habit/habit.model";

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

  describe("POST /habit/{childId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let fifthResponse: Response;
    let sixthResponse: Response;

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

    beforeAll(async () => {
      response = await supertest(app)
        .post(`/habit/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(validReqBody);
      secondResponse = await supertest(app)
        .post(`/habit/${(createdChild as IChild)._id}`)
        .send(validReqBody);
      thirdResponse = await supertest(app)
        .post(`/habit/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer qwerty123`)
        .send(validReqBody);
      fourthResponse = await supertest(app)
        .post(`/habit/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(invalidReqBody);
      fifthResponse = await supertest(app)
        .post(`/habit/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(secondInvalidReqBody);
      sixthResponse = await supertest(app)
        .post(`/habit/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`)
        .send(validReqBody);
      await supertest(app)
        .post(`/habit/${(secondCreatedChild as IChild)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`)
        .send(validReqBody);
      createdHabit = await HabitModel.findById(response.body._id);
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
        ...(createdHabit as IHabit).toObject(),
        childId: (createdHabit as IHabit).childId.toString(),
        _id: (createdHabit as IHabit)._id.toString(),
      });
    });

    it("Should add a new habit to child document in DB", () => {
      expect(
        (updatedChild as IChild).habits.find(
          (habitId) => habitId.toString() === response.body._id.toString()
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

    it("Should say that rewardPerDay must be greater or equal to 1", () => {
      expect(fourthResponse.body.message).toBe(
        "rewardPerDay must be greater or equal to 1"
      );
    });

    it("Should return a 400 status code", () => {
      expect(fifthResponse.status).toBe(400);
    });

    it("Should return a 404 status code", () => {
      expect(sixthResponse.status).toBe(404);
    });

    it("Should say that child wasn't found", () => {
      expect(sixthResponse.body.message).toBe("Child not found");
    });
  });

  describe("GET /habit", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let updatedHabit: Document | null;

    beforeAll(async () => {
      response = await supertest(app)
        .get("/habit")
        .set("Authorization", `Bearer ${accessToken}`);
      secondResponse = await supertest(app).get("/habit");
      thirdResponse = await supertest(app)
        .get("/habit")
        .set("Authorization", `Bearer qwerty123`);
      updatedHabit = await HabitModel.findById((createdHabit as IHabit)._id);
    });

    it("Should return a 200 status code", () => {
      expect(response.status).toBe(200);
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual([
        [
          {
            ...(updatedHabit as IHabit).toObject(),
            childId: (updatedHabit as IHabit).childId.toString(),
            _id: (updatedHabit as IHabit)._id.toString(),
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

  describe("PATCH /habit/{habitId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let fifthResponse: Response;
    let sixthResponse: Response;
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

    beforeAll(async () => {
      response = await supertest(app)
        .patch(`/habit/${(createdHabit as IHabit)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(validReqBody);
      secondResponse = await supertest(app)
        .patch(`/habit/${(createdHabit as IHabit)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(invalidReqBody);
      thirdResponse = await supertest(app)
        .patch(`/habit/${(createdHabit as IHabit)._id}`)
        .send(validReqBody);
      fourthResponse = await supertest(app)
        .patch(`/habit/${(createdHabit as IHabit)._id}`)
        .set("Authorization", `Bearer qwerty123`)
        .send(validReqBody);
      fifthResponse = await supertest(app)
        .patch(`/habit/${(createdHabit as IHabit)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(secondInvalidReqBody);
      updatedHabit = await HabitModel.findById((createdHabit as IHabit)._id);
      secondHabit = await HabitModel.findOne({
        childId: (secondCreatedChild as IChild)._id,
      });
      sixthResponse = await supertest(app)
        .patch(`/habit/${(secondHabit as IHabit)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(validReqBody);
    });

    it("Should return a 200 status code", () => {
      expect(response.status).toBe(200);
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual({
        ...(updatedHabit as IHabit).toObject(),
        ...validReqBody,
        childId: (updatedHabit as IHabit).childId.toString(),
        _id: (updatedHabit as IHabit)._id.toString(),
      });
    });

    it("Should update a habit in DB", () => {
      expect((updatedHabit as IHabit).name).toBe("Test2");
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

    it("Should say that rewardPerDay must be greater or equal to 1", () => {
      expect(fifthResponse.body.message).toBe(
        "rewardPerDay must be greater or equal to 1"
      );
    });

    it("Should return a 404 status code", () => {
      expect(sixthResponse.status).toBe(404);
    });

    it("Should say that child wasn't found", () => {
      expect(sixthResponse.body.message).toBe("Child not found");
    });
  });

  describe("PATCH /habit/confirm/{habitId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let fifthResponse: Response;
    let updatedHabit: Document | null;
    let secondHabit: Document | null;

    beforeAll(async () => {
      response = await supertest(app)
        .patch(`/habit/confirm/${(createdHabit as IHabit)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      secondResponse = await supertest(app).patch(
        `/habit/confirm/${(createdHabit as IHabit)._id}`
      );
      thirdResponse = await supertest(app)
        .patch(`/habit/confirm/${(createdHabit as IHabit)._id}`)
        .set("Authorization", `Bearer qwerty123`);
      fourthResponse = await supertest(app)
        .patch(`/habit/confirm/${(createdHabit as IHabit)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      updatedHabit = await HabitModel.findById((createdHabit as IHabit)._id);
      secondHabit = await HabitModel.findOne({
        childId: (secondCreatedChild as IChild)._id,
      });
      fifthResponse = await supertest(app)
        .patch(`/habit/confirm/${(secondHabit as IHabit)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
    });

    it("Should return a 200 status code", () => {
      expect(response.status).toBe(200);
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual({
        updatedHabit: {
          ...(updatedHabit as IHabit).toObject(),
          _id: (updatedHabit as IHabit)._id.toString(),
          childId: (updatedHabit as IHabit).childId.toString(),
        },
        updatedRewards: 1,
      });
    });

    it("Should update a habit in DB", () => {
      expect((updatedHabit as IHabit).days[0].isCompleted).toBe("confirmed");
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

    it("Should say that this day has already been confirmed", () => {
      expect(fourthResponse.body.message).toBe(
        "This day has already been confirmed"
      );
    });

    it("Should return a 404 status code", () => {
      expect(fifthResponse.status).toBe(404);
    });

    it("Should say that child wasn't found", () => {
      expect(fifthResponse.body.message).toBe("Child not found");
    });
  });

  describe("PATCH /habit/cancel/{habitId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let fifthResponse: Response;
    let updatedHabit: Document | null;
    let secondHabit: Document | null;

    beforeAll(async () => {
      secondHabit = await HabitModel.findOne({
        childId: (secondCreatedChild as IChild)._id,
      });
      response = await supertest(app)
        .patch(`/habit/cancel/${(secondHabit as IHabit)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);
      secondResponse = await supertest(app).patch(
        `/habit/cancel/${(secondHabit as IHabit)._id}`
      );
      thirdResponse = await supertest(app)
        .patch(`/habit/cancel/${(secondHabit as IHabit)._id}`)
        .set("Authorization", `Bearer qwerty123`);
      fourthResponse = await supertest(app)
        .patch(`/habit/cancel/${(secondHabit as IHabit)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);
      updatedHabit = await HabitModel.findById((secondHabit as IHabit)._id);
      fifthResponse = await supertest(app)
        .patch(`/habit/cancel/${(createdHabit as IHabit)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);
    });

    it("Should return a 200 status code", () => {
      expect(response.status).toBe(200);
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual({
        updatedHabit: {
          ...(updatedHabit as IHabit).toObject(),
          _id: (updatedHabit as IHabit)._id.toString(),
          childId: (updatedHabit as IHabit).childId.toString(),
        },
      });
    });

    it("Should update a habit in DB", () => {
      expect((updatedHabit as IHabit).days[0].isCompleted).toBe("canceled");
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

    it("Should say that this day has already been canceled", () => {
      expect(fourthResponse.body.message).toBe(
        "This day has already been canceled"
      );
    });

    it("Should return a 404 status code", () => {
      expect(fifthResponse.status).toBe(404);
    });

    it("Should say that child wasn't found", () => {
      expect(fifthResponse.body.message).toBe("Child not found");
    });
  });

  describe("DELETE /habit/{habitId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let secondHabit: Document | null;
    let deletedHabit: Document | null;

    beforeAll(async () => {
      response = await supertest(app)
        .delete(`/habit/${(createdHabit as IHabit)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      secondResponse = await supertest(app).delete(
        `/habit/${createdHabit as IHabit}._id`
      );
      thirdResponse = await supertest(app)
        .delete(`/habit/${(createdHabit as IHabit)._id}`)
        .set("Authorization", `Bearer qwerty123`);
      secondHabit = await HabitModel.findOne({
        childId: (secondCreatedChild as IChild)._id,
      });
      deletedHabit = await HabitModel.findOne({
        childId: (createdChild as IChild)._id,
      });
      fourthResponse = await supertest(app)
        .delete(`/habit/${(secondHabit as IHabit)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      await supertest(app)
        .delete(`/habit/${(secondHabit as IHabit)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);
    });

    it("Should return a 204 status code", () => {
      expect(response.status).toBe(204);
    });

    it("Should delete a habit from DB", () => {
      expect(deletedHabit).toBeFalsy();
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
