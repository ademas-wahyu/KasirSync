export type AppErrorStatus = 400 | 401 | 403 | 404 | 418 | 409 | 422 | 429 | 500;

export class AppError extends Error {
  constructor(
    public readonly status: AppErrorStatus,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);

    this.name = 'AppError';
  }
}
