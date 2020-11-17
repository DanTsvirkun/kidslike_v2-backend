import mongoose, { Document } from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import Server from "../server/server";
import { IParent, IChild } from "./../helpers/typescript-helpers/interfaces";
import UserModel from "../DB-entities/user/user.model";
import SessionModel from "../DB-entities/session/session.model";
import ChildModel from "../DB-entities/child/child.model";

describe("Child router test suite", () => {
  let app: Application;
  let response: Response;
  let accessToken: string;
  let createdChild: Document | null;

  beforeAll(async () => {
    app = new Server().startForTesting();
    const url = `mongodb://127.0.0.1/child`;
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
  });

  afterAll(async () => {
    await UserModel.deleteOne({ email: "test@email.com" });
    await SessionModel.deleteOne({ _id: response.body.sid });
    await ChildModel.deleteOne({ _id: (createdChild as IChild)._id });
    await mongoose.connection.close();
  });

  describe("POST /child", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let updatedParent: Document | null;

    const validReqBody = {
      name: "Test",
      gender: "male",
    };

    const invalidReqBody = {
      name: "Test",
    };

    beforeAll(async () => {
      response = await supertest(app)
        .post("/child")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(validReqBody);
      secondResponse = await supertest(app)
        .post("/child")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(invalidReqBody);
      thirdResponse = await supertest(app).post("/child").send(validReqBody);
      fourthResponse = await supertest(app)
        .post("/child")
        .set("Authorization", `Bearer qwerty123`)
        .send(validReqBody);
      createdChild = await ChildModel.findById(response.body._id);
      updatedParent = await UserModel.findOne({ email: "test@email.com" });
    });

    it("Should return a 201 status code", () => {
      expect(response.status).toBe(201);
    });

    it("Should create a new child in DB", () => {
      expect(createdChild).toBeTruthy();
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual({
        rewards: 0,
        habits: [],
        tasks: [],
        gifts: [],
        _id: (createdChild as IChild)._id.toString(),
        name: (createdChild as IChild).name,
        gender: (createdChild as IChild).gender,
        __v: (createdChild as IChild).__v,
      });
    });

    it("Should add a new child to user document in DB", () => {
      expect(
        (updatedParent as IParent).children.find(
          (childId) =>
            childId.toString() === (createdChild as IChild)._id.toString()
        )
      ).toBeTruthy();
    });

    it("Should return a 400 status code", () => {
      expect(secondResponse.status).toBe(400);
    });

    it("Should return a 400 status code", () => {
      expect(thirdResponse.status).toBe(400);
    });

    it("Should return a 401 status code", () => {
      expect(fourthResponse.status).toBe(401);
    });

    it("Should return an unauthorized status", () => {
      expect(fourthResponse.body.message).toBe("Unauthorized");
    });
  });
});
