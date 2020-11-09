import { Request, Response } from "express";
import { Types } from "mongoose";
import { DateTime } from "luxon";
import { IParent, IChild, ITask } from "../typescript-helpers/interfaces";
import ChildModel from "../child/child.model";
import TaskModel from "./task.model";
import UserModel from "../user/user.model";
import { TaskStatus } from "../typescript-helpers/enums";

export const addTask = async (req: Request, res: Response) => {
  const parent = req.user;
  const childToUpdateId = (parent as IParent).children.find(
    (childId) => childId.toString() === req.params.childId
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  if (!(req.body.reward >= 1)) {
    return res
      .status(400)
      .send({ message: "reward must be greater or equal to 1" });
  }
  const currentDate = DateTime.local();
  let endDate: DateTime;
  if (req.body.daysToComplete) {
    // @ts-ignore
    if (!(req.body.daysToComplete >= 1)) {
      return res
        .status(400)
        .send({ message: "daysToComplete must be greater or equal to 1" });
    }
    endDate = currentDate.plus({ days: req.body.daysToComplete });
    const task = await TaskModel.create({
      ...req.body,
      startDate: currentDate.toLocaleString(),
      endDate: endDate.toLocaleString(),
      childId: childToUpdateId,
    });
    await ChildModel.findByIdAndUpdate(childToUpdateId, {
      $push: { tasks: task },
    });
    return res.status(201).send(task);
  }
  const task = await TaskModel.create({
    ...req.body,
    startDate: currentDate.toLocaleString(),
    childId: childToUpdateId,
  });
  await ChildModel.findByIdAndUpdate(childToUpdateId, {
    $push: { tasks: task },
  });
  return res.status(201).send(task);
};

export const editTask = async (req: Request, res: Response) => {
  const parent = req.user;
  const taskToEdit = await TaskModel.findById(req.params.taskId);
  if (!taskToEdit) {
    return res.status(404).send({ message: "Task not found" });
  }
  const childToUpdate = (parent as IParent).children.find(
    (childId) => childId.toString() === (taskToEdit as ITask).childId.toString()
  );
  if (!childToUpdate) {
    return res.status(404).send({ message: "Child not found" });
  }
  if ((req.body.reward || req.body.reward === 0) && !(req.body.reward >= 1)) {
    return res
      .status(400)
      .send({ message: "reward must be greater or equal to 1" });
  }
  const currentDate = DateTime.local();
  let endDate: DateTime;
  if (req.body.daysToComplete) {
    // @ts-ignore
    if (!(req.body.daysToComplete >= 1)) {
      return res
        .status(400)
        .send({ message: "daysToComplete must be greater or equal to 1" });
    }
    endDate = currentDate.plus({ days: req.body.daysToComplete });
    const newTask: ITask = {
      ...taskToEdit.toObject(),
      ...req.body,
      endDate: endDate.toLocaleString(),
    };
    await TaskModel.findByIdAndUpdate(req.params.taskId, newTask, {
      // @ts-ignore
      overwrite: true,
    });
    return res.status(200).send(newTask);
  }
  const newTask: ITask = { ...taskToEdit.toObject(), ...req.body };
  await TaskModel.findByIdAndUpdate(req.params.taskId, newTask, {
    // @ts-ignore
    overwrite: true,
  });
  return res.status(200).send(newTask);
};

export const deleteTask = async (req: Request, res: Response) => {
  const parent = req.user;
  const taskToDelete = await TaskModel.findById(req.params.taskId);
  if (!taskToDelete) {
    return res.status(404).send({ message: "Task not found" });
  }
  const childToUpdate = (parent as IParent).children.find(
    (childId) =>
      childId.toString() === (taskToDelete as ITask).childId.toString()
  );
  if (!childToUpdate) {
    return res.status(404).send({ message: "Child not found" });
  }
  const deletedTask = await TaskModel.findByIdAndDelete(req.params.taskId);
  await ChildModel.findByIdAndUpdate((deletedTask as ITask).childId, {
    $pull: { tasks: Types.ObjectId((deletedTask as ITask)._id) },
  });
  return res.status(204).end();
};

export const confirmTask = async (req: Request, res: Response) => {
  const parent = req.user;
  const taskToConfirm = await TaskModel.findById(req.params.taskId);
  if (!taskToConfirm) {
    return res.status(404).send({ message: "Task not found" });
  }
  const childToUpdateId = (parent as IParent).children.find(
    (childId) =>
      childId.toString() === (taskToConfirm as ITask).childId.toString()
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  if ((taskToConfirm as ITask).isCompleted === TaskStatus.Confirmed) {
    return res.status(403).send({ message: "Task is already confirmed" });
  }
  if ((taskToConfirm as ITask).isCompleted === TaskStatus.Canceled) {
    return res.status(403).send({ message: "Task is already canceled" });
  }
  const confirmedTask = await TaskModel.findByIdAndUpdate(
    req.params.taskId,
    {
      $set: { isCompleted: TaskStatus.Confirmed },
    },
    { new: true }
  );
  const childToUpdate = await ChildModel.findById(
    (confirmedTask as ITask).childId
  );
  const updatedRewards =
    ((childToUpdate as unknown) as IChild).rewards +
    (confirmedTask as ITask).reward;
  await ChildModel.findByIdAndUpdate((confirmedTask as ITask).childId, {
    $set: { rewards: updatedRewards },
  });
  return res.status(200).send({ updatedRewards, confirmedTask });
};

export const cancelTask = async (req: Request, res: Response) => {
  const parent = req.user;
  const taskToDecline = await TaskModel.findById(req.params.taskId);
  if (!taskToDecline) {
    return res.status(404).send({ message: "Task not found" });
  }
  const childToUpdateId = (parent as IParent).children.find(
    (childId) =>
      childId.toString() === (taskToDecline as ITask).childId.toString()
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  if ((taskToDecline as ITask).isCompleted === TaskStatus.Canceled) {
    return res.status(403).send({ message: "Task is already canceled" });
  }
  if ((taskToDecline as ITask).isCompleted === TaskStatus.Confirmed) {
    return res.status(403).send({ message: "Task is already confirmed" });
  }
  const canceledTask = await TaskModel.findByIdAndUpdate(
    req.params.taskId,
    {
      $set: { isCompleted: TaskStatus.Canceled },
    },
    { new: true }
  );
  return res.status(200).send(canceledTask);
};

export const resetTask = async (req: Request, res: Response) => {
  const parent = req.user;
  const taskToReset = await TaskModel.findById(req.params.taskId);
  if (!taskToReset) {
    return res.status(404).send({ message: "Task not found" });
  }
  const childToUpdateId = (parent as IParent).children.find(
    (childId) =>
      childId.toString() === (taskToReset as ITask).childId.toString()
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  const resetTesk = await TaskModel.findByIdAndUpdate(
    req.params.taskId,
    {
      $set: { isCompleted: TaskStatus.Unknown },
    },
    { new: true }
  );
  res.status(200).send(resetTesk);
};

export const getTasks = async (req: Request, res: Response) => {
  const parent = req.user;
  return UserModel.findOne(parent as IParent)
    .populate({
      path: "children",
      model: ChildModel,
      populate: [{ path: "tasks", model: TaskModel }],
    })
    .exec((err, data) =>
      res
        .status(200)
        .send(
          (data as IParent).children.map(
            (child) => ((child as unknown) as IChild).tasks
          )
        )
    );
};
