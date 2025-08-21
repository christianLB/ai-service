/**
 * Basic CLI tests
 */

import { AIServiceCLI } from '../src/index';

describe('AI Service CLI', () => {
  let cli: AIServiceCLI;

  beforeEach(() => {
    cli = new AIServiceCLI();
  });

  describe('Program Setup', () => {
    it('should create a valid program instance', () => {
      const program = cli.getProgram();
      
      expect(program).toBeDefined();
      expect(program.name()).toBe('ai');
      expect(program.description()).toContain('AI Service CLI');
      expect(program.version()).toBe('1.0.0');
    });

    it('should have required commands', () => {
      const program = cli.getProgram();
      const commands = program.commands.map(cmd => cmd.name());
      
      expect(commands).toContain('auth');
      expect(commands).toContain('database');
      expect(commands).toContain('test');
      expect(commands).toContain('config');
      expect(commands).toContain('health');
      expect(commands).toContain('version');
    });

    it('should have global options', () => {
      const program = cli.getProgram();
      const options = program.options.map(opt => opt.long);
      
      expect(options).toContain('--verbose');
      expect(options).toContain('--config');
      expect(options).toContain('--env');
      expect(options).toContain('--no-color');
    });
  });

  describe('Command Structure', () => {
    it('should have auth subcommands', () => {
      const program = cli.getProgram();
      const authCommand = program.commands.find(cmd => cmd.name() === 'auth');
      
      expect(authCommand).toBeValidCommand();
      
      const subCommands = authCommand?.commands.map(cmd => cmd.name()) || [];
      expect(subCommands).toContain('login');
      expect(subCommands).toContain('logout');
      expect(subCommands).toContain('token');
      expect(subCommands).toContain('whoami');
      expect(subCommands).toContain('refresh');
    });

    it('should have database subcommands', () => {
      const program = cli.getProgram();
      const dbCommand = program.commands.find(cmd => cmd.name() === 'database');
      
      expect(dbCommand).toBeValidCommand();
      
      const subCommands = dbCommand?.commands.map(cmd => cmd.name()) || [];
      expect(subCommands).toContain('migrate');
      expect(subCommands).toContain('rollback');
      expect(subCommands).toContain('status');
      expect(subCommands).toContain('studio');
      expect(subCommands).toContain('seed');
      expect(subCommands).toContain('backup');
    });

    it('should have test subcommands', () => {
      const program = cli.getProgram();
      const testCommand = program.commands.find(cmd => cmd.name() === 'test');
      
      expect(testCommand).toBeValidCommand();
      
      const subCommands = testCommand?.commands.map(cmd => cmd.name()) || [];
      expect(subCommands).toContain('unit');
      expect(subCommands).toContain('e2e');
      expect(subCommands).toContain('coverage');
      expect(subCommands).toContain('report');
      expect(subCommands).toContain('all');
      expect(subCommands).toContain('clean');
    });
  });

  describe('Command Aliases', () => {
    it('should have auth aliases', () => {
      const program = cli.getProgram();
      const authCommand = program.commands.find(cmd => cmd.name() === 'auth');
      
      expect(authCommand?.alias()).toBe('a');
    });

    it('should have database aliases', () => {
      const program = cli.getProgram();
      const dbCommand = program.commands.find(cmd => cmd.name() === 'database');
      
      expect(dbCommand?.alias()).toBe('db');
    });

    it('should have test aliases', () => {
      const program = cli.getProgram();
      const testCommand = program.commands.find(cmd => cmd.name() === 'test');
      
      expect(testCommand?.alias()).toBe('t');
    });
  });

  describe('Help Text', () => {
    it('should generate help text', () => {
      const program = cli.getProgram();
      const helpText = program.helpInformation();
      
      expect(helpText).toContain('AI Service CLI');
      expect(helpText).toContain('auth');
      expect(helpText).toContain('database');
      expect(helpText).toContain('test');
      expect(helpText).toContain('--verbose');
    });
  });
});