import { dynamoDBConfig } from '../config';

import {
  DynamoDBClient,
  DeleteItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';

interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
}

export class DatabaseUserController {
  private dynamoDBClient: DynamoDBClient;
  private tableName: string;

  constructor(tableName: string) {
    this.dynamoDBClient = new DynamoDBClient(dynamoDBConfig);
    this.tableName = tableName;
  }

  async createUser(
    username: string,
    password: string,
    email?: string,
    indexName?: string
  ): Promise<any> {
    const dynamoDBInput = {
      TableName: this.tableName,
      Item: {
        username: { S: username },
        password: { S: password },
      },
      ConditionExpression: 'attribute_not_exists(username)',
    };

    const dynamoDBCommand = new PutItemCommand(dynamoDBInput);
    const dynamoDBResult = await this.dynamoDBClient.send(dynamoDBCommand);

    if (dynamoDBResult.$metadata.httpStatusCode === 200) return true;
    return false;
  }

  async getUser(id: string, indexName?: string): Promise<any> {
    const dynamoDBInput = {
      TableName: this.tableName,
      Key: {
        username: { S: id },
      },
    };

    const dynamoDBResult = await this.dynamoDBClient.send(
      new GetItemCommand(dynamoDBInput)
    );
    if (dynamoDBResult.$metadata.httpStatusCode === 200)
      return dynamoDBResult.Item!;
    return [];
  }

  async updateUser(id: string, params: string): Promise<any> {
    const dynamoDBInput = {
      TableName: this.tableName,
      Key: {
        username: { S: id },
      },
      UpdateExpression: `set ${params} = :setParams`,
      ExpressionAttributeValues: {
        ':setParams': { S: params },
      },
    };
    const dynamoDBCommand = new UpdateItemCommand(dynamoDBInput);
    const dynamoDBResult = await this.dynamoDBClient.send(dynamoDBCommand);
    if (dynamoDBResult.$metadata.httpStatusCode === 200) return true;
    return false;
  }

  async deleteUser(id: string): Promise<any> {
    const dynamoDBInput = {
      TableName: this.tableName,
      Key: {
        username: { S: id },
      },
    };
    const dynamoDBCommand = new DeleteItemCommand(dynamoDBInput);
    const dynamoDBResult = await this.dynamoDBClient.send(dynamoDBCommand);
    if (dynamoDBResult.$metadata.httpStatusCode === 200) return true;
    return false;
  }
}
