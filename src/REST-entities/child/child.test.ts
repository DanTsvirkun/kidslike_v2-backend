import mongoose from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import Server from "../../server/server";
import {
  IParent,
  IChild,
  IChildPopulated,
  IParentPopulated,
} from "../../helpers/typescript-helpers/interfaces";
import { Gender } from "../../helpers/typescript-helpers/enums";
import UserModel from "../user/user.model";
import SessionModel from "../session/session.model";
import ChildModel from "./child.model";

describe("Child router test suite", () => {
  let app: Application;
  let response: Response;
  let accessToken: string;
  let createdChild: IChild | IChildPopulated | null;

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
    await UserModel.deleteOne({ email: response.body.data.email });
    await SessionModel.deleteOne({ _id: response.body.sid });
    await ChildModel.deleteOne({ _id: (createdChild as IChild)._id });
    await mongoose.connection.close();
  });

  describe("POST /child", () => {
    let response: Response;
    let updatedParent: IParent | IParentPopulated | null;

    const validReqBody = {
      name: "Test",
      gender: Gender.MALE,
    };

    const invalidReqBody = {
      name: "Test",
    };

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/child")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(validReqBody);
        createdChild = await ChildModel.findById(response.body.id);
        updatedParent = await UserModel.findOne({
          email: "test@email.com",
        });
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
          id: (createdChild as IChild)._id.toString(),
          name: validReqBody.name,
          gender: Gender.MALE,
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
    });

    context("With invalidReqBody (no 'gender' provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/child")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'gender' is required", () => {
        expect(response.body.message).toBe('"gender" is required');
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).post("/child").send(validReqBody);
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
          .post("/child")
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
  });
});
