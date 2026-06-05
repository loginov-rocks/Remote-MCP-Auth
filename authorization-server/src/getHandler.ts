import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export function getHandler(): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: 'OK',
  };
}
