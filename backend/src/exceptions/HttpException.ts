import { HttpError } from 'routing-controllers';

export class HttpException extends HttpError {
  public status: number;
  public message: string;
  public violations?: string[];

  constructor(status: number, message: string, violations?: string[]) {
    super(status, message);
    this.status = status;
    this.message = message;
    this.violations = violations;
  }
}
