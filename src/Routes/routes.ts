import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import {
  generateToken,
  sanitizeInput,
  parseBasicAuthHeader,
  parseBearerAuthHeader,
  getUserInfo,
} from '../utils/utils';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import morgan from 'morgan';
import { marshall } from '@aws-sdk/util-dynamodb';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

dotenv.config();
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Globals.
const logger = morgan('combined');

async function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.headers.authorization)
    return res.status(400).send('Invalid authorization header.');
  const token = parseBearerAuthHeader(req.headers.authorization);
  // If token is invalid then return status 400.
  if (!token) return res.status(400).send('Invalid authorization info.');

  const command = new QueryCommand({
    TableName: process.env.USER_TABLE_NAME,
    IndexName: 'session_key-index',
    KeyConditionExpression: 'session_key = :key',
    ExpressionAttributeValues: {
      ':key': { S: token },
    },
  });

  try {
    const results = await dbClient.send(command);
    if (!results.Count || results.Items === undefined)
      // Invalid authentication.
      return res.status(404).send('Invalid authentication info.');
    for (const item of results.Items) {
      if (item.session_key && item.session_key.S === token) {
        return next(); // Valid authentication.
      }
    }
    return res.status(403).send('Unauthorized authentication.');
  } catch (err) {
    return res.status(500).send('Authentication server error.');
  }
}

async function login(req: Request, res: Response, next: NextFunction) {
  // Receive auth info.
  const userInfo = getUserInfo(
    parseBasicAuthHeader(req.headers.authorization || '')
  );
  // console.log(userInfo);

  const username = userInfo?.username;
  const password = userInfo?.password;

  if (!username || !password)
    return res.status(403).send('Invalid login parameters.');

  // Check if user exists or not.
  const command = new QueryCommand({
    TableName: process.env.USER_TABLE_NAME,
    KeyConditionExpression: 'username = :username',
    ExpressionAttributeValues: {
      ':username': { S: username },
    },
  });

  // Store results in results variable.
  let results: QueryCommandOutput;
  try {
    results = await dbClient.send(command);
  } catch (err) {
    // If error occurs in the query, send the 500 error.
    logger(req, res, function (error) {
      if (error) return error.message;
    });
    return res.status(500).send('DynamoDB error');
  }

  // If user and results not exists, return 404.
  if (!results.Count || results.Items === undefined)
    return res.status(404).send('Invalid login info.');

  // If user is exist, first check the password.
  for (const item of results.Items) {
    if (item.password && item.password.S === password) {
      // Then generate session token for user.
      const token = generateToken();

      // Then write to the db and send the token to user.

      const params = {
        TableName: process.env.USER_TABLE_NAME,
        Key: marshall({
          username: username,
        }),
        UpdateExpression: 'set session_key = :session_key',
        ExpressionAttributeValues: marshall({
          ':session_key': token,
        }),
        ReturnValues: ReturnValue.UPDATED_NEW,
      };

      try {
        const updatedToken: UpdateItemCommandOutput = await dbClient.send(
          new UpdateItemCommand(params)
        );
        if (updatedToken.$metadata.httpStatusCode === 200) {
          //If user exists;
          return res.status(200).send(token);
        } else {
          //Then it must be server issue.;
          return res.status(500).send('Error occurs while login in.');
        }
      } catch (error) {
        // If something happens in this stage, then it's a server problem.
        // logger(req, res, function (error) {
        //   if (error) return error.message;
        // });
        return res.status(500).send('Login server error.');
      }
    }
  }
  // If passwords not match.
  return res.status(403).send('Invalid login.');
}

