interface ITask {
  id: string;
  title: string;
  isDone: boolean;
}

export class Task {
  private id: string;
  private title: string;
  private isDone: boolean;

  constructor(id: string, title: string, isDone: boolean) {
    this.id = id;
    this.title = title;
    this.isDone = isDone;
  }

  setId(id: string) {
    this.id = id;
  }

  setTitle(title: string) {
    this.title = title;
  }

  setIsDone(done: boolean) {
    this.isDone = done;
  }

  getId() {
    return this.id;
  }

  getTitle() {
    return this.title;
  }

  getIsDone() {
    return this.isDone;
  }
}
