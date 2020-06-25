const { log } = require('../tools');

exports.communityParser = async ({ requestQueue, request, page }) => {
    await page.waitForSelector('div.wBtTDilkW_rtT2k5x3eie');
    const title = await page.$eval('h1', (el) => el.innerText);
    const title2 = await page.$eval('h2', (el) => el.innerText);
    const createdAt = await page.$eval('[id^="IdCard--CakeDay"]', (el) => el.innerText);
    const categories = await page.$$eval('div.wBtTDilkW_rtT2k5x3eie a', (elements) => {
        const cats = new Set(elements.map((el) => el.href));
        return Array.from(cats);
    });

    let moderators = null;
    try {
        await page.goto(`${request.url}about/moderators`);
        moderators = await page.$$eval('a[href^="/user/"]', (elements) => elements.map((el) => el.href.split('/user/')[1]));
    } catch (err) {
        log.debug('Error trying to scrape moderators');
    }

    const community = {
        title,
        title2,
        createdAt,
        moderators,
    };

    for (const categoryUrl of categories) {
        await requestQueue.addRequest({ url: categoryUrl, userData: { community } });
    }
};