async function register(req: Request, res: Response) {
  // Check username and password not empty or contains invalid(:) characters.
  // According to HTTP Basic Auth, user-id not contains colon(:) char.

  if (
    req.body.username === '' ||
    req.body.password === '' ||
    typeof req.body.username !== 'string' ||
    typeof req.body.password !== 'string' ||
    req.body.username.includes(':')
  )
    return res.sendStatus(400);

  //Put item from DynamoDb.
  try {
    // console.log(result.$metadata.httpStatusCode);
    if (result.$metadata.httpStatusCode === 200) {
      //If successful;
      return res.sendStatus(201);
    } else if (result.$metadata.httpStatusCode === 204) {
      //If something happens and user not created;
      return res.sendStatus(405);
    } else {
      //Then it must be server issue.;
      return res.sendStatus(500);
    }
  } catch (error) {
    if (
      error &&
      (error as PutItemCommandOutput).$metadata &&
      (error as PutItemCommandOutput).$metadata.httpStatusCode
    )
      return res.status(400).send('User Exists.');
    // If error occurs, then return the error.
    return res.sendStatus(500);
  }
}

async function deleteUserFromDB(req: Request, res: Response) {
  //Delete item from DynamoDb.
  try {
    if (!req.body.key || !req.body.username) return res.sendStatus(404);
    if (req.body.key !== 'delete_user') return res.sendStatus(403);
    const result = await dbClient.send(
      new DeleteItemCommand({
        TableName: process.env.USER_TABLE_NAME,
        Key: {
          username: { S: req.body.username },
        },
      })
    );
    if (result.$metadata.httpStatusCode === 200) {
      //If successful;
      return res.sendStatus(200);
    } else {
      //Then it must be server issue.;
      return res.sendStatus(500);
    }
  } catch (error) {
    // If error occurs, then return the 500 error.
    return res.sendStatus(500);
  }
}

async function getTasks(req: Request, res: Response) {
  const command = new QueryCommand({
    TableName: process.env.TODO_TABLE_NAME,
    IndexName: 'username-index',
    KeyConditionExpression: 'username = :username',
    ExpressionAttributeValues: {
      ':username': { S: req.params.user },
    },
  });

  let results: QueryCommandOutput;
  try {
    results = await dbClient.send(command);
    if (results.Items) {
      const parsedItems = results.Items.map((item) => {
        return {
          todo_id: item.todo_id.S,
          title: item.title.S,
          isDone: item.isDone.BOOL,
        };
      });
      return res.status(200).send(parsedItems);
    }

    return res.status(204).send('There are no tasks.');
  } catch (err) {
    // logger(req, res, function (error) {
    //   if (error) return error.message;
    // });

    // If error occurs in the query, send the 500 error.
    return res.sendStatus(500);
  }
}

async function addTask(req: Request, res: Response) {
  // Sanitized from XSS.
  const purifiedUsername = DOMPurify.sanitize(req.params.user);
  if (
    typeof req.body.isDone !== 'boolean' ||
    typeof req.body.title !== 'string' ||
    typeof req.body.todo_id !== 'string'
  )
    return res.status(400).send('Invalid parameters.');

  const purifiedTitle = DOMPurify.sanitize(req.body.title);

  const item = {
    todo_id: { S: req.body.todo_id },
    username: { S: purifiedUsername },
    title: { S: purifiedTitle },
    isDone: { BOOL: req.body.isDone },
  };

  const command = new PutItemCommand({
    TableName: process.env.TODO_TABLE_NAME,
    Item: item as Record<string, AttributeValue>,
  });

  const result = await dbClient.send(command);

  if (result.$metadata.httpStatusCode === 200) {
    //If successful;
    return res.sendStatus(201);
  } else if (result.$metadata.httpStatusCode === 204) {
    //If something happens and tasks not added;
    return res.sendStatus(400);
  } else {
    //Then it must be server issue.;
    return res.sendStatus(500);
  }
}

async function deleteTask(req: Request, res: Response) {
  const purifiedUsername = DOMPurify.sanitize(req.params.user);
  const purifiedTaskID = DOMPurify.sanitize(req.params.taskId);

  const command = new DeleteItemCommand({
    TableName: process.env.TODO_TABLE_NAME,
    Key: {
      username: { S: purifiedUsername },
      todo_id: { S: purifiedTaskID },
    },
  });

  try {
    const result = await dbClient.send(command);
    if (result.$metadata.httpStatusCode === 200) {
      //If successful;
      return res.sendStatus(200);
    } else if (result.$metadata.httpStatusCode === 204) {
      //If something happens and tasks not deleted;
      return res.sendStatus(400);
    } else {
      //Then it must be server issue.;
      return res.sendStatus(500);
    }
  } catch (error) {
    return res.sendStatus(500);
  }
}

