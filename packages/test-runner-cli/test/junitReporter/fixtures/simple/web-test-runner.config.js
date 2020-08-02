// fixtures/simple/web-test-runner.config.js
const { junitReporter } = require('../../../../dist/reporter/junitReporter');

module.exports = {
  reporters: [
    junitReporter(),
  ],
  testRunnerHtml: (testRunnerImport, config) => `
    <html>
      <body>
        <script src="chai.js"></script>
        <script type="module">
          import '${testRunnerImport}';
        </script>
      </body>
    </html>
  `,
};