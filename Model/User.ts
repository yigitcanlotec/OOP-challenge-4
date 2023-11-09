export interface IUser {
  id: string;
  email: string;
  username: string;
  password: string;
  token: string | undefined;
}

export class User {
  private id: string;
  private email: string;
  private username: string;
  private password: string;
  private token: string;

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
  }

  setToken(token: string) {
    this.token = token;
  }

  setId(id: string) {
    this.id = id;
  }

  private validateEmail(email: string): boolean {
    const emailRegex: RegExp =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  setEmail(email: string) {
    if (this.validateEmail(email)) this.email = email;
    else throw new Error('Invalid email format');
  }

  setUsername(username: string) {
    this.username = username;
  }

  setPassword(password: string) {
    this.password = password;
  }

  getEmail(): string {
    return this.email;
  }

  getId(): string {
    return this.id;
  }

  getToken(): string {
    return this.token;
  }

  getPassword(): string {
    return this.password;
  }

  getUsername(): string {
    return this.username;
  }
}
