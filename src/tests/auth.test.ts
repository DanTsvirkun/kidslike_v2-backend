import { IParent } from "../helpers/typescript-helpers/interfaces";
import mongoose from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import { Document } from "mongoose";
import Server from "../server/server";
import UserModel from "../DB-entities/user/user.model";

describe("Auth router test suite", () => {
  let app: Application;

  beforeAll(async () => {
    app = new Server().startForTesting();
    const url = `mongodb://127.0.0.1/auth`;
    await mongoose.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe("POST /auth/register", () => {
    let response: Response;
    let secondResponse: Response;
    let createdUser: Document | null;

    const reqBody = {
      username: "Test",
      email: "test@email.com",
      password: "qwerty123",
    };

    beforeAll(async () => {
      response = await supertest(app).post("/auth/register").send(reqBody);
      secondResponse = await supertest(app)
        .post("/auth/register")
        .send(reqBody);
      createdUser = await UserModel.findById(response.body.id);
    });

    afterAll(async () => {
      await UserModel.deleteOne({ _id: (createdUser as IParent)._id });
    });

    it("Should return a 201 status code", () => {
      expect(response.status).toBe(201);
    });

    it("Should return an expected object", () => {
      expect(response.body).toEqual({
        id: (createdUser as Document)._id.toString(),
        email: reqBody.email,
        username: reqBody.username,
      });
    });

    it("Should create a new user", () => {
      expect(createdUser).toBeTruthy();
    });

    it("Should return a 409 status code", () => {
      expect(secondResponse.status).toBe(409);
    });

    it("Should say if email is already in use", () => {
      expect(secondResponse.body.message).toBe(
        `User with ${(createdUser as IParent).email} email already exists`
      );
    });
  });
});
