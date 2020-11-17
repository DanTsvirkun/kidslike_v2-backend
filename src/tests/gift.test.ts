import path from "path";
import mongoose, { Document } from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import Server from "../server/server";
import { IChild, IGift } from "./../helpers/typescript-helpers/interfaces";
import UserModel from "../DB-entities/user/user.model";
import SessionModel from "../DB-entities/session/session.model";
import ChildModel from "../DB-entities/child/child.model";
import GiftModel from "../DB-entities/gift/gift.model";

describe("Gift router test suite", () => {
  let app: Application;
  let createdChild: Document | null;
  let secondCreatedChild: Document | null;
  let response: Response;
  let secondResponse: Response;
  let thirdResponse: Response;
  let fourthResponse: Response;
  let accessToken: string;
  let secondAccessToken: string;
  let createdGift: Document | null;
  let secondCreatedGift: Document | null;
  let updatedChild: Document | null;

  beforeAll(async () => {
    app = new Server().startForTesting();
    const url = `mongodb://127.0.0.1/gift`;
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

  describe("POST /gift/{childId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let fifthResponse: Response;
    let sixthResponse: Response;
    let seventhResponse: Response;

    beforeAll(async () => {
      response = await supertest(app)
        .post(`/gift/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("name", "Test")
        .field("price", 1)
        .attach("file", path.join(__dirname, "./files/test.jpg"));
      secondResponse = await supertest(app)
        .post(`/gift/${(createdChild as IChild)._id}`)
        .field("name", "Test")
        .field("price", 1);
      thirdResponse = await supertest(app)
        .post(`/gift/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer qwerty123`)
        .field("name", "Test")
        .field("price", 1);
      fourthResponse = await supertest(app)
        .post(`/gift/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("name", "Test");
      fifthResponse = await supertest(app)
        .post(`/gift/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("name", "Test")
        .field("price", 0);
      sixthResponse = await supertest(app)
        .post(`/gift/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("name", "Test")
        .field("price", 1)
        .attach("file", path.join(__dirname, "./files/test.txt"));
      seventhResponse = await supertest(app)
        .post(`/gift/${(createdChild as IChild)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`)
        .field("name", "Test")
        .field("price", 1);
      await supertest(app)
        .post(`/gift/${(secondCreatedChild as IChild)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`)
        .field("name", "Test")
        .field("price", 1)
        .attach("file", path.join(__dirname, "./files/test.jpg"));
      createdGift = await GiftModel.findById(response.body._id);
      updatedChild = await ChildModel.findById((createdChild as IChild)._id);
    });

    it("Should return a 201 status code", () => {
      expect(response.status).toBe(201);
    });

    it("Should create a new gift in DB", () => {
      expect(createdGift).toBeTruthy();
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual({
        ...(createdGift as IGift).toObject(),
        childId: (createdGift as IGift).childId.toString(),
        _id: (createdGift as IGift)._id.toString(),
      });
    });

    it("Should add a new gift to child document in DB", () => {
      expect(
        (updatedChild as IChild).gifts.find(
          (giftId) => giftId.toString() === response.body._id.toString()
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

    it("Should return a 400 status code", () => {
      expect(fifthResponse.status).toBe(400);
    });

    it("Should say that price must be greater or equal to 1", () => {
      expect(fifthResponse.body.message).toBe(
        "Price must be greater or equal to 1"
      );
    });

    it("Should return a 415 status code", () => {
      expect(sixthResponse.status).toBe(415);
    });

    it("Should say that only image files are allowed", () => {
      expect(sixthResponse.body.message).toBe("Only image files are allowed");
    });

    it("Should return a 404 status code", () => {
      expect(seventhResponse.status).toBe(404);
    });

    it("Should say that child wasn't found", () => {
      expect(seventhResponse.body.message).toBe("Child not found");
    });
  });

  describe("PATCH /gift/{giftId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let fifthResponse: Response;
    let sixthResponse: Response;
    let updatedGift: Document | null;
    let secondGift: Document | null;

    beforeAll(async () => {
      response = await supertest(app)
        .patch(`/gift/${(createdGift as IGift)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("name", "Test2")
        .attach("file", path.join(__dirname, "./files/test.jpg"));
      secondResponse = await supertest(app)
        .patch(`/gift/${(createdGift as IGift)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      thirdResponse = await supertest(app)
        .patch(`/gift/${(createdGift as IGift)._id}`)
        .field("name", "Test2");
      fourthResponse = await supertest(app)
        .patch(`/gift/${(createdGift as IGift)._id}`)
        .set("Authorization", `Bearer qwerty123`)
        .field("name", "Test2");
      fifthResponse = await supertest(app)
        .patch(`/gift/${(createdGift as IGift)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("price", 0);
      updatedGift = await GiftModel.findById((createdGift as IGift)._id);
      secondGift = await GiftModel.findOne({
        childId: (secondCreatedChild as IChild)._id,
      });
      sixthResponse = await supertest(app)
        .patch(`/gift/${(secondGift as IGift)._id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("name", "Test2");
    });

    it("Should return a 200 status code", () => {
      expect(response.status).toBe(200);
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual({
        ...(updatedGift as IGift).toObject(),
        childId: (updatedGift as IGift).childId.toString(),
        _id: (updatedGift as IGift)._id.toString(),
      });
    });

    it("Should update a gift in DB", () => {
      expect((updatedGift as IGift).name).toBe("Test2");
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

    it("Should say that price must be greater or equal to 1", () => {
      expect(fifthResponse.body.message).toBe(
        "Price must be greater or equal to 1"
      );
    });

    it("Should return a 404 status code", () => {
      expect(sixthResponse.status).toBe(404);
    });

    it("Should say that child wasn't found", () => {
      expect(sixthResponse.body.message).toBe("Child not found");
    });
  });

  describe("PATCH /gift/buy/{giftId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let fifthResponse: Response;
    let sixthResponse: Response;
    let updatedGift: Document | null;

    beforeAll(async () => {
      (createdChild as IChild).rewards = 1;
      await (createdChild as IChild).save();
      response = await supertest(app)
        .patch(`/gift/buy/${(createdGift as IGift)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      secondResponse = await supertest(app).patch(
        `/gift/buy/${(createdGift as IGift)._id}`
      );
      thirdResponse = await supertest(app)
        .patch(`/gift/buy/${(createdGift as IGift)._id}`)
        .set("Authorization", `Bearer qwerty123`);
      fourthResponse = await supertest(app)
        .patch(`/gift/buy/${(createdGift as IGift)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      secondCreatedGift = await GiftModel.findOne({
        childId: (secondCreatedChild as IChild)._id,
      });
      fifthResponse = await supertest(app)
        .patch(`/gift/buy/${(secondCreatedGift as IGift)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);
      sixthResponse = await supertest(app)
        .patch(`/gift/buy/${(secondCreatedGift as IGift)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      updatedGift = await GiftModel.findById((createdGift as IGift)._id);
    });

    it("Should return a 200 status code", () => {
      expect(response.status).toBe(200);
    });

    it("Should return an expected result", () => {
      expect(response.body).toEqual({
        updatedRewards: 0,
        purchasedGift: {
          ...(updatedGift as IGift).toObject(),
          childId: (updatedGift as IGift).childId.toString(),
          _id: (updatedGift as IGift)._id.toString(),
        },
      });
    });

    it("Should update a gift in DB", () => {
      expect((updatedGift as IGift).name).toBe("Test2");
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

    it("Should say that token wasn't provided", () => {
      expect(fourthResponse.body.message).toBe(
        "This gift has already been purchased"
      );
    });

    it("Should return a 409 status code", () => {
      expect(fifthResponse.status).toBe(409);
    });

    it("Should say that token wasn't provided", () => {
      expect(fifthResponse.body.message).toBe(
        "Not enough rewards for gaining this gift"
      );
    });

    it("Should return a 404 status code", () => {
      expect(sixthResponse.status).toBe(404);
    });

    it("Should say that child wasn't found", () => {
      expect(sixthResponse.body.message).toBe("Child not found");
    });
  });

  describe("DELETE /gift/{giftId}", () => {
    let response: Response;
    let secondResponse: Response;
    let thirdResponse: Response;
    let fourthResponse: Response;
    let updatedGift: Document | null;

    beforeAll(async () => {
      response = await supertest(app)
        .delete(`/gift/${(createdGift as IGift)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      secondResponse = await supertest(app).delete(
        `/gift/${(createdGift as IGift)._id}`
      );
      thirdResponse = await supertest(app)
        .delete(`/gift/${(createdGift as IGift)._id}`)
        .set("Authorization", `Bearer qwerty123`);
      fourthResponse = await supertest(app)
        .delete(`/gift/${(secondCreatedGift as IGift)._id}`)
        .set("Authorization", `Bearer ${accessToken}`);
      await supertest(app)
        .delete(`/gift/${(secondCreatedGift as IGift)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);
      updatedGift = await GiftModel.findById((createdGift as IGift)._id);
    });

    it("Should return a 204 status code", () => {
      expect(response.status).toBe(204);
    });

    it("Should delete a gift in DB", () => {
      expect(updatedGift as IGift).toBeFalsy();
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
