import { loginSchema, registerSchema, updateProfileSchema } from '@modules/auth/application/auth.schemas';

describe('Auth schemas', () => {
  describe('registerSchema', () => {
    it('accepts valid registration payload', () => {
      const r = registerSchema.safeParse({
        email: 'New.User@Test.com',
        password: 'Password@123',
        firstName: 'New',
        isOrganizationAccount: true,
        organizationName: 'Helping Hands',
      });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.email).toBe('new.user@test.com');
    });

    it('rejects short password', () => {
      const r = registerSchema.safeParse({ email: 'user@test.com', password: 'short' });
      expect(r.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      const r = loginSchema.safeParse({ email: 'User@Test.com', password: 'pass123' });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.email).toBe('user@test.com'); // lowercased
    });

    it('rejects missing password', () => {
      const r = loginSchema.safeParse({ email: 'user@test.com' });
      expect(r.success).toBe(false);
    });

    it('rejects invalid email', () => {
      const r = loginSchema.safeParse({ email: 'not-an-email', password: 'pass' });
      expect(r.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('accepts partial org update', () => {
      const r = updateProfileSchema.safeParse({
        isOrganizationAccount: true,
        organizationName: 'Green Trust',
        organizationType: 'NGO',
      });
      expect(r.success).toBe(true);
    });

    it('accepts empty object (all optional)', () => {
      const r = updateProfileSchema.safeParse({});
      expect(r.success).toBe(true);
    });
  });
});
