/* global $ */

const Apify = require('apify');

exports.commentsParser = async ({ page, request }) => {
    await page.waitForSelector('[data-click-id=upvote] ~div');
    const data = await page.evaluate(() => {
        const numberOfVotes = document.querySelector('[data-click-id=upvote] ~div').innerHTML;
        const postedBy = document.querySelector('a[href^="/user/"]').innerHTML;
        const postedDate = document.querySelector('a[data-click-id=timestamp]').innerHTML;
        const title = document.querySelector('h1').innerHTML;
        const text = document.querySelector('div[data-click-id=text]').innerText;

        return {
            numberOfVotes,
            postedBy,
            postedDate,
            title,
            text,
        };
    });

    const postUrl = request.url;
    const communityName = postUrl.match(/reddit\.com\/(.*)\/comments.*/)[1];

    const comments = await page.$$eval('[id^=t1]', (elements) => {
        const temp = [];
        elements.forEach((el) => {
            const span = Array.from($(el).find('span')).find((span) => $(span).text().includes('points'));
            const points = span ? span.innerText.match(/(\d+).+/)[1] : null;
            const id = $(el).attr('id');
            const commentUrl = `${this.location.href}${id}`;
            const userName = $(el).find('a[href^="/user/"]').text();
            const commentDate = $(el).find(`#CommentTopMeta--Created--${id}`).text();
            const description = $(el).find('[data-test-id="comment"]').text();
            const comment = { commentUrl, userName, commentDate, description };

            if (points) {
                comment.points = points;
            }

            temp.push(comment);
        });
        return temp;
    });

    const post = {
        postUrl,
        communityName,
        ...data,
        comments,
    };
    // const elements = $('[id^=t1]');
    // const comments = [];

    // for (const el of elements) {
    //     const id = $(el).attr('id');
    //     const commentUrl = `${this.location.href}${id}`;
    //     const userName = $(el).find('a[href^="/user/"]').text();
    //     const points = $(el).find('span');
    //     // .filter((span) => $(span).text().includes('points')).match(/(\d+) points/)[1];
    //     const commentDate = $(el).find(`CommentTopMeta--Created--${id}`).text();
    //     const description = $(el).find('[data-test-id="comment"]').text();

    //     const comment = {
    //         commentUrl,
    //         userName,
    //         points,
    //         commentDate,
    //         description,
    //     };
    //     comments.push(comment);
    // }

    await Apify.pushData(post);
    await page.waitFor(1000000);
};
