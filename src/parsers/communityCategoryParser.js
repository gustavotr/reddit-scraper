/* global $ */

const Apify = require('apify');

exports.communityCategoryParser = async ({ requestQueue, request, page, maxPostCount }) => {
    const { community } = request.userData;
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

    community.posts = posts;
    await Apify.pushData(community);
};
