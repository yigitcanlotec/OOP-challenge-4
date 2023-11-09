import { Task } from '../Model/Task';

export class TaskController {
  private tasks: Task[] = [];

  public createTask(id: string, title: string, isDone: boolean): Task {
    const newTask = new Task(id, title, isDone);
    this.tasks.push(newTask);
    return newTask;
  }

  public getTask(id: string): Task | undefined {
    return this.tasks.find((task) => task.getId() === id);
  }

  public getTasks(): Task[] {
    return this.tasks;
  }

  public updateTask(id: string, title: string, isDone: boolean): Boolean {
    const task = this.tasks.find((task) => task.getId() === id);
    if (task) {
      task.setIsDone(isDone);
      task.setTitle(title);
      return true;
    }
    return false;
  }

  public deleteTask(id: string) {
    const index = this.tasks.findIndex((user) => user.getId() === id);
    if (index > -1) {
      this.tasks.splice(index, 1);
      return true;
    }
    return false;
  }
}
