/* global $ */

const Apify = require('apify');
const { SCROLL_TIMEOUT } = require('../constants');

exports.postsParser = async ({ requestQueue, page, request, maxPostCount }) => {
    let loading = true;
    let previousPostLength = -1;
    let posts = [];

    setTimeout(() => {
        loading = false;
    }, SCROLL_TIMEOUT);

    while (loading) {
        await Apify.utils.puppeteer.infiniteScroll(page, { timeoutSecs: 1 });

        posts = await page.$$eval('div.Post', (divs) => divs.map((el) => {
            const postUrl = $(el).find('a[data-click-id=timestamp]').attr('href');
            return postUrl;
        }));

        if (posts.length >= maxPostCount || previousPostLength === posts.length) {
            loading = false;
        }

        previousPostLength = posts.length;
    }

    await posts.reduce(async (previous, url) => {
        await previous;
        await requestQueue.addRequest({ url });
    }, Promise.resolve());
};
