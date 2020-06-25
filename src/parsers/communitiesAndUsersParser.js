exports.communitiesAndUsersParser = async ({ requestQueue, page, request }) => {
    const communities = await page.$$eval('a[href^="/r/"]', (elements) => elements.map((el) => el.href));

    await communities.reduce(async (previous, url) => {
        await previous;
        await requestQueue.addRequest({ url });
    });
};

// const communityName = request.url.match(/reddit\.com\/(.+)$/)[1];
//     const categories = await page.evaluate((communityName) => {
//         const regex = RegExp(`.+\\/${communityName}\\w+\\/?$`);
//         const cat = document.querySelectorAll(`a[href^=${communityName}]`).filter((el) => el.href.match(regex));
//         console.log(cat);
//         return cat;
//     }, communityName);
