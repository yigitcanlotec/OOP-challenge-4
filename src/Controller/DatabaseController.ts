import { Pool } from 'pg';
import { dbConfig } from '../config';

interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
}

export class DatabaseController {
  private pool: Pool;

  constructor() {
    this.pool = new Pool(dbConfig);
  }

  // Connect to the PostgreSQL database
  async connect(): Promise<void> {
    await this.pool.connect();
  }

  // Create a new user in the database
  async createUser(
    username: string,
    email: string,
    password: string
  ): Promise<void> {
    const query =
      'INSERT INTO users(username, email, password) VALUES($1, $2, $3)';
    await this.pool.query(query, [username, email, password]);
  }

  // Retrieve a user by id from the database
  async getUser(id: number): Promise<any> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  // Update a user's information in the database
  async updateUser(id: number, username: string, email: string): Promise<void> {
    const query = 'UPDATE users SET username = $1, email = $2 WHERE id = $3';
    await this.pool.query(query, [username, email, id]);
  }

  // Delete a user from the database
  async deleteUser(id: number): Promise<void> {
    const query = 'DELETE FROM users WHERE id = $1';
    await this.pool.query(query, [id]);
  }

  // Additional methods to interact with the database can be added here...
}
