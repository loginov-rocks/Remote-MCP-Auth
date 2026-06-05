function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable "${name}"`);
  }

  return value;
}

export const ACCESS_TOKEN_SECRET = requireEnv('ACCESS_TOKEN_SECRET');
export const ACCESS_TOKEN_TTL = parseInt(requireEnv('ACCESS_TOKEN_TTL'), 10); // in seconds

export const AUTH_CODES_TABLE_NAME = requireEnv('AUTH_CODES_TABLE_NAME');
export const AUTH_CODES_TTL = parseInt(requireEnv('AUTH_CODES_TTL'), 10); // in seconds

export const CLIENTS_TABLE_NAME = requireEnv('CLIENTS_TABLE_NAME');

export const REFRESH_TOKEN_SECRET = requireEnv('REFRESH_TOKEN_SECRET');
export const REFRESH_TOKEN_TTL = parseInt(requireEnv('REFRESH_TOKEN_TTL'), 10); // in seconds
