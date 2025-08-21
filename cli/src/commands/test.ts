import { Command, Option } from 'commander';
import { execSync, spawn, SpawnOptions } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import type { TestCommandOptions, TestResult } from '../types';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

/**
 * Execute test command with proper output handling
 */
function executeTestCommand(command: string, args: string[], options: SpawnOptions = {}): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    let output = '';
    
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      ...options,
    });

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        output += data.toString();
        process.stdout.write(data);
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        output += data.toString();
        process.stderr.write(data);
      });
    }

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output,
      });
    });

    child.on('error', (error) => {
      output += error.message;
      resolve({
        success: false,
        output,
      });
    });
  });
}

/**
 * Unit test command - Run unit tests
 */
const unitCommand = new Command('unit')
  .description('Run unit tests')
  .addOption(new Option('--pattern <pattern>', 'Test pattern to match'))
  .addOption(new Option('--watch', 'Run tests in watch mode'))
  .addOption(new Option('--coverage', 'Generate coverage report'))
  .addOption(new Option('--timeout <ms>', 'Test timeout in milliseconds').argParser(parseInt))
  .addOption(new Option('--workers <num>', 'Number of test workers').argParser(parseInt))
  .action(async (options: TestCommandOptions) => {
    const spinner = ora('Running unit tests...').start();
    
    try {
      const args = ['test'];
      
      if (options.pattern) {
        args.push('--testNamePattern', options.pattern);
      }
      
      if (options.watch) {
        args.push('--watch');
      }
      
      if (options.coverage) {
        args.push('--coverage');
      }
      
      if (options.timeout) {
        args.push('--testTimeout', options.timeout.toString());
      }
      
      if (options.workers) {
        args.push('--maxWorkers', options.workers.toString());
      }
      
      // Add Jest-specific options for AI Service
      args.push('--detectOpenHandles', '--forceExit');
      
      if (options.watch) {
        spinner.succeed('Starting unit tests in watch mode...');
        logger.info('Press Ctrl+C to stop watching');
      } else {
        spinner.text = 'Running unit tests...';
      }
      
      const result = await executeTestCommand('npm', ['run', 'test', '--', ...args.slice(1)]);
      
      if (result.success) {
        spinner.succeed('Unit tests completed successfully');
      } else {
        spinner.fail('Some unit tests failed');
        process.exit(1);
      }
      
    } catch (error: any) {
      spinner.fail('Unit tests failed');
      logger.error(`Test error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * E2E test command - Run end-to-end tests
 */
const e2eCommand = new Command('e2e')
  .description('Run end-to-end tests')
  .addOption(new Option('--pattern <pattern>', 'Test pattern to match'))
  .addOption(new Option('--headed', 'Run tests in headed mode'))
  .addOption(new Option('--debug', 'Run tests in debug mode'))
  .addOption(new Option('--ui', 'Open Playwright UI'))
  .addOption(new Option('--browser <browser>', 'Browser to use (chromium, firefox, webkit)'))
  .addOption(new Option('--project <project>', 'Test project to run'))
  .action(async (options: TestCommandOptions & { headed?: boolean; debug?: boolean; ui?: boolean; browser?: string; project?: string }) => {
    const spinner = ora('Running E2E tests...').start();
    
    try {
      let command = 'npm';
      let args = ['run'];
      
      if (options.ui) {
        args.push('test:e2e:ui');
        spinner.succeed('Opening Playwright UI...');
      } else if (options.debug) {
        args.push('test:e2e:debug');
        spinner.succeed('Starting E2E tests in debug mode...');
      } else if (options.browser) {
        args.push(`test:e2e:${options.browser}`);
        spinner.text = `Running E2E tests on ${options.browser}...`;
      } else {
        args.push('test:e2e');
        
        if (options.headed) {
          args.push('--', '--headed');
        }
        
        if (options.pattern) {
          args.push('--', '--grep', options.pattern);
        }
        
        if (options.project) {
          args.push('--', '--project', options.project);
        }
        
        spinner.text = 'Running E2E tests...';
      }
      
      const result = await executeTestCommand(command, args);
      
      if (result.success) {
        spinner.succeed('E2E tests completed successfully');
      } else {
        spinner.fail('Some E2E tests failed');
        
        // Show test report link
        logger.info('Run `ai test report` to view detailed results');
        process.exit(1);
      }
      
    } catch (error: any) {
      spinner.fail('E2E tests failed');
      logger.error(`Test error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Coverage command - Generate test coverage report
 */
const coverageCommand = new Command('coverage')
  .description('Generate test coverage report')
  .addOption(new Option('--open', 'Open coverage report in browser'))
  .addOption(new Option('--format <format>', 'Coverage format (html, lcov, json, text)'))
  .action(async (options: { open?: boolean; format?: string }) => {
    const spinner = ora('Generating coverage report...').start();
    
    try {
      const args = ['run', 'test:coverage'];
      
      if (options.format) {
        args.push('--', '--coverageReporters', options.format);
      }
      
      const result = await executeTestCommand('npm', args);
      
      if (result.success) {
        spinner.succeed('Coverage report generated');
        
        const coveragePath = path.join(process.cwd(), 'coverage');
        
        if (await fs.pathExists(coveragePath)) {
          logger.success(`Coverage report saved to: ${coveragePath}`);
          
          if (options.open) {
            const htmlReport = path.join(coveragePath, 'lcov-report', 'index.html');
            
            if (await fs.pathExists(htmlReport)) {
              // Open HTML report in default browser
              const { default: open } = await import('open');
              await open(htmlReport);
              logger.info('Coverage report opened in browser');
            }
          }
        }
        
      } else {
        spinner.fail('Coverage report generation failed');
        process.exit(1);
      }
      
    } catch (error: any) {
      spinner.fail('Coverage report generation failed');
      logger.error(`Coverage error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Report command - Show test reports
 */
const reportCommand = new Command('report')
  .description('Show test reports')
  .addOption(new Option('--e2e', 'Show E2E test report'))
  .addOption(new Option('--coverage', 'Show coverage report'))
  .action(async (options: { e2e?: boolean; coverage?: boolean }) => {
    try {
      if (options.e2e) {
        // Open Playwright HTML report
        const reportPath = path.join(process.cwd(), 'playwright-report');
        
        if (await fs.pathExists(reportPath)) {
          const { default: open } = await import('open');
          await open(path.join(reportPath, 'index.html'));
          logger.success('E2E test report opened in browser');
        } else {
          logger.warn('No E2E test report found. Run `ai test e2e` first.');
        }
      } else if (options.coverage) {
        // Open coverage report
        const coveragePath = path.join(process.cwd(), 'coverage', 'lcov-report', 'index.html');
        
        if (await fs.pathExists(coveragePath)) {
          const { default: open } = await import('open');
          await open(coveragePath);
          logger.success('Coverage report opened in browser');
        } else {
          logger.warn('No coverage report found. Run `ai test coverage` first.');
        }
      } else {
        // Show available reports
        console.log(chalk.cyan('Available Test Reports:'));
        
        const e2eReportPath = path.join(process.cwd(), 'playwright-report');
        const coverageReportPath = path.join(process.cwd(), 'coverage');
        
        if (await fs.pathExists(e2eReportPath)) {
          console.log(chalk.green('  ✅ E2E Test Report'), `(ai test report --e2e)`);
        } else {
          console.log(chalk.gray('  ❌ E2E Test Report'), `(run: ai test e2e)`);
        }
        
        if (await fs.pathExists(coverageReportPath)) {
          console.log(chalk.green('  ✅ Coverage Report'), `(ai test report --coverage)`);
        } else {
          console.log(chalk.gray('  ❌ Coverage Report'), `(run: ai test coverage)`);
        }
        
        console.log('\nUse --e2e or --coverage flags to open specific reports');
      }
      
    } catch (error: any) {
      logger.error(`Report error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * All command - Run all tests
 */
const allCommand = new Command('all')
  .description('Run all tests (unit + E2E + coverage)')
  .addOption(new Option('--skip-unit', 'Skip unit tests'))
  .addOption(new Option('--skip-e2e', 'Skip E2E tests'))
  .addOption(new Option('--skip-coverage', 'Skip coverage report'))
  .action(async (options: { skipUnit?: boolean; skipE2e?: boolean; skipCoverage?: boolean }) => {
    const spinner = ora('Running complete test suite...').start();
    
    try {
      const results: { name: string; success: boolean }[] = [];
      
      // Run unit tests
      if (!options.skipUnit) {
        spinner.text = 'Running unit tests...';
        const unitResult = await executeTestCommand('npm', ['run', 'test', '--', '--passWithNoTests']);
        results.push({ name: 'Unit Tests', success: unitResult.success });
      }
      
      // Run E2E tests
      if (!options.skipE2e) {
        spinner.text = 'Running E2E tests...';
        const e2eResult = await executeTestCommand('npm', ['run', 'test:e2e']);
        results.push({ name: 'E2E Tests', success: e2eResult.success });
      }
      
      // Generate coverage
      if (!options.skipCoverage) {
        spinner.text = 'Generating coverage report...';
        const coverageResult = await executeTestCommand('npm', ['run', 'test:coverage']);
        results.push({ name: 'Coverage Report', success: coverageResult.success });
      }
      
      // Show results summary
      spinner.succeed('Test suite completed');
      
      console.log(chalk.cyan('\nTest Results Summary:'));
      results.forEach(result => {
        const status = result.success ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
        console.log(`  ${status} ${result.name}`);
      });
      
      const allPassed = results.every(r => r.success);
      
      if (allPassed) {
        logger.success('All tests passed!');
      } else {
        logger.error('Some tests failed');
        process.exit(1);
      }
      
    } catch (error: any) {
      spinner.fail('Test suite failed');
      logger.error(`Test error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Clean command - Clean test artifacts
 */
const cleanCommand = new Command('clean')
  .description('Clean test artifacts and reports')
  .addOption(new Option('--coverage', 'Clean coverage reports only'))
  .addOption(new Option('--e2e', 'Clean E2E reports only'))
  .action(async (options: { coverage?: boolean; e2e?: boolean }) => {
    const spinner = ora('Cleaning test artifacts...').start();
    
    try {
      const cleanPaths: string[] = [];
      
      if (options.coverage || (!options.coverage && !options.e2e)) {
        cleanPaths.push(path.join(process.cwd(), 'coverage'));
      }
      
      if (options.e2e || (!options.coverage && !options.e2e)) {
        cleanPaths.push(
          path.join(process.cwd(), 'playwright-report'),
          path.join(process.cwd(), 'test-results')
        );
      }
      
      for (const cleanPath of cleanPaths) {
        if (await fs.pathExists(cleanPath)) {
          await fs.remove(cleanPath);
        }
      }
      
      spinner.succeed('Test artifacts cleaned');
      
    } catch (error: any) {
      spinner.fail('Failed to clean test artifacts');
      logger.error(`Clean error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Main test command with subcommands
 */
export const testCommands = new Command('test')
  .description('Test management and execution')
  .addCommand(unitCommand)
  .addCommand(e2eCommand)
  .addCommand(coverageCommand)
  .addCommand(reportCommand)
  .addCommand(allCommand)
  .addCommand(cleanCommand);

// Command aliases
testCommands.alias('t');
// Individual subcommand aliases removed to avoid conflicts