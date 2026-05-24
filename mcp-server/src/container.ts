import { ACCESS_TOKEN_SECRET, MCP_BASE_URL, OAUTH_API_BASE_URL, PROTECTED_RESOURCE_METADATA_ROUTE } from './constants';

import { McpSseController } from './controllers/McpSseController';
import { McpStreamableController } from './controllers/McpStreamableController';
import { OAuthController } from './controllers/OAuthController';

import { McpServer } from './mcp/McpServer';

import { McpAuthMiddleware } from './middlewares/McpAuthMiddleware';

import { ArmyService } from './services/ArmyService';
import { StudentService } from './services/StudentService';
import { TokenService } from './services/TokenService';

const armyService = new ArmyService();

const studentService = new StudentService();

const tokenService = new TokenService({
  accessTokenSecret: ACCESS_TOKEN_SECRET,
  studentService,
});

const mcpServer = new McpServer({
  armyService,
  studentService,
});

export const mcpAuthMiddleware = new McpAuthMiddleware({
  mcpBaseUrl: MCP_BASE_URL,
  protectedResourceMetadataRoute: PROTECTED_RESOURCE_METADATA_ROUTE,
  tokenService,
});

export const mcpSseController = new McpSseController({
  mcpServer,
})

export const mcpStreamableController = new McpStreamableController({
  mcpServer,
});

export const oauthController = new OAuthController({
  mcpBaseUrl: MCP_BASE_URL,
  oauthApiBaseUrl: OAUTH_API_BASE_URL,
});
