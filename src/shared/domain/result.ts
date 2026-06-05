/**
 * Result monad for domain / application layer.
 * Forces callers to handle both success and failure paths explicitly.
 */
export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

export const ok = <T>(data: T): Result<T, never> => ({ success: true, data });

export const err = <E = string>(error: E): Result<never, E> => ({ success: false, error });

export type AsyncResult<T, E = string> = Promise<Result<T, E>>;
