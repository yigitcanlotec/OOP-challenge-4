// config.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export const dbConfig = new DynamoDBClient({
  region: process.env.REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SECRET_ACCESS_KEY || '',
  },
});
