import { describe, it, expect, beforeAll, vi } from 'vitest';
import { loadPolicies, parseTarget, getRoutingTarget } from '../src/core/policies';

// Mock environment variables
vi.mock('process', () => ({
  env: {
    AI_POLICIES_DIR: './src/policies',
    OPENAI_API_KEY: 'test-key',
    ANTHROPIC_API_KEY: 'test-key'
  }
}));

describe('Router and Policies', () => {
  describe('parseTarget', () => {
    it('should parse provider:model format', () => {
      const result = parseTarget('openai:gpt-4o-mini');
      expect(result).toEqual({
        provider: 'openai',
        model: 'gpt-4o-mini'
      });
    });

    it('should handle complex model names', () => {
      const result = parseTarget('anthropic:claude-3-5-haiku-20241022');
      expect(result).toEqual({
        provider: 'anthropic',
        model: 'claude-3-5-haiku-20241022'
      });
    });
  });

  describe('getRoutingTarget', () => {
    it('should return task-specific routing', async () => {
      const target = await getRoutingTarget('summarize.short');
      expect(target).toBeDefined();
      expect(target.target).toBeDefined();
    });

    it('should fall back to default routing', async () => {
      const target = await getRoutingTarget('unknown.task');
      expect(target).toBeDefined();
      expect(target.target).toBeDefined();
    });
  });
});