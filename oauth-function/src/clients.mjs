import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

import { CLIENTS_TABLE_NAME } from './constants.mjs';

const dynamoDbClient = new DynamoDBClient();
const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient);

export async function createClient(redirectUris, name, scope) {
  const id = randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000);
  const item = { id, issuedAt, redirectUris, name, scope };

  const putCommand = new PutCommand({
    Item: item,
    TableName: CLIENTS_TABLE_NAME,
  });

  await dynamoDbDocumentClient.send(putCommand);

  return item;
};

export function deleteClient(id) {
  const deleteCommand = new DeleteCommand({
    Key: { id },
    TableName: CLIENTS_TABLE_NAME,
  });

  return dynamoDbDocumentClient.send(deleteCommand);
}

export async function findClient(id) {
  const getCommand = new GetCommand({
    Key: { id },
    TableName: CLIENTS_TABLE_NAME,
  });

  const getCommandOutput = await dynamoDbDocumentClient.send(getCommand);

  if (!getCommandOutput || !getCommandOutput.Item) {
    return null;
  }

  return getCommandOutput.Item;
};
