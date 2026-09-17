export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errorType: string = 'internal_error'
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
