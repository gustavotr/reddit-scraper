/* global $ */

const Apify = require('apify');

exports.commentsParser = async ({ page, request }) => {
    const data = await page.evaluate(() => {
        const numberOfVotes = document.querySelector('[data-click-id=upvote] ~div').innerHTML;
        const postedBy = document.querySelector('a[href^="/user/"]').innerHTML;
        const title = document.querySelector('h1').innerHTML;
        const text = document.querySelector('div[data-click-id=text]').innerText;
        return {
            numberOfVotes,
            postedBy,
            title,
            text,
        };
    });

    const postUrl = request.url;
    const communityName = postUrl.match(/reddit\.com\/(.*)\/comments.*/)[1];

    const comments = await page.evaluate(() => {
        const temp = [];

        $('[id^=t1]').each((index, el) => {
            const id = $(el).attr('id');
            const commentUrl = `${this.location.href}${id}`;
            const userName = $(el).find('a[href^="/user/"]').text();
            const points = $(el).find('span');
            // .filter((span) => $(span).text().includes('points')).match(/(\d+) points/)[1];
            const commentDate = $(el).find(`CommentTopMeta--Created--${id}`).text();
            const description = $(el).find('[data-test-id="comment"]').text();

            const comment = {
                commentUrl,
                userName,
                points,
                commentDate,
                description,
            };
            console.log(comment);
            temp.push(comment);
        });

        console.log(temp);

        return temp;
    });

    await page.waitFor(100000000);

    const post = {
        postUrl,
        communityName,
        ...data,
        comments,
    };

    await Apify.pushData(post);
};
