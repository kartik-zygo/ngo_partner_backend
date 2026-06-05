import { ok, err } from '@shared/domain/result';

describe('Result monad', () => {
  it('ok wraps data correctly', () => {
    const result = ok({ id: '123' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe('123');
  });

  it('err wraps error correctly', () => {
    const result = err('Something went wrong');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('Something went wrong');
  });
});
