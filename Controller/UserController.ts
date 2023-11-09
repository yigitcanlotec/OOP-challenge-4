import { User } from '../Model/User';

export class UserController {
  private users: User[] = []; // This will act as a faux database for the sake of this example

  // Function overloads
  createUser(username: string, email: string, password: string): User;
  createUser(username: string, password: string): User;

  public createUser(
    username: string,
    emailOrPassword: string,
    password?: string
  ): User {
    let email: string;

    if (password) {
      email = emailOrPassword;
    } else {
      password = emailOrPassword;
      email = '';
    }

    const newUser = new User(username, password);
    newUser.setEmail(email);
    this.users.push(newUser);
    return newUser;
  }

  public getUser(id: string): User | undefined {
    return this.users.find((user) => user.getId() === id);
  }

  public updateUser(
    id: string,
    username: string,
    password: string,
    email?: string
  ): User | undefined {
    const user = this.getUser(id);
    if (user) {
      user.setUsername(username!);
      user.setEmail(email || user.getEmail());
      user.setPassword(password);
    }
    return user;
  }

  public deleteUser(id: string): boolean {
    const index = this.users.findIndex((user) => user.getId() === id);
    if (index > -1) {
      this.users.splice(index, 1);
      return true;
    }
    return false;
  }
}
