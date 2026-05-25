import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { z } from 'zod';

import type { ArmyService } from '../services/ArmyService';
import type { StudentService } from '../services/StudentService';

interface Options {
  armyService: ArmyService;
  studentService: StudentService;
}

export class McpServerFactory {
  private readonly armyService: ArmyService;
  private readonly studentService: StudentService;

  constructor({ armyService, studentService }: Options) {
    this.armyService = armyService;
    this.studentService = studentService;
  }

  public create(): McpServer {
    const server = new McpServer({
      name: 'Battle-School-Computer',
      version: '1.0.0',
    });

    this.registerTools(server);

    return server;
  }

  private registerTools(server: McpServer): void {
    server.registerTool(
      'get-my-army',
      {
        description: 'Get information about your army including soldiers and battle record',
      },
      ({ authInfo }) => {
        if (!authInfo?.extra?.studentId) {
          return this.respondWithError('Unauthorized');
        }

        const myArmy = this.armyService.getMyArmy(authInfo.extra.studentId as string);

        return this.respondWithJson(myArmy);
      },
    );

    server.registerTool(
      'get-opponent-army',
      {
        description: 'Get information about an opponent army',
        inputSchema: {
          armyName: z.string().describe('Name of the opponent army to research'),
        },
      },
      ({ armyName }, { authInfo }) => {
        if (!authInfo) {
          return this.respondWithError('Unauthorized');
        }

        const opponentArmy = this.armyService.getOpponentArmy(armyName);

        return this.respondWithJson(opponentArmy);
      },
    );

    server.registerTool(
      'get-student-info',
      {
        description: 'Get detailed information about a student',
        inputSchema: {
          studentName: z.string().describe('Name of the student to look up'),
        },
      },
      ({ studentName }, { authInfo }) => {
        if (!authInfo) {
          return this.respondWithError('Unauthorized');
        }

        const studentInfo = this.studentService.getStudentInfo(studentName);

        return this.respondWithJson(studentInfo);
      },
    );
  }

  private respondWithError(text: string): CallToolResult {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  private respondWithJson(data: unknown): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data),
        },
      ],
    };
  }
}
