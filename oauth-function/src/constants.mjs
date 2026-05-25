export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
export const ACCESS_TOKEN_TTL = parseInt(process.env.ACCESS_TOKEN_TTL, 10); // in seconds

export const AUTH_CODES_TABLE_NAME = process.env.AUTH_CODES_TABLE_NAME;
export const AUTH_CODES_TTL = parseInt(process.env.AUTH_CODES_TTL, 10); // in seconds

export const AUTHORIZATION_SERVER_BASE_URL = process.env.AUTHORIZATION_SERVER_BASE_URL;

export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
export const REFRESH_TOKEN_TTL = parseInt(process.env.REFRESH_TOKEN_TTL, 10); // in seconds
