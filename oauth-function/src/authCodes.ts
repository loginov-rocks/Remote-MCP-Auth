import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'node:crypto';

import { AUTH_CODES_TABLE_NAME, AUTH_CODES_TTL } from './constants.ts';

const dynamoDbClient = new DynamoDBClient();
const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

interface CreateAuthCodeParams {
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  resource?: string;
  scope?: string;
  studentId: string;
}

interface AuthCode extends CreateAuthCodeParams {
  code: string;
  expiration: number;
}

export async function createAuthCode({ clientId, codeChallenge, redirectUri, resource, scope, studentId }: CreateAuthCodeParams): Promise<AuthCode> {
  const code = randomBytes(32).toString('hex');
  const expiration = Math.floor(Date.now() / 1000) + AUTH_CODES_TTL;
  const authCode: AuthCode = { code, expiration, clientId, codeChallenge, redirectUri, resource, scope, studentId };

  const putCommand = new PutCommand({
    Item: authCode,
    TableName: AUTH_CODES_TABLE_NAME,
  });

  await dynamoDbDocumentClient.send(putCommand);

  return authCode;
}

export async function deleteAuthCode(code: string): Promise<void> {
  const deleteCommand = new DeleteCommand({
    Key: { code },
    TableName: AUTH_CODES_TABLE_NAME,
  });

  await dynamoDbDocumentClient.send(deleteCommand);
}

export async function findAuthCode(code: string): Promise<AuthCode | null> {
  const getCommand = new GetCommand({
    Key: { code },
    TableName: AUTH_CODES_TABLE_NAME,
  });

  const getCommandOutput = await dynamoDbDocumentClient.send(getCommand);

  if (!getCommandOutput.Item) {
    return null;
  }

  return getCommandOutput.Item as AuthCode;
}
