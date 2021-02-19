const Apify = require("apify");
const { SCROLL_TIMEOUT } = require("../constants");

/**
 *
 * @param {Object} param
 * @param {*} param.requestQueue
 * @param {*} param.page
 * @param {number} param.maxLeaderBoardItems
 */
exports.leaderBoardParser = async ({
  page,
  requestQueue,
  maxLeaderBoardItems = 0,
}) => {
  let loading = true;
  let communities = [];
  let previousCommunitiesLength = -1;

  setTimeout(() => {
    loading = false;
  }, SCROLL_TIMEOUT);

  while (loading) {
    await Apify.utils.puppeteer.infiniteScroll(page, { timeoutSecs: 1 });

    communities = await page.$$eval(
      "li._267lcOmg8VvXcoj9O0Q1TB a",
      (elements) => {
        return elements.map((el) => el.href);
      }
    );
    if (
      (maxLeaderBoardItems > 0 && communities.length >= maxLeaderBoardItems) ||
      previousCommunitiesLength === communities.length
    ) {
      loading = false;
    }

    previousCommunitiesLength = communities.length;
  }

  await Promise.all(
    communities.slice(0, maxLeaderBoardItems).map((url) =>
      requestQueue.addRequest({
        url,
      })
    )
  );
};
