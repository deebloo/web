---
title: Playwright
eleventyNavigation:
  key: Playwright
  parent: Browsers
  order: 3
---

Run tests using [Playwright](https://www.npmjs.com/package/playwright), using a bundled versions of Chromium, Firefox, and/or Webkit.

## Usage

When using `@web/test-runner` regularly, you can use Playwright with the `--playwright` and `--browsers` flags:

```bash
# add the package
npm i -D @web/test-runner-playwright

# add the flag
wtr test/**/*.test.js --node-resolve --playwright --browsers chromium firefox webkit
```

## Customizing launcher options

If you want to customize the playwright launcher options, you can add the browser launcher in the config.

You can find all possible launch options in the [official documentation](https://github.com/microsoft/playwright/blob/master/docs/api.md#browsertypelaunchoptions)

```js
const { playwrightLauncher } = require('@web/test-runner-playwright');

module.exports = {
  browwsers: [
    playwrightLauncher({
      // product can be chromium, webkit or firefox
      product: 'chromium',
      launchOptions: {
        executablePath: '/path/to/executable',
        headless: false,
        args: ['--some-flag'],
      },
    }),
  ],
};
```

## Testing multiple browsers

For each browser, you can add a separate browser launcher

```js
const { playwrightLauncher } = require('@web/test-runner-playwright');

module.exports = {
  browwsers: [
    playwrightLauncher({ product: 'chromium' }),
    playwrightLauncher({ product: 'firefox' }),
    playwrightLauncher({ product: 'webkit' }),
  ],
};
```
