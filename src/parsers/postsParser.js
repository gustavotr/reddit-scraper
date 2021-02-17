/* global $ */

const Apify = require("apify");
const { SCROLL_TIMEOUT } = require("../constants");
const { splitUrl } = require("../tools");

exports.postsParser = async ({ requestQueue, page, request, maxPostCount }) => {
  let loading = true;
  let previousPostLength = -1;
  let posts = [];

  setTimeout(() => {
    loading = false;
  }, SCROLL_TIMEOUT);

  while (loading) {
    await Apify.utils.puppeteer.infiniteScroll(page, { timeoutSecs: 1 });

    posts = await page.$$eval("div.Post", (divs) =>
      divs.map((el) => {
        const postUrl = $(el).find("a[data-click-id=timestamp]").attr("href");
        return postUrl;
      })
    );

    if (posts.length >= maxPostCount || previousPostLength === posts.length) {
      loading = false;
    }

    previousPostLength = posts.length;
  }

  posts.splice(maxPostCount);

  for (const url of posts) {
    await requestQueue.addRequest({
      url: splitUrl(url),
      userData: request.userData,
    });
  }
};
