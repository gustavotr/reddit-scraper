/* global $ */

const Apify = require('apify');

exports.postsParser = async ({ requestQueue, page, request, maxPostCount }) => {
    let loading = true;
    const previousPostLength = -1;
    let posts = [];

    setTimeout(() => {
        loading = false;
    }, 20000);

    while (loading) {
        await Apify.utils.puppeteer.infiniteScroll(page, { timeoutSecs: 1 });

        posts = await page.$$eval('div.Post', (divs) => divs.map((el) => {
            const postUrl = $(el).find('a[data-click-id=timestamp]').attr('href');
            return postUrl;
        }));

        if (posts.length >= maxPostCount || previousPostLength === posts.length) {
            loading = false;
        }
    }

    await posts.reduce(async (previous, url) => {
        await previous;
        await requestQueue.addRequest({ url });
    }, Promise.resolve());
};
