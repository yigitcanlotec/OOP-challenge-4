// config.ts
export const dbConfig = {
  user: process.env.DB_USER || 'defaultUser',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'myDatabase',
  password: process.env.DB_PASSWORD || 'defaultPassword',
  port: parseInt(process.env.DB_PORT!, 10) || 5432,
  // Add more environment-specific configuration options here
};
