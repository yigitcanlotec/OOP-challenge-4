import { dbConfig } from '../config';

import {
  DynamoDBClient,
  DeleteItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  PutItemCommand,
  PutItemCommandOutput,
} from '@aws-sdk/client-dynamodb';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  ListObjectsV2CommandOutput,
  DeleteObjectCommandInput,
  ListObjectsV2CommandInput,
} from '@aws-sdk/client-s3';

interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
}

export class DatabaseController {
  private dynamoDBClient: DynamoDBClient;

  constructor() {
    this.dynamoDBClient = new DynamoDBClient(dbConfig);
  }

  async createUser(
    username: string,
    password: string,
    tableName: string,
    email?: string,
    indexName?: string
  ): Promise<any> {
    const input = {
      TableName: tableName,
      Item: {
        username: { S: username },
        password: { S: password },
      },
      ConditionExpression: 'attribute_not_exists(username)',
    };

    const command = new PutItemCommand(input);
    const result = await this.dynamoDBClient.send(command);

    if (result.$metadata.httpStatusCode === 200) return true;
    return false;
  }

  async getUser(
    id: string,
    tableName: string,
    indexName?: string
  ): Promise<any> {
    const input = {
      TableName: tableName,
      Key: {
        username: { S: id },
      },
    };

    const result = await this.dynamoDBClient.send(new GetItemCommand(input));
    if (result.$metadata.httpStatusCode === 200) return result.Item!;
    return [];
  }

  async updateUser(
    id: string,
    tableName: string,
    params: string
  ): Promise<any> {
    const input = {
      TableName: tableName,
      Key: {
        username: { S: id },
      },
      UpdateExpression: `set ${params} = :setParams`,
      ExpressionAttributeValues: {
        ':setParams': { S: params },
      },
    };
    const command = new UpdateItemCommand(input);
    const result = await this.dynamoDBClient.send(command);
    if (result.$metadata.httpStatusCode === 200) return true;
    return false;
  }

  async deleteUser(id: string, tableName: string): Promise<any> {
    const input = {
      TableName: tableName,
      Key: {
        username: { S: id },
      },
    };
    const command = new DeleteItemCommand(input);
    const result = await this.dynamoDBClient.send(command);
    if (result.$metadata.httpStatusCode === 200) return true;
    return false;
  }
}
