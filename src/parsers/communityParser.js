const { log, convertStringToNumber } = require("../tools");

exports.getCommunityData = async ({ url, page }) => {
  try {
    await page.waitForSelector("div.wBtTDilkW_rtT2k5x3eie");
  } catch (err) {
    const privateCommunity = await page.$eval("h3", (el) => el.innerText);

    if (privateCommunity && privateCommunity.includes("must be invited")) {
      log.exception(`Private community: ${url}`);
      return { error: "private community" };
    }

    throw err;
  }

  const title = await page.$eval("h1", (el) => el.innerText);
  const title2 = await page.$eval("h2", (el) => el.innerText);
  const createdAt = await page.$eval(
    '[id^="IdCard--CakeDay"]',
    (el) => el.innerText
  );
  const membersRaw = await page.$eval(
    "._3XFx6CfPlg-4Usgxm0gK8R",
    (el) => el.innerText
  );
  const members = convertStringToNumber(membersRaw);
  const categories = await page.$$eval(
    "div.wBtTDilkW_rtT2k5x3eie a",
    (elements) => {
      const cats = new Set(elements.map((el) => el.href));
      return Array.from(cats);
    }
  );

  let moderators = null;
  try {
    await page.goto(`${url}about/moderators`);
    moderators = await page.$$eval('a[href^="/user/"]', (elements) =>
      elements.map((el) => el.href.split("/user/")[1])
    );
  } catch (err) {
    log.debug("Error trying to scrape moderators");
  }

  const community = {
    title,
    title2,
    createdAt,
    members,
    moderators,
    communityUrl: url,
  };

  return { community, categories };
};

exports.communityParser = async ({ requestQueue, request, page }) => {
  const { community, categories, error } = await this.getCommunityData({
    url: request.url,
    page,
  });

  if (error) {
    return;
  }

  for (const categoryUrl of categories) {
    const category = categoryUrl.split("/").reverse().filter(Boolean)[0];
    await requestQueue.addRequest(
      {
        url: categoryUrl,
        userData: {
          ...request.userData,
          community: { ...community, category },
        },
      },
      {
        forefront: true,
      }
    );
  }
};
