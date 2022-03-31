import mongoose from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import jwt from "jsonwebtoken";
import {
  IParent,
  IParentPopulated,
  ISession,
} from "../helpers/typescript-helpers/interfaces";
import Server from "../server/server";
import UserModel from "../REST-entities/user/user.model";
import SessionModel from "../REST-entities/session/session.model";

describe("Auth router test suite", () => {
  let app: Application;
  let createdSession: ISession | null;
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
    let response: Response;
    let createdUser: IParent | IParentPopulated | null;

    const validReqBody = {
      username: "Test",
      email: "test@email.com",
      password: "qwerty123",
    };

    const invalidReqBody = {
      email: "test@email.com",
      password: "qwerty123",
    };

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/auth/register")
          .send(validReqBody);
        createdUser = await UserModel.findById(response.body.id);
      });

      it("Should return a 201 status code", () => {
        expect(response.status).toBe(201);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          id: (createdUser as IParent)._id.toString(),
          email: validReqBody.email,
          username: validReqBody.username,
        });
      });

      it("Should create a new user", () => {
        expect(createdUser).toBeTruthy();
      });
    });

    context("With same email", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/auth/register")
          .send(validReqBody);
      });

      it("Should return a 409 status code", () => {
        expect(response.status).toBe(409);
      });

      it("Should say if email is already in use", () => {
        expect(response.body.message).toBe(
          `User with ${(createdUser as IParent).email} email already exists`
        );
      });
    });

    context("With invalidReqBody (no 'username' provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/auth/register")
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'username' is required", () => {
        expect(response.body.message).toBe('"username" is required');
      });
    });
  });

  describe("POST /auth/login", () => {
    let response: Response;
    let user: IParent | IParentPopulated | null;

    const validReqBody = {
      email: "test@email.com",
      password: "qwerty123",
    };

    const invalidReqBody = {
      email: "test@email.com",
    };

    const secondInvalidReqBody = {
      email: "test@email.com",
      password: "qwerty12",
    };

    const thirdInvalidReqBody = {
      email: "tes@email.com",
      password: "qwerty123",
    };

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("With validReqBody", () => {
      beforeAll(async () => {
        response = await supertest(app).post("/auth/login").send(validReqBody);
        createdSession = await SessionModel.findById(response.body.sid);
        user = await UserModel.findById(response.body.data.id);
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
            id: (user as IParent)._id.toString(),
            email: validReqBody.email,
            username: "Test",
          },
          accessToken,
          refreshToken,
          sid,
        });
      });

      it("Should create valid 'accessToken'", () => {
        expect(
          jwt.verify(
            response.body.accessToken,
            process.env.JWT_ACCESS_SECRET as string
          )
        ).toBeTruthy();
      });

      it("Should create valid 'refreshToken'", () => {
        expect(
          jwt.verify(
            response.body.refreshToken,
            process.env.JWT_REFRESH_SECRET as string
          )
        ).toBeTruthy();
      });

      it("Should create valid 'sid'", () => {
        expect(mongoose.Types.ObjectId.isValid(response.body.sid)).toBeTruthy();
      });

      it("Should create a new session", () => {
        expect(createdSession).toBeTruthy();
      });
    });

    context("With invalidReqBody (no password provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/auth/login")
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'password' is required", () => {
        expect(response.body.message).toBe('"password" is required');
      });
    });

    context("With secondInvalidReqBody (wrong password)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/auth/login")
          .send(secondInvalidReqBody);
      });

      it("Should return a 403 status code", () => {
        expect(response.status).toBe(403);
      });

      it("Should say that password is wrong", () => {
        expect(response.body.message).toBe("Password is wrong");
      });
    });

    context("With thirdInvalidReqBody (wrong password)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/auth/login")
          .send(thirdInvalidReqBody);
      });

      it("Should return a 403 status code", () => {
        expect(response.status).toBe(403);
      });

      it("Should say that email doesn't exist", () => {
        expect(response.body.message).toBe(
          `User with ${thirdInvalidReqBody.email} email doesn't exist`
        );
      });
    });
  });

  describe("GET /auth/refresh", () => {
    let response: Response;
    let newSession: ISession | null;

    const validReqBody = {
      sid,
    };

    const invalidReqBody = {
      sid: {},
    };

    const secondInvalidReqBody = {
      sid: "qwerty123",
    };

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("With invalidReqBody (invalid 'sid' type)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/auth/refresh")
          .set("Authorization", `Bearer ${refreshToken}`)
          .send(invalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'sid' is required", () => {
        expect(response.body.message).toBe('"sid" must be a string');
      });
    });

    context("Without providing 'refreshToken'", () => {
      beforeAll(async () => {
        validReqBody.sid = sid;
        response = await supertest(app)
          .post("/auth/refresh")
          .send(validReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that token wasn't provided", () => {
        expect(response.body.message).toBe("No token provided");
      });
    });

    context("With invalid refreshToken", () => {
      beforeAll(async () => {
        validReqBody.sid = sid;
        response = await supertest(app)
          .post("/auth/refresh")
          .set("Authorization", `Bearer qwerty123`)
          .send(validReqBody);
        createdSession = await SessionModel.findOne({
          _id: (createdSession as ISession)._id,
        });
      });

      afterAll(async () => {
        response = await supertest(app)
          .post("/auth/login")
          .send({ email: "test@email.com", password: "qwerty123" });
        refreshToken = response.body.refreshToken;
        sid = response.body.sid;
        createdSession = await SessionModel.findById(sid);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });

      it("Should delete session", () => {
        expect(createdSession).toBeFalsy();
      });
    });

    context("With secondInvalidReqBody (invalid 'sid')", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/auth/refresh")
          .set("Authorization", `Bearer ${refreshToken}`)
          .send(secondInvalidReqBody);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'sid' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'sid'. Must be a MongoDB ObjectId"
        );
      });
    });

    context("With validReqBody", () => {
      beforeAll(async () => {
        validReqBody.sid = sid;
        response = await supertest(app)
          .post("/auth/refresh")
          .set("Authorization", `Bearer ${refreshToken}`)
          .send(validReqBody);
        createdSession = await SessionModel.findOne({
          _id: (createdSession as ISession)._id,
        });
        newSession = await SessionModel.findById(response.body.newSid);
        accessToken = response.body.newAccessToken;
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual({
          newAccessToken: response.body.newAccessToken,
          newRefreshToken: response.body.newRefreshToken,
          newSid: (newSession as ISession)._id.toString(),
        });
      });

      it("Should create valid 'newAccessToken'", () => {
        expect(
          jwt.verify(
            response.body.newAccessToken,
            process.env.JWT_ACCESS_SECRET as string
          )
        ).toBeTruthy();
      });

      it("Should create valid 'newRefreshToken'", () => {
        expect(
          jwt.verify(
            response.body.newRefreshToken,
            process.env.JWT_REFRESH_SECRET as string
          )
        ).toBeTruthy();
      });

      it("Should create valid 'sid'", () => {
        expect(
          mongoose.Types.ObjectId.isValid(response.body.newSid)
        ).toBeTruthy();
      });

      it("Should delete old session from DB", () => {
        expect(createdSession).toBeFalsy();
      });

      it("Should create new session in DB", () => {
        expect(newSession).toBeTruthy();
      });
    });
  });

  describe("POST /auth/logout", () => {
    let response: Response;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post("/auth/logout")
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 204 status code", () => {
        expect(response.status).toBe(204);
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).post("/auth/logout");
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
          .post("/auth/logout")
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
});
