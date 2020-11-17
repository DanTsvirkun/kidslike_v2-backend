import mongoose, { Document } from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import { IParent, ISession } from "../helpers/typescript-helpers/interfaces";
import Server from "../server/server";
import UserModel from "../DB-entities/user/user.model";
import SessionModel from "../DB-entities/session/session.model";

describe("Auth router test suite", () => {
  let app: Application;
  let accessToken: string;
  let refreshToken: string;
  let sid: string;

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
    await UserModel.deleteOne({ email: "test@email.com" });
    await mongoose.connection.close();
  });

  describe("POST /auth/register", () => {
    let createdUser: Document | null;
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;

    const validReqBody = {
      username: "Test",
      email: "test@email.com",
      password: "qwerty123",
    };

    const invalidReqBody = {
      email: "test@email.com",
      password: "qwerty123",
    };

    beforeAll(async () => {
      response = await supertest(app).post("/auth/register").send(validReqBody);
      secondResponse = await supertest(app)
        .post("/auth/register")
        .send(validReqBody);
      thirdResponse = await supertest(app)
        .post("/auth/register")
        .send(invalidReqBody);
      createdUser = await UserModel.findById(response.body.id);
    });

    it("Should return a 201 status code", () => {
      expect(response.status).toBe(201);
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual({
        id: (createdUser as Document)._id.toString(),
        email: validReqBody.email,
        username: validReqBody.username,
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

    it("Should return a 400 status code", () => {
      expect(thirdResponse.status).toBe(400);
    });
  });

  describe("POST /auth/login", () => {
    let createdSession: Document | null;
    let user: Document | null;
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;

    const loginValidReqBody = {
      email: "test@email.com",
      password: "qwerty123",
    };

    const loginInvalidReqBody = {
      email: "test@email.com",
    };

    const secondLoginInvalidReqBody = {
      email: "test@email.com",
      password: "qwerty12",
    };

    const thirdLoginInvalidReqBody = {
      email: "tes@email.com",
      password: "qwerty123",
    };

    beforeAll(async () => {
      response = await supertest(app)
        .post("/auth/login")
        .send(loginValidReqBody);
      secondResponse = await supertest(app)
        .post("/auth/login")
        .send(loginInvalidReqBody);
      thirdResponse = await supertest(app)
        .post("/auth/login")
        .send(secondLoginInvalidReqBody);
      fourthResponse = await supertest(app)
        .post("/auth/login")
        .send(thirdLoginInvalidReqBody);
      createdSession = await SessionModel.findById(response.body.sid);
      user = await UserModel.findById(response.body.data._id);
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
      sid = (createdSession as ISession)._id.toString();
    });

    it("Should return a 200 status code", () => {
      expect(response.status).toBe(200);
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual({
        data: {
          children: [],
          _id: (user as IParent)._id.toString(),
          email: (user as IParent).email,
          passwordHash: (user as IParent).passwordHash,
          username: (user as IParent).username,
          __v: (user as IParent).__v,
        },
        accessToken,
        refreshToken,
        sid,
      });
    });

    it("Should create an accessToken", () => {
      expect(response.body.accessToken).toBeTruthy();
    });

    it("Should create a refreshToken", () => {
      expect(response.body.refreshToken).toBeTruthy();
    });

    it("Should create a new session", () => {
      expect(createdSession).toBeTruthy();
    });

    it("Should return a 400 status code", () => {
      expect(secondResponse.status).toBe(400);
    });

    it("Should return a 403 status code", () => {
      expect(thirdResponse.status).toBe(403);
    });

    it("Should say that password is wrong", () => {
      expect(thirdResponse.body.message).toBe("Password is wrong");
    });
 
    it("Should return a 403 status code", () => {
      expect(fourthResponse.status).toBe(403);
    });

    it("Should say that email doesn't exist", () => {
      expect(fourthResponse.body.message).toBe(
        `User with ${thirdLoginInvalidReqBody.email} email doesn't exist`
      );
    });
  });

  describe("GET /auth/refresh", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let fifthResponse: Response;
    let createdSession: Document | null;
    let responseAfter: Response;

    let validReqBody = {
      sid,
    };

    let invalidReqBody = {
      sid: {},
    };

    let secondInvalidReqBody = {
      sid: "qwerty123",
    };

    beforeAll(async () => {
      validReqBody.sid = sid;
      response = await supertest(app)
        .get("/auth/refresh")
        .set("Authorization", `Bearer ${refreshToken}`)
        .send(invalidReqBody);
      secondResponse = await supertest(app)
        .get("/auth/refresh")
        .send(validReqBody);
      thirdResponse = await supertest(app)
        .get("/auth/refresh")
        .set("Authorization", `Bearer ${refreshToken}`)
        .send(secondInvalidReqBody);
      fourthResponse = await supertest(app)
        .get("/auth/refresh")
        .set("Authorization", `Bearer ${refreshToken}`)
        .send(validReqBody);
      createdSession = await SessionModel.findById(fourthResponse.body.sid);
      validReqBody.sid = (createdSession as ISession)._id.toString();
      fifthResponse = await supertest(app)
        .get("/auth/refresh")
        .set("Authorization", `Bearer qwerty123`)
        .send(validReqBody);
    });

    afterAll(async () => {
      responseAfter = await supertest(app).post("/auth/login").send({
        email: "test@email.com",
        password: "qwerty123",
      });
      accessToken = responseAfter.body.accessToken;
    });

    it("Should return a 400 status code", () => {
      expect(response.status).toBe(400);
    });

    it("Should return a 400 status code", () => {
      expect(secondResponse.status).toBe(400);
    });

    it("Should say that token wasn't provided", () => {
      expect(secondResponse.body.message).toBe("No token provided");
    });

    it("Should return a 400 status code", () => {
      expect(thirdResponse.status).toBe(400);
    });

    it("Should return a 200 status code", () => {
      expect(fourthResponse.status).toBe(200);
    });

    it("Should return an expected result", () => {
      expect(fourthResponse.body).toEqual({
        newAccessToken: fourthResponse.body.newAccessToken,
        newRefreshToken: fourthResponse.body.newRefreshToken,
        sid: (createdSession as ISession)._id.toString(),
      });
    });

    it("Should create an accessToken", () => {
      expect(fourthResponse.body.newAccessToken).toBeTruthy();
    });

    it("Should create a refreshToken", () => {
      expect(fourthResponse.body.newRefreshToken).toBeTruthy();
    });

    it("Should return a 401 status code", () => {
      expect(fifthResponse.status).toBe(401);
    });

    it("Should return an unauthorized status", () => {
      expect(fifthResponse.body.message).toBe("Unauthorized");
    });
  });

  describe("POST /auth/logout", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;

    beforeAll(async () => {
      response = await supertest(app)
        .post("/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`);
      secondResponse = await supertest(app)
        .post("/auth/logout")
        .set("Authorization", `Bearer qwerty123`);
      thirdResponse = await supertest(app).post("/auth/logout");
    });

    it("Should return a 204 status code", () => {
      expect(response.status).toBe(204);
    });

    it("Should return a 401 status code", () => {
      expect(secondResponse.status).toBe(401);
    });

    it("Should return an unauthorized status", () => {
      expect(secondResponse.body.message).toBe("Unauthorized");
    });

    it("Should return a 400 status code", () => {
      expect(thirdResponse.status).toBe(400);
    });

    it("Should say that token wasn't provided", () => {
      expect(thirdResponse.body.message).toBe("No token provided");
    });
  });
});
