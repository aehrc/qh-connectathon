// CodeSandbox SMART starter (https://codesandbox.io/p/sandbox/smart-on-fhir-0rd1q).
//
// CodeSandbox sits behind a Cloudflare bot check that blocks automated browsers (and its API),
// so these screenshots are taken by hand ("screenshot by Jim" in Presenter-Guide.md). This
// script only reports whether the check is still there; it never tries to get past it.
import { launch, shot } from './lib.mjs';

const URL = 'https://codesandbox.io/p/sandbox/smart-on-fhir-0rd1q';
const { browser, page } = await launch();
try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(10000);
  const text = await page.evaluate(() => document.body.innerText);
  if (/security verification|Just a moment|verify you are human/i.test(text)) {
    console.log('SKIP  codesandbox: Cloudflare bot check; take img/smart/ CodeSandbox shots by hand');
  } else {
    await shot(page, 'smart/02-codesandbox.png');
  }
} finally {
  await browser.close();
}
