import path from 'path';
import fs from 'fs';
import { Reporter, ReporterArgs, TestResult, TestRunnerCoreConfig, TestSession } from '@web/test-runner-core';

import { createSourceMapFunction, SourceMapFunction } from '../utils/createSourceMapFunction';
import { createStackLocationRegExp } from '../utils/createStackLocationRegExp';

import XML from 'xml';

export interface JUnitReporterArgs {
  outputPath?: string;
}

type TestSessionMetadata =
  Omit<TestSession, 'tests'>;

type TestResultWithMetadata =
  TestResult & TestSessionMetadata;

type TestResultsWithMetadataByBrowserName = {
  [key: string]: TestResultWithMetadata[];
}

// A subset of invalid characters as defined in http://www.w3.org/TR/xml/#charsets that can occur in e.g. stacktraces
// lifted from https://github.com/michaelleeallen/mocha-junit-reporter/blob/master/index.js (licensed MIT)
// other portions of code adapted from same
// regex lifted from https://github.com/MylesBorins/xml-sanitizer/ (licensed MIT)
const INVALID_CHARACTERS_REGEX =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007f-\u0084\u0086-\u009f\uD800-\uDFFF\uFDD0-\uFDFF\uFFFF\uC008]/g;

const assignSessionPropertiesToTests =
  ({ tests, ...rest }: TestSession): TestResultWithMetadata[] =>
    tests.map(x => ({ ...x, ...rest }));

const toResultsWithMetadataByBrowserName =
  (acc: TestResultsWithMetadataByBrowserName, test: TestResultWithMetadata): TestResultsWithMetadataByBrowserName =>
    ({ ...acc, [test.browserName]: [...acc[test.browserName] ?? [], test] });

const escapeLogs =
  (browserName: string) =>
    (x: TestResultWithMetadata) =>
      x.logs.map(x =>
        x.map(y =>
          ({ _cdata: `${browserName} ${y}` })));

function getTestRunXML(sessions: TestSession[]): string {
  const testsuites =
    Object.entries(sessions
      .flatMap(assignSessionPropertiesToTests)
      .reduce(toResultsWithMetadataByBrowserName, {} as TestResultsWithMetadataByBrowserName))
    .map(([name, tests]) => {

      const [{ testRun, userAgent }] = tests;

      const skipped =
        tests.map(x => x.skipped);

      const errors =
        tests.map(x => x.error);

      const failures =
        tests.filter(x => !x.passed);

      const suiteTime =
        tests.reduce((time, test) => time + test.duration || 0, 0)

      return {
        testsuite: [
          {
            _attr: {
              name,
              id: testRun,
              tests: tests.length,
              skipped: skipped.length,
              errors: errors.length,
              failures: failures.length,
              time: suiteTime,
            }
          },
          { properties: [{ property: { _attr: { name, value: userAgent } } }] },
          ...tests.map(test => {
            console.log(test);
            const attributes = {
              _attr: {
                name: test.name,
                time: (typeof test.duration === 'undefined') ? 0 : test.duration / 1000,
                classname: test.suiteName
              }
            };

            if (test.skipped)
              return { testcase: [attributes, { skipped: null }]}
            else if (!test.passed) {
              const { error } = test;
              const message = (error?.message ?? '').replace(INVALID_CHARACTERS_REGEX, '');
              const stack = (error?.stack ?? '').replace(INVALID_CHARACTERS_REGEX, '');
              const type = stack.match(/^\w+Error:/) ? stack.split(':')[0] : '';
              const failure = {
                _attr: { message, type },
                _cdata: stack || message,
              };
              return { testcase: [attributes, { failure }] }
            } else
              return { testcase: attributes }
          })
        ],
        'system-out': tests.flatMap(escapeLogs(name))
      }
    });


  return XML({ testsuites }, { declaration: true, indent: '  ' })
}

export function junitReporter({
  outputPath = './test-results.xml',
}: JUnitReporterArgs = {}): Reporter {
  let args: ReporterArgs;
  let favoriteBrowser: string;
  let stackLocationRegExp: RegExp;
  let sourceMapFunction: SourceMapFunction;
  let config: TestRunnerCoreConfig;

  return {
    start(_args) {
      args = _args;
      favoriteBrowser =
        args.browserNames.find(browserName => {
          const n = browserName.toLowerCase();
          return n.includes('chrome') || n.includes('chromium') || n.includes('firefox');
        }) ?? args.browserNames[0];
      stackLocationRegExp = createStackLocationRegExp(
        args.config.protocol,
        args.config.hostname,
        args.config.port,
      );
      sourceMapFunction = createSourceMapFunction(
        args.config.protocol,
        args.config.hostname,
        args.config.port,
      );
      config = args.config
    },

    onTestRunStarted({ testRun }) {
      if (testRun !== 0) {
        // create a new source map function to clear the cached source maps
        sourceMapFunction = createSourceMapFunction(
          args.config.protocol,
          args.config.hostname,
          args.config.port,
        );
      }
    },

    onTestRunFinished({ sessions, testRun, testCoverage, focusedTestFile }) {
      const xml = getTestRunXML(sessions);
      const filepath = path.join(process.cwd(), outputPath);
      fs.writeFileSync(filepath, xml);
    },

  };
}
