import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'crypto';

import { AUTH_CODES_TABLE_NAME, AUTH_CODES_TTL } from './constants.mjs';

const dynamoDbClient = new DynamoDBClient();
const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient);

const generateCode = () => randomBytes(32).toString('hex');

export const createCode = async (studentId, codeChallenge, scope) => {
  const code = generateCode();

  const now = Math.floor(Date.now() / 1000);
  const expiration = now + AUTH_CODES_TTL;

  const item = {
    code,
    codeChallenge,
    expiration,
    studentId,
    scope,
  };

  const putCommand = new PutCommand({
    Item: item,
    TableName: AUTH_CODES_TABLE_NAME,
  });

  await dynamoDbDocumentClient.send(putCommand);

  return code;
};

export const deleteCode = (code) => {
  const deleteCommand = new DeleteCommand({
    Key: { code },
    TableName: AUTH_CODES_TABLE_NAME,
  });

  return dynamoDbDocumentClient.send(deleteCommand);
}

export const findCode = async (code) => {
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