async function markAsTaskDone(req: Request, res: Response) {
  const params = {
    TableName: process.env.TODO_TABLE_NAME!,
    Key: {
      username: { S: req.params.user },
      todo_id: { S: req.params.task },
    },
    UpdateExpression: 'set isDone = :newValue',
    ExpressionAttributeValues: {
      ':newValue': { BOOL: true },
    },
  };

  const command = new UpdateItemCommand(params);

  try {
    const result = await dbClient.send(command);
    if (result.$metadata.httpStatusCode === 200) {
      return res.sendStatus(200);
    } else {
      return res.sendStatus(400);
    }
  } catch (error) {
    return res.sendStatus(500);
  }
}

async function markAsTaskUndone(req: Request, res: Response) {
  const params = {
    TableName: process.env.TODO_TABLE_NAME!,
    Key: {
      username: { S: req.params.user },
      todo_id: { S: req.params.task },
    },
    UpdateExpression: 'set isDone = :newValue',
    ExpressionAttributeValues: {
      ':newValue': { BOOL: false },
    },
  };

  const command = new UpdateItemCommand(params);

  try {
    const result = await dbClient.send(command);
    if (result.$metadata.httpStatusCode === 200) {
      return res.sendStatus(200);
    } else {
      return res.sendStatus(400);
    }
  } catch (error) {
    return res.sendStatus(500);
  }
}

async function editTask(req: Request, res: Response) {
  const purifiedUsername = DOMPurify.sanitize(req.params.user);
  const purifiedTaskID = DOMPurify.sanitize(req.params.taskId);

  if (!req.body.title || typeof req.body.title !== 'string')
    return res.status(400).send('Invalid parameters.');
  const purifiedTitle = DOMPurify.sanitize(req.body.title);

  const params = {
    TableName: process.env.TODO_TABLE_NAME,
    Key: marshall({
      username: purifiedUsername,
      todo_id: purifiedTaskID,
    }),
    UpdateExpression: 'set title = :title',
    ExpressionAttributeValues: marshall({
      ':title': purifiedTitle,
    }),
    ReturnValues: ReturnValue.UPDATED_NEW,
  };

  try {
    const updatedItem: UpdateItemCommandOutput = await dbClient.send(
      new UpdateItemCommand(params)
    );
    if (updatedItem.$metadata.httpStatusCode === 200) {
      return res.status(200).send('Successfully updated!');
    } else {
      return res.sendStatus(400);
    }
  } catch (err) {
    return res.sendStatus(500);
  }
}

async function getImages(req: Request, res: Response) {
  if (
    process.env.REGION === undefined ||
    process.env.ACCESS_KEY_ID === undefined ||
    process.env.SECRET_ACCESS_KEY === undefined
  )
    return res.status(400).send('Invalid authorization.');

  const s3Client: S3Client = new S3Client({
    region: process.env.REGION!,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID!,
      secretAccessKey: process.env.SECRET_ACCESS_KEY!,
    },
  });

  let command: ListObjectsV2Command = new ListObjectsV2Command({
    Bucket: process.env.BUCKET_NAME,
    Prefix: req.params.user + '/',
  });

  const response: ListObjectsV2CommandOutput = await s3Client.send(command);

  if (response.Contents) {
    // console.log(response.Contents);
    if (!response.Contents) return res.status(204).send('Images not found.');
    const files: string[] = (response.Contents as any[]).map(
      (object: any) => object.Key
    );
    const promises = files.map(async (file) => {
      return getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: file,
        }),
        { expiresIn: 60 }
      );
    });

    Promise.all(promises)
      .then((results) => {
        const fileLinkArray: string[] = results;
        type KeyValuePair = { todo_id: string; value: any };
        const mapping: KeyValuePair[] = [];

        files.forEach((key, index) => {
          // console.log(key);
          const splittedKey = key.split('/')[1];
          mapping.push({ todo_id: splittedKey, value: fileLinkArray[index] });
        });
        res.status(200).send(mapping);
      })
      .catch((error) => {
        res.sendStatus(500);
      });
  } else {
    res.sendStatus(204);
  }
}

