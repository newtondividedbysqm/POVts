import chalk from 'chalk';
import { inspect } from 'node:util';
import { performance } from 'node:perf_hooks';

type TestFn = (name: string, fn: () => void) => void;
type MatcherName = 'toBe' | 'toBeTrue' | 'toBeFalse' | 'toBeNull' | 'toBeUndefined' | 'toEqual';

class AssertionError extends Error {
  matcher: MatcherName;
  received: unknown;
  expected?: unknown;
  assertionMessage?: string;

  constructor(options: {
    matcher: MatcherName;
    received: unknown;
    expected?: unknown;
    assertionMessage?: string;
    details: string;
  }) {
    super(options.details);
    this.name = 'AssertionError';
    this.matcher = options.matcher;
    this.received = options.received;
    this.expected = options.expected;
    this.assertionMessage = options.assertionMessage;
  }
}
// MARK: Test Runner State
const debugMode = process.argv.includes('-debug') || process.argv.includes('-d');
const testStats = {
  total: 0,
  passed: 0,
  failed: 0,
};
const assertionStats = {
  total: 0,
  passed: 0,
  failed: 0,
};
/** Stack to keep track of nested describe blocks for proper indentation in reporting */
const suiteStack: string[] = [];
const suiteStartTime = performance.now();
/** Tracks the assertion errors for the currently running test */
let currentTestSuiteAssertionErrors: AssertionError[] | null = null;
/** Tracks whether the summary has been printed already */
let summaryPrinted = false;

// MARK: Assertion Helpers
function recordAssertionFailure(error: AssertionError) {
  assertionStats.failed += 1;

  if (!currentTestSuiteAssertionErrors) {
    throw error;
  }

  currentTestSuiteAssertionErrors.push(error);
}

function formatValue(value: unknown) {
  return inspect(value, {
    depth: 8,
    colors: false,
    breakLength: 80,
    compact: false,
    sorted: true,
  });
}

function createAssertionError(
  matcher: MatcherName,
  received: unknown,
  expected: unknown,
  assertionMessage?: string,
) {
  const details = matcher === 'toEqual'
    ? `Expected values to be deeply equal.`
    : `Expected assertion ${matcher} to pass.`;

  return new AssertionError({
    matcher,
    received,
    expected,
    assertionMessage,
    details,
  });
}

// MARK: Summary & Reporting
function printSummary() {
  if (summaryPrinted) return;
  summaryPrinted = true;
  const elapsedMs = performance.now() - suiteStartTime;
  const elapsedStr = elapsedMs < 1000
    ? `${Math.round(elapsedMs)}ms`
    : `${(elapsedMs / 1000).toFixed(3)}s`;

  const testPassedColor = testStats.failed === 0 ? chalk.greenBright.bold : chalk.greenBright;
  const assertionPassedColor = assertionStats.failed === 0 ? chalk.greenBright.bold : chalk.greenBright;
  console.log('');
  console.log('');
  console.log('');
  console.log(`${chalk.white.bold('Test Suites:')} ${testStats.failed > 0 ? chalk.redBright.bold(`${testStats.failed} failed`) : ''}, ${testStats.passed > 0 ? testPassedColor(`${testStats.passed} passed`) : ''}, ${testStats.total} total`);
  console.log(`${chalk.white.bold('Tests:')}       ${assertionStats.failed > 0 ? chalk.redBright.bold(`${assertionStats.failed} failed`) : ''}, ${assertionStats.passed > 0 ? assertionPassedColor(`${assertionStats.passed} passed`) : ''}, ${assertionStats.total} total`);
  console.log(`${chalk.white.bold('Time:')}        ${chalk.white(elapsedStr)}`);
  console.log(`${chalk.white('Ran all tests.')}`);
}
process.once('beforeExit', printSummary);


function reportAssertionError(error: AssertionError, index?: number) {
  const indent = '  '.repeat(suiteStack.length + 1);
  if (debugMode) {
    if (typeof index === 'number') {
      console.error(chalk.red(`${indent}Failure ${index + 1}:`));
    }
    console.error(chalk.red(`${indent}Matcher: ${error.matcher}`));
  }

  if (error.assertionMessage) {
    console.error(chalk.yellow(`${indent}Assertion: ${error.assertionMessage}`));
  }

  if (error.expected !== undefined) {
    console.error(`${chalk.redBright(`${indent}  Expected: `)}${chalk.yellow(formatValue(error.expected))}`);
  }

  console.error(`${chalk.redBright(`${indent}  Received: `)}${chalk.redBright(formatValue(error.received))}`);
}

