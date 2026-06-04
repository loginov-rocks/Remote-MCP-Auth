import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'node:crypto';

import { AUTH_CODES_TABLE_NAME, AUTH_CODES_TTL } from './constants.mjs';

const dynamoDbClient = new DynamoDBClient();
const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient);

export async function createCode({ clientId, codeChallenge, redirectUri, resource, scope, studentId }) {
  const code = randomBytes(32).toString('hex');
  const expiration = Math.floor(Date.now() / 1000) + AUTH_CODES_TTL;
  const item = { code, expiration, clientId, codeChallenge, redirectUri, resource, scope, studentId };

  const putCommand = new PutCommand({
    Item: item,
    TableName: AUTH_CODES_TABLE_NAME,
  });

  await dynamoDbDocumentClient.send(putCommand);

  return item;
};

export function deleteCode(code) {
  const deleteCommand = new DeleteCommand({
    Key: { code },
    TableName: AUTH_CODES_TABLE_NAME,
  });

  return dynamoDbDocumentClient.send(deleteCommand);
}

export async function findCode(code) {
  const getCommand = new GetCommand({
    Key: { code },
    TableName: AUTH_CODES_TABLE_NAME,
  });

  const getCommandOutput = await dynamoDbDocumentClient.send(getCommand);

  if (!getCommandOutput || !getCommandOutput.Item) {
    return null;
  }

  return getCommandOutput.Item;
};
