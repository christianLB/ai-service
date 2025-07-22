import { AIServiceBridge } from '../src/adapters/ai-service-bridge';

describe('AIServiceBridge', () => {
  let bridge: AIServiceBridge;

  beforeEach(() => {
    bridge = new AIServiceBridge({
      url: 'http://localhost:3001',
      timeout: 5000,
    });
  });

  describe('listTools', () => {
    it('should return fallback tools when MCP endpoint is not available', async () => {
      const tools = await bridge.listTools();
      
      expect(tools).toBeDefined();
      expect(tools.length).toBeGreaterThan(0);
      
      // Check for expected tools
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('get_financial_summary');
      expect(toolNames).toContain('get_system_health');
      expect(toolNames).toContain('search_documents');
    });

    it('should have proper tool structure', async () => {
      const tools = await bridge.listTools();
      const tool = tools[0];
      
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('category');
      expect(tool).toHaveProperty('requiresAuth');
      expect(tool).toHaveProperty('parameters');
    });
  });
});