function reportUnknownError(error: unknown) {
  if (error instanceof Error) {
    const details = error.stack ?? `${error.name}: ${error.message}`;
    console.error(chalk.red(details.replace(/^/gm, '    ')));
    return;
  }

  console.error(chalk.red(formatValue(error).replace(/^/gm, '    ')));
}


// MARK: Test Suites
export const describe: TestFn = (name, fn) => {
  suiteStack.push(name);
  const indent = '  '.repeat(Math.max(0, suiteStack.length - 1));
  console.log(chalk.cyan.bold(`${indent}${name}`));

  try {
    fn();
  } finally {
    suiteStack.pop();
  }
};

export const test: TestFn = (name, fn) => {
  testStats.total += 1;
  const indent = '  '.repeat(suiteStack.length);
  currentTestSuiteAssertionErrors = [];
  let runtimeError: unknown = null;
  const testStart = performance.now();

  try {
    fn();
  } catch (error) {
    runtimeError = error;
  }

  const testElapsedMs = performance.now() - testStart;
  const testElapsedStr = testElapsedMs < 1000
    ? `${Math.round(testElapsedMs)}ms`
    : `${(testElapsedMs / 1000).toFixed(3)}s`;

  const assertionErrors = currentTestSuiteAssertionErrors;
  currentTestSuiteAssertionErrors = null;

  if (runtimeError || (assertionErrors && assertionErrors.length > 0)) {
    testStats.failed += 1;
    process.exitCode = 1;
    console.error(chalk.red.bold(`${indent}✗ ${name}`) + chalk.dim(` (${testElapsedStr})`));

    if (assertionErrors && assertionErrors.length > 0) {
      assertionErrors.forEach((assertionError, i) => {
        reportAssertionError(assertionError, i);
      });
    }

    if (runtimeError) {
      if (runtimeError instanceof AssertionError) {
        reportAssertionError(runtimeError);
      } else {
        reportUnknownError(runtimeError);
      }
    }
    return;
  }

  testStats.passed += 1;
  console.log(chalk.green(`${indent}✓ ${name}`) + chalk.dim(` (${testElapsedStr})`));
};

// MARK: Assertions
function toBe(received: any, expected: any, assertionMessage?: string) {
  assertionStats.total += 1;
  if (received !== expected) {
    recordAssertionFailure(createAssertionError('toBe', received, expected, assertionMessage));
    return;
  }
  assertionStats.passed += 1;
}

function toBeTrue(received: any, assertionMessage?: string) {
  assertionStats.total += 1;
  if (received !== true) {
    recordAssertionFailure(createAssertionError('toBeTrue', received, true, assertionMessage));
    return;
  }
  assertionStats.passed += 1;
}

function toBeFalse(received: any, assertionMessage?: string) {
  assertionStats.total += 1;
  if (received !== false) {
    recordAssertionFailure(createAssertionError('toBeFalse', received, false, assertionMessage));
    return;
  }
  assertionStats.passed += 1;
}

function toBeNull(received: any, assertionMessage?: string) {
  assertionStats.total += 1;
  if (received !== null) {
    recordAssertionFailure(createAssertionError('toBeNull', received, null, assertionMessage));
    return;
  }
  assertionStats.passed += 1;
}

function toBeUndefined(received: any, assertionMessage?: string) {
  assertionStats.total += 1;
  if (received !== undefined) {
    recordAssertionFailure(createAssertionError('toBeUndefined', received, undefined, assertionMessage));
    return;
  }
  assertionStats.passed += 1;
}

function toEqual(received: any, expected: any, assertionMessage?: string) {
  assertionStats.total += 1;
  const receivedJson = JSON.stringify(received);
  const expectedJson = JSON.stringify(expected);

  if (receivedJson !== expectedJson) {
    recordAssertionFailure(createAssertionError('toEqual', received, expected, assertionMessage));
    return;
  }
  assertionStats.passed += 1;
}

export function expect(received: any, msg?: string) {
  return {
    toBe: (expected: any) => toBe(received, expected, msg),
    toBeTrue: () => toBeTrue(received, msg),
    toBeFalse: () => toBeFalse(received, msg),
    toBeNull: () => toBeNull(received, msg),
    toBeUndefined: () => toBeUndefined(received, msg),
    toEqual: (expected: any) => toEqual(received, expected, msg),
  };
}

module.exports = {
  describe,
  test,
  expect,
};