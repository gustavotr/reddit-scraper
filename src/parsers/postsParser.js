/* global $ */

const Apify = require('apify');

exports.postsParser = async ({ requestQueue, page, rerequest, maxPostCount }) => {
    let loading = true;
    const previousPostLength = -1;
    let posts = [];

    while (loading) {
        await Apify.utils.puppeteer.infiniteScroll(page, { timeoutSecs: 1 });

        posts = await page.$$eval('div.Post', (divs) => divs.map((el) => {
            const numberOfVotes = $(el).find('[data-click-id=upvote] ~div').text();
            const postedBy = $(el).find('a[href^="/user/"]').text();
            const title = $(el).find('h3').text();
            const postedDate = $(el).find('a[data-click-id=timestamp]').text();
            const postUrl = $(el).find('a[data-click-id=timestamp]').attr('href');
            const communityName = postUrl.match(/reddit\.com\/(.*)\/comments.*/)[1];

            return { postUrl, numberOfVotes, communityName, postedBy, postedDate, title };
        }));

        if (posts.length >= maxPostCount || previousPostLength === posts.length) {
            loading = false;
        }
    }

    await Apify.pushData(posts);

    const links = await page.$$eval('a[data-click-id=comments]', (commentLinks) => {
        return commentLinks.map((link) => link.href);
    });

    await links.reduce(async (previous, url) => {
        await previous;
        await requestQueue.addRequest({ url });
    }, Promise.resolve());
};
