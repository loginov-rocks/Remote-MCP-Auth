import { findClient } from './clients.mjs';

const POST_AUTHORIZE_ROUTE = '/oauth/authorize';

function esc(str) {
  if (typeof str !== 'string') {
    return '';
  }

  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export async function getAuthorizeHandler(event) {
  const params = event.queryStringParameters;
  console.log('getAuthorizeParams', JSON.stringify(params));

  const client = await findClient(params.client_id);

  // Error example: the client_id matches no registered client, so per the specification the error is invalid_client.
  if (!client) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'invalid_client' }),
    };
  }

  // Error example: the client is valid but the redirect_uri isn't one it registered - the client is fine, a request
  // parameter is wrong, so per the specification the error is invalid_request.
  if (!client.redirectUris.includes(params.redirect_uri)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'invalid_request' }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Authorize ${esc(client.name)} - Battle School Computer</title>
  </head>
  <body>
    <h1>Authorize <strong>${esc(client.name)}</strong></h1>
    <p><strong>${esc(client.name)}</strong> wants to access your <strong>Battle School Computer</strong> account.</p>
    <form action="${POST_AUTHORIZE_ROUTE}" method="post">
      <input name="student_id" placeholder="Student ID" required>
      <input type="hidden" name="client_id" value="${esc(params.client_id)}">
      <input type="hidden" name="code_challenge" value="${esc(params.code_challenge)}">
      <input type="hidden" name="code_challenge_method" value="${esc(params.code_challenge_method)}">
      <input type="hidden" name="redirect_uri" value="${esc(params.redirect_uri)}">
      <input type="hidden" name="response_type" value="${esc(params.response_type)}">
      <input type="hidden" name="resource" value="${esc(params.resource)}">
      <input type="hidden" name="scope" value="${esc(params.scope)}">
      <input type="hidden" name="state" value="${esc(params.state)}">
      <button type="submit" name="decision" value="deny">Deny</button>
      <button type="submit" name="decision" value="allow">Allow</button>
    </form>
  </body>
</html>
`,
  };
}
