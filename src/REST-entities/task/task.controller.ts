import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { DateTime } from "luxon";
import {
  IParent,
  IChild,
  ITask,
  IParentPopulated,
} from "../../helpers/typescript-helpers/interfaces";
import ChildModel from "../child/child.model";
import TaskModel from "./task.model";
import UserModel from "../user/user.model";
import { TaskStatus } from "../../helpers/typescript-helpers/enums";

export const addTask = async (req: Request, res: Response) => {
  const parent = req.user;
  const childToUpdateId = (parent as IParent).children.find(
    (childId) => childId.toString() === req.params.childId
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  const currentDate = DateTime.local();
  let endDate: DateTime;
  if (req.body.daysToComplete) {
    endDate = currentDate.plus({ days: req.body.daysToComplete });
    const task = await TaskModel.create({
      ...req.body,
      isCompleted: TaskStatus.UNKNOWN,
      startDate: currentDate.toFormat("yyyy-MM-dd"),
      endDate: endDate.toFormat("yyyy-MM-dd"),
      childId: childToUpdateId,
    });
    await ChildModel.findByIdAndUpdate(childToUpdateId, {
      $push: { tasks: task },
    });
    return res.status(201).send({
      name: task.name,
      reward: task.reward,
      isCompleted: task.isCompleted,
      daysToComplete: task.daysToComplete,
      startDate: task.startDate,
      endDate: task.endDate,
      childId: task.childId,
      id: task._id,
    });
  }
  const task = await TaskModel.create({
    ...req.body,
    isCompleted: TaskStatus.UNKNOWN,
    childId: childToUpdateId,
  });
  await ChildModel.findByIdAndUpdate(childToUpdateId, {
    $push: { tasks: task },
  });
  return res.status(201).send({
    name: task.name,
    reward: task.reward,
    isCompleted: task.isCompleted,
    childId: task.childId,
    id: task._id,
  });
};

export const editTask = async (req: Request, res: Response) => {
  const parent = req.user;
  const taskToEdit = await TaskModel.findById(req.params.taskId);
  if (!taskToEdit) {
    return res.status(404).send({ message: "Task not found" });
  }
  const childToUpdate = (parent as IParent).children.find(
    (childId) => childId.toString() === taskToEdit.childId.toString()
  );
  if (!childToUpdate) {
    return res.status(404).send({ message: "Child not found" });
  }
  const currentDate = DateTime.local();
  let endDate: string;
  let startDate: DateTime | string;
  if (req.body.daysToComplete) {
    if (!taskToEdit.startDate) {
      endDate = currentDate
        .plus({ days: req.body.daysToComplete })
        .toFormat("yyyy-MM-dd");
      startDate = currentDate.toFormat("yyyy-MM-dd");
    } else {
      startDate = taskToEdit.startDate;
      endDate = DateTime.fromISO(startDate as string)
        .plus({
          days: req.body.daysToComplete,
        })
        .toFormat("yyyy-MM-dd");
    }
    const newTask: ITask = {
      ...taskToEdit.toObject(),
      ...req.body,
      startDate,
      endDate,
    };
    await TaskModel.findByIdAndUpdate(req.params.taskId, newTask, {
      // @ts-ignore
      overwrite: true,
    });
    return res.status(200).send({
      name: newTask.name,
      reward: newTask.reward,
      daysToComplete: newTask.daysToComplete,
      isCompleted: newTask.isCompleted,
      childId: newTask.childId,
      id: newTask._id,
      startDate,
      endDate,
    });
  }
  const newTask: ITask = { ...taskToEdit.toObject(), ...req.body };
  await TaskModel.findByIdAndUpdate(req.params.taskId, newTask, {
    // @ts-ignore
    overwrite: true,
  });
  if (newTask.startDate) {
    return res.status(200).send({
      name: newTask.name,
      reward: newTask.reward,
      daysToComplete: newTask.daysToComplete,
      isCompleted: newTask.isCompleted,
      startDate: newTask.startDate,
      endDate: newTask.endDate,
      childId: newTask.childId,
      id: newTask._id,
    });
  }
  return res.status(200).send({
    name: newTask.name,
    reward: newTask.reward,
    isCompleted: newTask.isCompleted,
    childId: newTask.childId,
    id: newTask._id,
  });
};

export const deleteTask = async (req: Request, res: Response) => {
  const parent = req.user;
  const taskToDelete = await TaskModel.findById(req.params.taskId);
  if (!taskToDelete) {
    return res.status(404).send({ message: "Task not found" });
  }
  const childToUpdate = (parent as IParent).children.find(
    (childId) => childId.toString() === taskToDelete.childId.toString()
  );
  if (!childToUpdate) {
    return res.status(404).send({ message: "Child not found" });
  }
  const deletedTask = await TaskModel.findByIdAndDelete(req.params.taskId);
  await ChildModel.findByIdAndUpdate((deletedTask as ITask).childId, {
    $pull: { tasks: mongoose.Types.ObjectId((deletedTask as ITask)._id) },
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
    (childId) => childId.toString() === taskToConfirm.childId.toString()
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  if (taskToConfirm.isCompleted === TaskStatus.CONFIRMED) {
    return res.status(403).send({ message: "Task is already confirmed" });
  }
  if (taskToConfirm.isCompleted === TaskStatus.CANCELED) {
    return res.status(403).send({ message: "Task is already canceled" });
  }
  const confirmedTask = await TaskModel.findByIdAndUpdate(
    req.params.taskId,
    {
      $set: { isCompleted: TaskStatus.CONFIRMED },
    },
    { new: true }
  );
  const childToUpdate = await ChildModel.findById(
    (confirmedTask as ITask).childId
  );
  const updatedRewards =
    (childToUpdate as IChild).rewards + (confirmedTask as ITask).reward;
  await ChildModel.findByIdAndUpdate((confirmedTask as ITask).childId, {
    $set: { rewards: updatedRewards },
  });
  if ((confirmedTask as ITask).startDate) {
    return res.status(200).send({
      confirmedTask: {
        name: (confirmedTask as ITask).name,
        reward: (confirmedTask as ITask).reward,
        daysToComplete: (confirmedTask as ITask).daysToComplete,
        isCompleted: (confirmedTask as ITask).isCompleted,
        startDate: (confirmedTask as ITask).startDate,
        endDate: (confirmedTask as ITask).endDate,
        childId: (confirmedTask as ITask).childId,
        id: (confirmedTask as ITask)._id,
      },
      updatedRewards,
    });
  }
  return res.status(200).send({
    confirmedTask: {
      name: (confirmedTask as ITask).name,
      reward: (confirmedTask as ITask).reward,
      isCompleted: (confirmedTask as ITask).isCompleted,
      childId: (confirmedTask as ITask).childId,
      id: (confirmedTask as ITask)._id,
    },
    updatedRewards,
  });
};

export const cancelTask = async (req: Request, res: Response) => {
  const parent = req.user;
  const taskToDecline = await TaskModel.findById(req.params.taskId);
  if (!taskToDecline) {
    return res.status(404).send({ message: "Task not found" });
  }
  const childToUpdateId = (parent as IParent).children.find(
    (childId) => childId.toString() === taskToDecline.childId.toString()
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  if (taskToDecline.isCompleted === TaskStatus.CANCELED) {
    return res.status(403).send({ message: "Task is already canceled" });
  }
  if (taskToDecline.isCompleted === TaskStatus.CONFIRMED) {
    return res.status(403).send({ message: "Task is already confirmed" });
  }
  const canceledTask = await TaskModel.findByIdAndUpdate(
    req.params.taskId,
    {
      $set: { isCompleted: TaskStatus.CANCELED },
    },
    { new: true }
  );
  if ((canceledTask as ITask).startDate) {
    return res.status(200).send({
      name: (canceledTask as ITask).name,
      reward: (canceledTask as ITask).reward,
      daysToComplete: (canceledTask as ITask).daysToComplete,
      isCompleted: (canceledTask as ITask).isCompleted,
      startDate: (canceledTask as ITask).startDate,
      endDate: (canceledTask as ITask).endDate,
      childId: (canceledTask as ITask).childId,
      id: (canceledTask as ITask)._id,
    });
  }
  return res.status(200).send({
    name: (canceledTask as ITask).name,
    reward: (canceledTask as ITask).reward,
    isCompleted: (canceledTask as ITask).isCompleted,
    childId: (canceledTask as ITask).childId,
    id: (canceledTask as ITask)._id,
  });
};

export const resetTask = async (req: Request, res: Response) => {
  const parent = req.user;
  const taskToReset = await TaskModel.findById(req.params.taskId);
  const childToUpdateId = (parent as IParent).children.find(
    (childId) =>
      childId.toString() === (taskToReset as ITask).childId.toString()
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  if (!taskToReset) {
    return res.status(404).send({ message: "Task not found" });
  }
  if (taskToReset.isCompleted === TaskStatus.UNKNOWN) {
    return res.status(403).send({ message: "Task has been already reset" });
  }
  const unknownTask = await TaskModel.findByIdAndUpdate(
    req.params.taskId,
    {
      $set: { isCompleted: TaskStatus.UNKNOWN },
    },
    { new: true }
  );
  if ((unknownTask as ITask).startDate) {
    return res.status(200).send({
      name: (unknownTask as ITask).name,
      reward: (unknownTask as ITask).reward,
      daysToComplete: (unknownTask as ITask).daysToComplete,
      isCompleted: (unknownTask as ITask).isCompleted,
      startDate: (unknownTask as ITask).startDate,
      endDate: (unknownTask as ITask).endDate,
      childId: (unknownTask as ITask).childId,
      id: (unknownTask as ITask)._id,
    });
  }
  return res.status(200).send({
    name: (unknownTask as ITask).name,
    reward: (unknownTask as ITask).reward,
    isCompleted: (unknownTask as ITask).isCompleted,
    childId: (unknownTask as ITask).childId,
    id: (unknownTask as ITask)._id,
  });
};

export const getTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const parent = req.user;
  return UserModel.findOne(parent as IParent)
    .populate({
      path: "children",
      model: ChildModel,
      populate: [{ path: "tasks", model: TaskModel }],
    })
    .exec((err, data) => {
      if (err) {
        next(err);
      }
      const dataToEdit = (data as IParentPopulated).children.map(
        (child) => child.tasks
      );
      const dataToSend = dataToEdit.map((childArray) => {
        return childArray.map((childTask) => {
          if (childTask.startDate) {
            return {
              name: childTask.name,
              reward: childTask.reward,
              isCompleted: childTask.isCompleted,
              daysToComplete: childTask.daysToComplete,
              startDate: childTask.startDate,
              endDate: childTask.endDate,
              childId: childTask.childId,
              id: childTask._id,
            };
          }
          return {
            name: childTask.name,
            reward: childTask.reward,
            isCompleted: childTask.isCompleted,
            childId: childTask.childId,
            id: childTask._id,
          };
        });
      });
      return res.status(200).send(dataToSend);
    });
};

export const getFinishedTasks = async (req: Request, res: Response) => {
  const { childId } = req.params;
  const existingChild = await ChildModel.findById(childId);
  if (!existingChild) {
    return res.status(404).send({ message: "Child not found" });
  }
  const childFinishedTasks = await TaskModel.find({
    $and: [
      { childId: (childId as unknown) as mongoose.Types.ObjectId },
      { isCompleted: TaskStatus.CONFIRMED },
    ],
  });
  if (!childFinishedTasks.length) {
    return res
      .status(404)
      .send({ message: "No finished tasks found for this child" });
  }
  const dataToSend = childFinishedTasks.map((finishedTask) => {
    if (finishedTask.startDate) {
      return {
        name: finishedTask.name,
        reward: finishedTask.reward,
        isCompleted: finishedTask.isCompleted,
        daysToComplete: finishedTask.daysToComplete,
        startDate: finishedTask.startDate,
        endDate: finishedTask.endDate,
        childId: finishedTask.childId,
        id: finishedTask._id,
      };
    }
    return {
      name: finishedTask.name,
      reward: finishedTask.reward,
      isCompleted: finishedTask.isCompleted,
      childId: finishedTask.childId,
      id: finishedTask._id,
    };
  });
  return res.status(200).send(dataToSend);
};
