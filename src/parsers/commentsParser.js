const Apify = require('apify');

exports.commentsParser = async ({ page, request }) => {
    const data = await page.evaluate(() => {
        const numberOfVotes = document.querySelector('[data-click-id=upvote] ~div').innerHTML;
        const postedBy = document.querySelector('a[href^="/user/"]').innerHTML;
        const title = document.querySelector('h1').innerHTML;
        return {
            numberOfVotes,
            postedBy,
            title,
        };
    });

    const postUrl = request.url;
    const communityName = postUrl.match(/reddit\.com\/(.*)\/comments.*/)[1];

    const post = {
        postUrl,
        communityName,
        ...data,
    };

    await Apify.pushData(post);
};
