import { createClient } from './clients.mjs';

export async function postRegisterHandler(event) {
  const params = JSON.parse(event.body);
  console.log('postRegisterParams', JSON.stringify(params));

  let client;
  try {
    client = await createClient({
      name: params.client_name,
      redirectUris: params.redirect_uris,
      scope: params.scope,
    });
  } catch (error) {
    console.error(error);
    return { statusCode: 500 };
  }

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: client.id, // server-issued identifier the client sends on every authorize and token call
      client_id_issued_at: client.issuedAt, // Unix timestamp the id was minted - optional per RFC 7591, useful for clients to track age/rotation
      redirect_uris: client.redirectUris, // echo back the URIs the client registered; only these are accepted as redirect targets during authorization
      token_endpoint_auth_method: 'none', // public client, no secret - mirrors what the auth server metadata advertises; PKCE protects the exchange
      grant_types: [ // confirm which grants this client may use - same two the server supports
        'authorization_code', // initial code-for-token exchange after user approval
        'refresh_token', // lets the client renew access without sending the user through login again
      ],
      response_types: ['code'], // authorization code flow only - the single flow MCP permits
      client_name: client.name, // echo back the human-readable name the client provided (shown to the user on the consent screen)
      scope: client.scope, // echo back the scopes registered for this client
    }),
  };
};
