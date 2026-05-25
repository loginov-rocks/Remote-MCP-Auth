import { type JwtPayload, verify } from 'jsonwebtoken';

import type { StudentService } from './StudentService';

interface Options {
  accessTokenSecret: string;
  studentService: StudentService;
}

export class TokenService {
  private readonly accessTokenSecret: string;
  private readonly studentService: StudentService;

  constructor({ accessTokenSecret, studentService }: Options) {
    this.accessTokenSecret = accessTokenSecret;
    this.studentService = studentService;
  }

  public validateToken(token: string): { clientId: string; studentId: string; } | null {
    let decoded;
    try {
      decoded = verify(token, this.accessTokenSecret) as JwtPayload;
    } catch {
      return null;
    }

    if (!decoded.sub || !decoded.client_id) {
      return null;
    }

    const student = this.studentService.getStudent(decoded.sub);

    if (!student) {
      return null;
    }

    return {
      clientId: decoded.client_id,
      studentId: student.studentId,
    };
  }
}
