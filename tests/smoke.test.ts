describe('Smoke Test', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});