import { findClient } from './clients.mjs';

function esc(str) {
  if (typeof str !== 'string') {
    return '';
  }

  return str.replace(/[&<>"']/g, c => ({
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

  let client;
  try {
    client = await findClient(params.client_id);
  } catch (error) {
    console.error(error);
    return { statusCode: 500 };
  }

  if (!client) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'invalid_client' }),
    };
  }

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
    <form action="/oauth/authorize" method="post">
      <input name="student_id" placeholder="Student ID">
      <input type="hidden" name="client_id" value="${esc(params.client_id)}">
      <input type="hidden" name="code_challenge" value="${esc(params.code_challenge)}">
      <input type="hidden" name="code_challenge_method" value="${esc(params.code_challenge_method)}">
      <input type="hidden" name="redirect_uri" value="${esc(params.redirect_uri)}">
      <input type="hidden" name="response_type" value="${esc(params.response_type)}">
      <input type="hidden" name="scope" value="${esc(params.scope)}">
      <input type="hidden" name="state" value="${esc(params.state)}">
      <input type="hidden" name="resource" value="${esc(params.resource)}">
      <button type="submit" name="decision" value="deny">Deny</button>
      <button type="submit" name="decision" value="allow">Allow</button>
    </form>
  </body>
</html>
`,
  };
};
