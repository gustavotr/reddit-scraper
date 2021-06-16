const Apify = require("apify");
const { SCROLL_TIMEOUT, EnumURLTypes } = require("../constants");
const { splitUrl } = require("../tools");

exports.communitiesAndUsersParser = async ({
  requestQueue,
  page,
  request,
  maxCommunitiesAndUsers,
}) => {
  let loading = true;
  let previousCommunitiesLength = -1;
  let communities = [];
  let users = [];

  setTimeout(() => {
    loading = false;
  }, SCROLL_TIMEOUT);

  while (loading) {
    await Apify.utils.puppeteer.infiniteScroll(page, { timeoutSecs: 1 });
    communities = await page.$$eval('a[href^="/r/"]', (elements) =>
      elements.map((el) => el.href)
    );

    users = await page.$$eval('a[href^="/user/"]', (elements) =>
      elements.map((el) => el.href)
    );

    if (
      communities.length >= maxCommunitiesAndUsers ||
      previousCommunitiesLength === communities.length
    ) {
      loading = false;
    }

    previousCommunitiesLength = communities.length;
  }

  communities.splice(maxCommunitiesAndUsers);

  for (const url of communities) {
    await requestQueue.addRequest({
      url: splitUrl(url),
      userData: request.userData,
    });
  }

  for (const url of users) {
    const pUrl = url.replace(/\/$/, "");
    const postUrl = `${pUrl}`;
    await requestQueue.addRequest({
      url: postUrl,
      userData: { ...request.userData, searchType: EnumURLTypes.POSTS },
    });
  }
};
