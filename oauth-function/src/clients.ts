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
  issuedAt?: number;
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

async function findRegisteredClient(id: string): Promise<Client | null> {
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

async function fetchClientIdMetadataDocument(url: string): Promise<Client | null> {
  // Minimal SSRF guard: only fetch https URLs as metadata docs to block http-only internal targets.
  if (URL.parse(url)?.protocol !== 'https:') {
    console.warn(`Client ID metadata document URL "${url}" does not use the HTTPS protocol`);
    return null;
  }

  console.log(`Fetching client ID metadata document from URL "${url}"`);

  let response;
  try {
    // Minimal SSRF guard: refuse redirects so an https URL can't bounce to an internal address.
    response = await fetch(url, {
      redirect: 'error',
    });
  } catch (error) {
    console.warn(`Unable to fetch client ID metadata document from URL "${url}"`, error);
    return null;
  }

  if (!response.ok) {
    console.warn(`Client ID metadata document at URL "${url}" responded with non-OK status ${response.status}`);
    return null;
  }

  let cimd;
  try {
    cimd = await response.json();
  } catch (error) {
    console.warn(`Unable to parse client ID metadata document from URL "${url}"`, error);
    return null;
  }

  if (!cimd.client_id || !cimd.client_name || !Array.isArray(cimd.redirect_uris)) {
    console.warn(`Client ID metadata document from URL "${url}" is missing required fields`, JSON.stringify(cimd));
    return null;
  }

  if (cimd.client_id !== url) {
    console.warn(`Client ID "${cimd.client_id}" in the metadata document does not match the URL "${url}"`);
    return null;
  }

  console.log(`Successfully fetched client ID metadata document from URL "${url}"`, JSON.stringify(cimd));

  return {
    id: cimd.client_id,
    name: cimd.client_name,
    redirectUris: cimd.redirect_uris,
  };
}

export function findClient(clientId: string): Promise<Client | null> {
  if (URL.canParse(clientId)) {
    return fetchClientIdMetadataDocument(clientId);
  }

  return findRegisteredClient(clientId);
}
