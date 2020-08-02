import { expect } from 'chai'
import { promisify } from 'util';
import child_process from 'child_process';
import path from 'path'
import fs from 'fs'

const exec = promisify(child_process.exec);

describe('junitReporter', function () {
  describe('for a simple case', function () {

    const STACK_TRACE_UNIQUE_IDS_REGEX =
      /localhost:\d+|wtr-session-id=[\w\d]+-[\w\d]+-[\w\d]+-[\w\d]+-[\w\d]+/g;

    const cwd =
      path.join(__dirname, 'fixtures/simple');

    const expectedPath =
      path.join(cwd, './expected.xml');

    const outputPath =
      path.join(cwd, './test-results.xml');

    async function runTestFixture() {
      console.log('runTestFixture')
      try {
        await exec(`web-test-runner simple.test.js --node-resolve`, { cwd })
      } catch (e) {
        console.error(e)
      }
    }

    function cleanUpFixture() {
      fs.unlinkSync(outputPath);
    }

    beforeEach(runTestFixture);

    afterEach(cleanUpFixture);

    it('produces expected results', function () {
      const actual = fs.readFileSync(outputPath, 'utf-8')
        .replace(STACK_TRACE_UNIQUE_IDS_REGEX, '<<unique>>');
      const expected = fs.readFileSync(expectedPath, 'utf-8')
        .replace(STACK_TRACE_UNIQUE_IDS_REGEX, '<<unique>>');
      expect(actual).to.equal(expected);
    })
  })
})