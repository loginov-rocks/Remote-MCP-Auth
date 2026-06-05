import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export function getAuthorizationServerMetadataHandler(event: APIGatewayProxyEventV2): APIGatewayProxyStructuredResultV2 {
  const issuer = `https://${event.requestContext.domainName}`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      issuer, // base URL identifying this auth server; must match the host MCP clients discover
      authorization_endpoint: `${issuer}/oauth/authorize`, // front-channel: where the user is sent to log in and approve the MCP client
      token_endpoint: `${issuer}/oauth/token`, // back-channel: where the client exchanges the auth code (and later refresh token) for an access token
      registration_endpoint: `${issuer}/oauth/register`, // fallback: Dynamic Client Registration for clients that can't host a metadata doc
      response_types_supported: ['code'], // only `code` - triggers the authorization code flow, the single flow MCP permits
      grant_types_supported: [ // grant types the token endpoint accepts - just the two MCP relies on
        'authorization_code', // initial code-for-token exchange after user approval
        'refresh_token', // lets clients renew access without sending the user through login again
      ],
      token_endpoint_auth_methods_supported: ['none'], // MCP clients are public (no secret), so the token endpoint accepts them without client auth - PKCE is what protects the exchange
      code_challenge_methods_supported: ['S256'], // require PKCE with SHA-256; mandatory for public clients
      authorization_response_iss_parameter_supported: true, // RFC 9207: echoes `iss` in the auth response so clients confirm which server replied - guards against mix-up attacks
      // TODO
      // client_id_metadata_document_supported: true, // clients can use a URL as their client_id (points to their metadata doc) instead of pre-registering - the lightweight path for MCP
    }),
  };
}
