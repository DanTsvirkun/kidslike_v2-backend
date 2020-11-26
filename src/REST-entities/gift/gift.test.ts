import path from "path";
import mongoose, { Document } from "mongoose";
import supertest, { Response } from "supertest";
import { Application } from "express";
import Server from "../../server/server";
import { IChild, IGift } from "../../helpers/typescript-helpers/interfaces";
import { Gender } from "../../helpers/typescript-helpers/enums";
import UserModel from "../user/user.model";
import SessionModel from "../session/session.model";
import ChildModel from "../child/child.model";
import GiftModel from "./gift.model";

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
      .send({ name: "Test", gender: Gender.MALE });
    fourthResponse = await supertest(app)
      .post("/child")
      .set("Authorization", `Bearer ${secondAccessToken}`)
      .send({ name: "Test", gender: Gender.FEMALE });
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

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    afterAll(async () => {
      response = await supertest(app)
        .post(`/gift/${(secondCreatedChild as IChild)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`)
        .field("name", "Test")
        .field("price", 1)
        .attach("file", path.join(__dirname, "./test-files/test.jpg"));
      secondCreatedGift = await GiftModel.findById(response.body._id);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/gift/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .field("name", "Test")
          .field("price", 1)
          .attach("file", path.join(__dirname, "./test-files/test.jpg"));
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
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/gift/${(createdChild as IChild)._id}`)
          .field("name", "Test")
          .field("price", 1);
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
          .post(`/gift/${(createdChild as IChild)._id}`)
          .field("name", "Test")
          .field("price", 1)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With invalid request body (no 'price' provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/gift/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .field("name", "Test");
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'username' is required", () => {
        expect(response.body.message).toBe('"price" is required');
      });
    });

    context("With invalid request body ('price' = 0)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/gift/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .field("name", "Test")
          .field("price", 0);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'price' must be greater than or equal to 1", () => {
        expect(response.body.message).toBe(
          '"price" must be greater than or equal to 1'
        );
      });
    });

    context("With invalid request body (not image file)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/gift/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .field("name", "Test")
          .field("price", 1)
          .attach("file", path.join(__dirname, "./test-files/test.txt"));
      });

      it("Should return a 415 status code", () => {
        expect(response.status).toBe(415);
      });

      it("Should say that only image files are allowed", () => {
        expect(response.body.message).toBe("Only image files are allowed");
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/gift/${(createdChild as IChild)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`)
          .field("name", "Test")
          .field("price", 1);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that child wasn't found", () => {
        expect(response.body.message).toBe("Child not found");
      });
    });

    context("With invalid 'giftId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .post(`/gift/qwerty123`)
          .set("Authorization", `Bearer ${accessToken}`)
          .field("name", "Test")
          .field("price", 1);
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

  describe("GET /gift", () => {
    let response: Response;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .get("/gift")
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 200 status code", () => {
        expect(response.status).toBe(200);
      });

      it("Should return an expected result", () => {
        expect(response.body).toEqual([
          [
            {
              ...(createdGift as IGift).toObject(),
              childId: (createdGift as IGift).childId.toString(),
              _id: (createdGift as IGift)._id.toString(),
            },
          ],
        ]);
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).get("/gift");
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
          .get("/gift")
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

  describe("PATCH /gift/{giftId}", () => {
    let response: Response;
    let updatedGift: Document | null;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/gift/${(createdGift as IGift)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .field("name", "Test2")
          .attach("file", path.join(__dirname, "./test-files/test.jpg"));
        updatedGift = await GiftModel.findById((createdGift as IGift)._id);
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
    });

    context("With invalid request body (no fields provided)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/gift/${(createdGift as IGift)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that at least one field is required", () => {
        expect(response.body.message).toBe("At least one field is required");
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).patch(
          `/gift/${(createdGift as IGift)._id}`
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
          .patch(`/gift/${(createdGift as IGift)._id}`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("With invalid request body (price = 0)", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/gift/${(createdGift as IGift)._id}`)
          .set("Authorization", `Bearer ${accessToken}`)
          .field("price", 0);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'price' must be greater than or equal to 1", () => {
        expect(response.body.message).toBe(
          '"price" must be greater than or equal to 1'
        );
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/gift/${(createdGift as IGift)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`)
          .field("name", "Test2");
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that child wasn't found", () => {
        expect(response.body.message).toBe("Child not found");
      });
    });

    context("With invalid 'giftId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/gift/qwerty123`)
          .set("Authorization", `Bearer ${accessToken}`)
          .field("name", "Test2");
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'giftId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'giftId'. Must be MongoDB ObjectId"
        );
      });
    });
  });

  describe("PATCH /gift/buy/{giftId}", () => {
    let response: Response;
    let updatedGift: Document | null;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        (createdChild as IChild).rewards = 1;
        await (createdChild as IChild).save();
        response = await supertest(app)
          .patch(`/gift/buy/${(createdGift as IGift)._id}`)
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
        expect((updatedGift as IGift).isPurchased).toBeTruthy();
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).patch(
          `/gift/buy/${(createdGift as IGift)._id}`
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
          .patch(`/gift/buy/${(createdGift as IGift)._id}`)
          .set("Authorization", `Bearer qwerty123`);
      });

      it("Should return a 401 status code", () => {
        expect(response.status).toBe(401);
      });

      it("Should return an unauthorized status", () => {
        expect(response.body.message).toBe("Unauthorized");
      });
    });

    context("Buying an already bought gift", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/gift/buy/${(createdGift as IGift)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 403 status code", () => {
        expect(response.status).toBe(403);
      });

      it("Should say that this gift has already been purchased", () => {
        expect(response.body.message).toBe(
          "This gift has already been purchased"
        );
      });
    });

    context("Buying a gift with not enough rewards", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/gift/buy/${(secondCreatedGift as IGift)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`);
      });

      it("Should return a 409 status code", () => {
        expect(response.status).toBe(409);
      });

      it("Should say that there are not enough rewards for this gift", () => {
        expect(response.body.message).toBe(
          "Not enough rewards for gaining this gift"
        );
      });
    });

    context("With another account", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/gift/buy/${(createdGift as IGift)._id}`)
          .set("Authorization", `Bearer ${secondAccessToken}`);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that child wasn't found", () => {
        expect(response.body.message).toBe("Child not found");
      });
    });

    context("With invalid 'giftId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .patch(`/gift/buy/qwerty123`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'giftId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'giftId'. Must be MongoDB ObjectId"
        );
      });
    });
  });

  describe("DELETE /gift/{giftId}", () => {
    let response: Response;
    let updatedGift: Document | null;

    it("Init endpoint testing", () => {
      expect(true).toBe(true);
    });

    afterAll(async () => {
      await supertest(app)
        .delete(`/gift/${(secondCreatedGift as IGift)._id}`)
        .set("Authorization", `Bearer ${secondAccessToken}`);
    });

    context("Valid request", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete(`/gift/${(createdGift as IGift)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
        updatedGift = await GiftModel.findById((createdGift as IGift)._id);
      });

      it("Should return a 204 status code", () => {
        expect(response.status).toBe(204);
      });

      it("Should delete a gift in DB", () => {
        expect(updatedGift as IGift).toBeFalsy();
      });
    });

    context("Without providing 'accessToken'", () => {
      beforeAll(async () => {
        response = await supertest(app).delete(
          `/gift/${(createdGift as IGift)._id}`
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
          .delete(`/gift/${(createdGift as IGift)._id}`)
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
        response = await supertest(app)
          .delete(`/gift/${(secondCreatedGift as IGift)._id}`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 404 status code", () => {
        expect(response.status).toBe(404);
      });

      it("Should say that child wasn't found", () => {
        expect(response.body.message).toBe("Child not found");
      });
    });

    context("With invalid 'giftId'", () => {
      beforeAll(async () => {
        response = await supertest(app)
          .delete(`/gift/qwerty123`)
          .set("Authorization", `Bearer ${accessToken}`);
      });

      it("Should return a 400 status code", () => {
        expect(response.status).toBe(400);
      });

      it("Should say that 'giftId' is invalid", () => {
        expect(response.body.message).toBe(
          "Invalid 'giftId'. Must be MongoDB ObjectId"
        );
      });
    });
  });
});
