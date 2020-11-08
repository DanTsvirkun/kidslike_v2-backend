import { Request, Response } from "express";
import { Types } from "mongoose";
import { IParent, IChild, ITask } from "../typescript-helpers/interfaces";
import { ChildModel } from "../child/child.model";
import { TaskModel } from "./task.model";

export const addTask = async (req: Request, res: Response) => {
  const parent = req.user;
  const childToUpdateId = (parent as IParent).children.find(
    (childId) => childId.toString() === req.params.childId
  );
  if (!childToUpdateId) {
    return res.status(404).send({ message: "Child not found" });
  }
  const task = await TaskModel.create({
    ...req.body,
    isCompleted: false,
    childId: childToUpdateId,
  });
  await ChildModel.findByIdAndUpdate(childToUpdateId, {
    $push: { tasks: task },
  });
  return res.status(201).send(task);
};

export const editTask = async (req: Request, res: Response) => {
  const taskToEdit = await TaskModel.findById(req.params.taskId);
  if (!taskToEdit) {
    return res.status(404).send({ message: "Task not found" });
  }
  const newTask: ITask = { ...taskToEdit.toObject(), ...req.body };
  await TaskModel.findByIdAndUpdate(req.params.taskId, newTask, {
    // @ts-ignore
    overwrite: true,
  });
  return res.status(200).send(newTask);
};

export const deleteTask = async (req: Request, res: Response) => {
  const deletedTask = await TaskModel.findByIdAndDelete(req.params.taskId);
  if (!deletedTask) {
    return res.status(404).send({ message: "Task not found" });
  }
  await ChildModel.findByIdAndUpdate((deletedTask as ITask).childId, {
    $pull: { tasks: Types.ObjectId(deletedTask._id) },
  });
  return res.status(204).end();
};

export const confirmTask = async (req: Request, res: Response) => {
  const taskToConfirm = await TaskModel.findById(req.params.taskId);
  if (!taskToConfirm) {
    return res.status(404).send({ message: "Task not found" });
  }
  if ((taskToConfirm as ITask).isCompleted) {
    return res.status(403).send({ message: "Task is already complete" });
  }
  const confirmedTask = await TaskModel.findByIdAndUpdate(
    req.params.taskId,
    {
      $set: { isCompleted: true },
    },
    { new: true }
  );
  const childToUpdate = await ChildModel.findById(
    (confirmedTask as ITask).childId
  );
  const updatedRewards =
    ((childToUpdate as unknown) as IChild).rewards +
    (confirmedTask as ITask).reward;
  console.log(childToUpdate);
  await ChildModel.findByIdAndUpdate((confirmedTask as ITask).childId, {
    $set: { rewards: updatedRewards },
  });
  return res.status(200).send(confirmedTask);
};
