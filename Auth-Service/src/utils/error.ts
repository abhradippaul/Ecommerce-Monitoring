export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errorType: string
  ) {
    super(message);
  }
}
