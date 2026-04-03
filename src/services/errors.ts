export class ServiceError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'DATABASE_ERROR',
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export function wrapDatabaseError<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  return fn().catch(error => {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError('DATABASE_ERROR', `${operation} failed`, error);
  });
}
