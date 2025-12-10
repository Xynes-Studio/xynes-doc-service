export class DomainError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, code: string = 'DOMAIN_ERROR', statusCode: number = 400) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