async function uploadImages(req: Request, res: Response) {
  if (req.body.fileName === undefined || typeof req.body.fileName !== 'string')
    return res.status(400).send('Invalid request body parameter.');
  const s3Client = new S3Client({
    region: process.env.REGION!,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID!,
      secretAccessKey: process.env.SECRET_ACCESS_KEY!,
    },
  });

  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: req.body.fileName,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });

  res.status(200).send(url);
}

async function deleteImages(req: Request, res: Response) {
  const s3Client = new S3Client({
    region: process.env.REGION!,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID!,
      secretAccessKey: process.env.SECRET_ACCESS_KEY!,
    },
  });

  try {
    // List objects within the folder
    const listParams: ListObjectsV2CommandInput = {
      Bucket: process.env.BUCKET_NAME,
      Prefix: req.params.user + '/' + req.params.taskId,
    };
    const data = await s3Client.send(new ListObjectsV2Command(listParams));
    if (data.KeyCount) {
      // Delete each object within the folder
      const deletePromises: any = data.Contents?.map(async (object) => {
        const deleteParams = {
          Bucket: process.env.BUCKET_NAME,
          Key: object.Key,
        };
        await s3Client.send(new DeleteObjectCommand(deleteParams));
        // console.log(`Object deleted successfully: ${object.Key}`);
      });

      // Wait for all delete operations to complete
      await Promise.all(deletePromises);

      // Delete the folder itself (prefix)
      const deleteFolderParams: DeleteObjectCommandInput = {
        Bucket: process.env.BUCKET_NAME,
        Key: req.body.assignee + '/' + req.params.taskId,
      };
      const result = await s3Client.send(
        new DeleteObjectCommand(deleteFolderParams)
      );
      return res.sendStatus(result.$metadata.httpStatusCode!);
    }
    // There is no image.
    return res.sendStatus(204);
  } catch (error) {
    // console.error('Error deleting folder:', error);
    return res.sendStatus(418);
  }
}

async function changePassword(req: Request, res: Response) {
  const command = new QueryCommand({
    TableName: process.env.USER_TABLE_NAME,
    KeyConditionExpression: 'username = :username',
    ExpressionAttributeValues: {
      ':username': { S: req.params.user },
    },
  });

  let results: QueryCommandOutput;
  try {
    results = await dbClient.send(command);
    if (results.Items) {
      const oldPassword = results.Items[0].password.S;
      const sanitizedOldPassword = req.body.oldPassword;
      const sanitizedNewPassword = req.body.newPassword;
      if (oldPassword === sanitizedOldPassword) {
        const params2 = {
          TableName: process.env.USER_TABLE_NAME!,
          Key: {
            username: { S: req.params.user },
          },
          UpdateExpression: 'set password = :newPassword',
          ExpressionAttributeValues: {
            ':newPassword': { S: sanitizedNewPassword },
          },
        };
        const command2 = new UpdateItemCommand(params2);

        results = await dbClient.send(command2);
        if (results.$metadata.httpStatusCode === 200)
          return res.status(200).send('Password Changed!');
        return res.status(400).send('Password Can Not Changed!');
      }
      return res.status(403).send('Passwords Does Not Match!');
    }

    return res.status(204).send('There is no user.');
  } catch (err) {
    // logger(req, res, function (error) {
    //   if (error) return error.message;
    // });

    // If error occurs in the query, send the 500 error.

    return res.status(500);
  }
}

export {
  login,
  isAuthenticated,
  register,
  getTasks,
  addTask,
  deleteTask,
  markAsTaskDone,
  markAsTaskUndone,
  editTask,
  getImages,
  uploadImages,
  deleteImages,
  deleteUserFromDB,
  changePassword,
};
