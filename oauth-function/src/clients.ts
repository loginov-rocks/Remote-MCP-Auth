import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

import { CLIENTS_TABLE_NAME } from './constants.ts';

const dynamoDbClient = new DynamoDBClient();
const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

interface CreateClientParams {
  name: string;
  redirectUris: string[];
  scope?: string;
}

interface Client extends CreateClientParams {
  id: string;
  issuedAt: number;
}

export async function createClient({ name, redirectUris, scope }: CreateClientParams): Promise<Client> {
  const id = randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000);
  const client: Client = { id, issuedAt, name, redirectUris, scope };

  const putCommand = new PutCommand({
    Item: client,
    TableName: CLIENTS_TABLE_NAME,
  });

  await dynamoDbDocumentClient.send(putCommand);

  return client;
}

export async function findClient(id: string): Promise<Client | null> {
  const getCommand = new GetCommand({
    Key: { id },
    TableName: CLIENTS_TABLE_NAME,
  });

  const getCommandOutput = await dynamoDbDocumentClient.send(getCommand);

  if (!getCommandOutput.Item) {
    return null;
  }

  return getCommandOutput.Item as Client;
}
