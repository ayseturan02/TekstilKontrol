const {htmlFor} = require('../shared/reportTemplate');

async function renderReportPdf(report, {executablePath = process.env.PUPPETEER_EXECUTABLE_PATH} = {}) {
  const {default: puppeteer} = await import('puppeteer');
  const browser = await puppeteer.launch({headless: true, ...(executablePath ? {executablePath} : {}), timeout: 30000});
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', request => {
      if(request.url().startsWith('data:') || request.url() === 'about:blank') request.continue();
      else request.abort();
    });
    await page.setContent(htmlFor(report), {waitUntil: 'load', timeout: 30000});
    const bytes = await page.pdf({format: 'A4', preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, waitForFonts: true, timeout: 30000});
    return Buffer.from(bytes);
  } finally {
    await browser.close();
  }
}
module.exports = {renderReportPdf};
