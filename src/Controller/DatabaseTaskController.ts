import { s3ClientConfig, dynamoDBConfig } from '../config';
import { ReturnMessage } from '../Model/Message';
import { marshall } from '@aws-sdk/util-dynamodb';
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

import {
  DynamoDBClient,
  DeleteItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class DatabaseTaskController {
  private dynamoDBClient: DynamoDBClient;
  private s3Client: S3Client;
  private tableName: string;
  private bucketName: string;

  constructor(tableName: string, bucketName?: string) {
    this.dynamoDBClient = dynamoDBConfig;
    this.s3Client = s3ClientConfig;
    this.tableName = tableName;
    if (bucketName) this.bucketName = bucketName;
  }

  async createTask(
    id: string,
    task_id: string,
    title: string,
    done: boolean,
    filename?: string
  ) {
    const dynamoDBInput = {
      TableName: this.tableName,
      Item: {
        username: { S: id },
        todo_id: { S: task_id },
        title: { S: title },
        isDone: { BOOL: done },
      },
    };

    const dynamoDBCommand = new PutItemCommand(dynamoDBInput);
    this.dynamoDBClient
      .send(dynamoDBCommand)
      .then((response) => {
        if (response.$metadata.httpStatusCode === 200 && filename) {
          this.uploadImage(filename);
        }
      })
      .catch((error) => this.handleDynamoDBError(error.name));
  }

  async readTasks(id: string, indexName?: string) {
    const dynamoDBInput = {
      TableName: this.tableName,
      IndexName: indexName,
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: {
        ':username': { S: id },
      },
    };
    const dynamoDBCommand = new QueryCommand(dynamoDBInput);
    const dynamoDBResult = await this.dynamoDBClient.send(dynamoDBCommand);

    try {
      if (
        dynamoDBResult.$metadata.httpStatusCode === 200 &&
        dynamoDBResult.Items
      ) {
        const parsedItems = dynamoDBResult.Items.map((item) => {
          return {
            todo_id: item.todo_id.S,
            title: item.title.S,
            isDone: item.isDone.BOOL,
          };
        });

        return { httpStatusCode: 200, data: parsedItems };
      } else {
        return {
          httpStatusCode: dynamoDBResult.$metadata.httpStatusCode,
          message: '',
          data: '',
        };
      }
    } catch (error) {
      this.handleDynamoDBError(error.name);
    }
  }

  async updateTask(username: string, task_id: string, title: string) {
    const dynamoDBInput = {
      TableName: this.tableName,
      Key: marshall({
        username: username,
        todo_id: task_id,
      }),
      UpdateExpression: 'set title = :title',
      ExpressionAttributeValues: marshall({
        ':title': title,
      }),
    };

    const dynamoDBCommand = new UpdateItemCommand(dynamoDBInput);
    const dynamoDBResult = await this.dynamoDBClient.send(dynamoDBCommand);

    try {
      if (dynamoDBResult.$metadata.httpStatusCode === 200)
        return { httpStatusCode: 200 };
      return { httpStatusCode: dynamoDBResult.$metadata.httpStatusCode || 500 };
    } catch (error) {
      this.handleDynamoDBError(error.name);
    }
  }

  async deleteTask(username: string, task_id: string) {
    const dynamoDBInput = {
      TableName: this.tableName,
      Key: {
        username: { S: username },
        todo_id: { S: task_id },
      },
    };
    const dynamoDBCommand = new DeleteItemCommand(dynamoDBInput);

    try {
      const dynamoDBResult = await this.dynamoDBClient.send(dynamoDBCommand);
      if (dynamoDBResult.$metadata.httpStatusCode === 200)
        return { httpStatusCode: 200 };
      return { httpStatusCode: dynamoDBResult.$metadata.httpStatusCode };
    } catch (error) {
      this.handleDynamoDBError(error.name);
    }
  }

  async uploadImage(filename: string) {
    const s3Command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: filename,
    });
    const presignedURL = await getSignedUrl(this.s3Client, s3Command, {
      expiresIn: 60,
    });
    return presignedURL;
  }

  private handleDynamoDBError(error: any) {
    const errorResponseMap = {
      ConditionalCheckFailedException: {
        httpStatusCode: 400,
        message:
          'A condition specified in the operation could not be evaluated.',
      },
      InternalServerError: {
        httpStatusCode: 500,
        message: 'An error occurred on the server side.',
      },
      InvalidEndpointException: {
        httpStatusCode: 400,
        message: 'Wrong/Invalid Endpoint.',
      },
      ItemCollectionSizeLimitExceededException: {
        httpStatusCode: 413,
        message: 'An item collection is too large.',
      },
      ProvisionedThroughputExceededException: {
        httpStatusCode: 429,
        message: 'Your request rate is too high.',
      },
      RequestLimitExceeded: {
        httpStatusCode: 429,
        message:
          'Throughput exceeds the current throughput quota for your account.',
      },
      ResourceNotFoundException: {
        httpStatusCode: 404,
        message: 'The operation tried to access a nonexistent table or index.',
      },
      TransactionConflictException: {
        httpStatusCode: 425,
        message:
          'Operation was rejected because there is an ongoing transaction for the item.',
      },
    };

    const defaultResponse = {
      httpStatusCode: 418,
      message: 'The server refuses the attempt to brew coffee with a teapot.',
    };
    return errorResponseMap[error.name] || defaultResponse;
  }
}
