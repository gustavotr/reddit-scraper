/* global $ */

exports.postsParser = async ({ requestQueue, page, rerequest }) => {
    const posts = await page.$$eval('div.Post', (divs) => {
        divs.forEach((el) => {
            const numberOfVotes = $(el).find('[data-click-id=upvote] ~div').text();
            const postedBy = $(el).find('a[href^="/user/"]').text();
            const title = $(el).find('h1').text();

            console.log({ numberOfVotes, postedBy, title });
        });

        // return { numberOfVotes, postedBy, title };
    });

    await page.waitFor(10000000);

    // const links = await page.$$eval('a[data-click-id=comments]', (commentLinks) => {
    //     return commentLinks.map((link) => link.href);
    // });

    // await links.reduce(async (previous, url) => {
    //     await previous;
    //     await requestQueue.addRequest({ url });
    // }, Promise.resolve());
};
