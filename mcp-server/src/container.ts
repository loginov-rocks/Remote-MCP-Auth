import {
  ACCESS_TOKEN_SECRET, AUTHORIZATION_SERVER_BASE_URL, MCP_SERVER_BASE_URL, PROTECTED_RESOURCE_METADATA_ROUTE, SSE_MESSAGES_ROUTE,
} from './constants';

import { McpSseController } from './controllers/McpSseController';
import { McpStatelessController } from './controllers/McpStatelessController';
import { McpStreamableController } from './controllers/McpStreamableController';
import { OAuthController } from './controllers/OAuthController';

import { McpServerFactory } from './mcp/McpServerFactory';

import { McpAuthMiddleware } from './middlewares/McpAuthMiddleware';

import { ArmyService } from './services/ArmyService';
import { StudentService } from './services/StudentService';
import { TokenService } from './services/TokenService';

const armyService = new ArmyService();

const studentService = new StudentService();

const tokenService = new TokenService({
  accessTokenSecret: ACCESS_TOKEN_SECRET,
  authorizationServerBaseUrl: AUTHORIZATION_SERVER_BASE_URL,
  mcpServerBaseUrl: MCP_SERVER_BASE_URL,
});

const mcpServerFactory = new McpServerFactory({
  armyService,
  studentService,
});

export const mcpAuthMiddleware = new McpAuthMiddleware({
  mcpServerBaseUrl: MCP_SERVER_BASE_URL,
  protectedResourceMetadataRoute: PROTECTED_RESOURCE_METADATA_ROUTE,
  studentService,
  tokenService,
});

export const mcpSseController = new McpSseController({
  mcpServerFactory,
  sseMessagesRoute: SSE_MESSAGES_ROUTE,
})

export const mcpStatelessController = new McpStatelessController({
  mcpServerFactory,
});

export const mcpStreamableController = new McpStreamableController({
  mcpServerFactory,
});

export const oauthController = new OAuthController({
  authorizationServerBaseUrl: AUTHORIZATION_SERVER_BASE_URL,
  mcpServerBaseUrl: MCP_SERVER_BASE_URL,
});
