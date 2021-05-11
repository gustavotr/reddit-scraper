/* global $ */

const Apify = require("apify");
const { SCROLL_TIMEOUT } = require("../constants");
const { splitUrl, log } = require("../tools");

exports.postsParser = async ({ requestQueue, page, request, maxPostCount }) => {
  let loading = true;
  let previousPostLength = 0;
  let posts = [];

  setTimeout(() => {
    loading = false;
  }, SCROLL_TIMEOUT);

  const getPostUrls = async () => {
    const postUrls = await page.$$eval("div.Post", (divs) =>
      divs.map((el) => {
        const postUrl = $(el).find("a[data-click-id=timestamp]").attr("href");
        return postUrl;
      })
    );
    return postUrls;
  };

  const queueNewPosts = async (newPosts, userData) =>
    newPosts.reduce(async (next, current) => {
      await next;
      return requestQueue.addRequest({
        url: splitUrl(current),
        userData,
      });
    }, Promise.resolve());

  const hasReachedPostLimit = () => {
    log.debug(`${posts.length} posts loaded`, {
      maxPostCount,
      previousPostLength,
    });
    return posts.length >= maxPostCount || previousPostLength === posts.length;
  };

  while (loading) {
    await Apify.utils.puppeteer.infiniteScroll(page, {
      timeoutSecs: 2,
    });

    posts = await getPostUrls(page);

    if (hasReachedPostLimit()) {
      log.debug("REACHED POST LIMIT");
      loading = false;
    }

    previousPostLength = posts.length;
  }

  posts.splice(maxPostCount);

  await queueNewPosts(posts, request.userData);
};
