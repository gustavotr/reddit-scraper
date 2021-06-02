const Apify = require("apify");
const Parsers = require("./parsers");
const { EnumURLTypes } = require("./constants");
const {
  log,
  getUrlType,
  getSearchUrl,
  hasReachedMaxItemsLimit,
  validateInput,
  enableDebugMode,
  blockUnusedRequests,
  setConfig,
} = require("./tools");
const { createProxyWithValidation } = require("./proxy-validations");
const { setItemsCount } = require("./saved-items");

Apify.main(async () => {
  const input = validateInput(await Apify.getInput());

  const dataset = await Apify.openDataset();
  const { itemCount } = await dataset.getInfo();
  setItemsCount(itemCount);

  const {
    proxy,
    startUrls,
    searches,
    extendOutputFunction,
    maxItems,
    maxPostCount,
    maxComments,
    maxCommunitiesAndUsers,
    type,
    debugMode,
    sort,
    time,
    maxLeaderBoardItems,
    scrollTimeout,
  } = input;

  if (debugMode) {
    enableDebugMode();
  }

  setConfig({ scrollTimeout: scrollTimeout * 1000 });

  const useBuiltInSearch = !startUrls.length;

  const requestList = await Apify.openRequestList(
    "start-urls",
    useBuiltInSearch ? [] : startUrls
  );
  const requestQueue = await Apify.openRequestQueue();

  if (useBuiltInSearch) {
    for (const search of searches) {
      await requestQueue.addRequest({
        url: getSearchUrl({ search, type, sort, time }),
        userData: { searchType: type },
      });
    }
  }

  const proxyConfiguration = await createProxyWithValidation({
    proxyConfig: proxy,
  });

  const preNavigationHooks = [
    async (crawlingContext) => {
      await blockUnusedRequests(crawlingContext.page);
    },
  ];

  const crawler = new Apify.PuppeteerCrawler({
    requestList,
    requestQueue,
    useSessionPool: true,
    persistCookiesPerSession: true,
    proxyConfiguration,
    preNavigationHooks,

    handlePageFunction: async (context) => {
      const { page, request } = context;
      const urlType = getUrlType(request.url);

      if (hasReachedMaxItemsLimit({ maxItems })) {
        return;
      }

      log.info(`Processing ${request.url}...`);
      log.debug(`Type: ${urlType}`);

      await Apify.utils.puppeteer.injectJQuery(page);

      switch (urlType) {
        case EnumURLTypes.SEARCH:
          return Parsers.searchParser({ requestQueue, ...context, maxItems });
        case EnumURLTypes.POSTS:
          return Parsers.postsParser({
            requestQueue,
            ...context,
            maxPostCount,
          });
        case EnumURLTypes.COMMUNITIES_AND_USERS:
          return Parsers.communitiesAndUsersParser({
            requestQueue,
            ...context,
            maxCommunitiesAndUsers,
            maxItems,
          });
        case EnumURLTypes.USER:
          return Parsers.userParser({
            requestQueue,
            ...context,
            maxItems,
          });
        case EnumURLTypes.USER_COMMENTS:
          return Parsers.userCommentsParser({
            requestQueue,
            ...context,
            maxItems,
            maxComments,
          });
        case EnumURLTypes.COMMENTS:
          await Parsers.commentsParser({
            requestQueue,
            ...context,
            maxComments,
            extendOutputFunction,
            maxItems,
          });
          return;
        case EnumURLTypes.COMMUNITY:
          return Parsers.communityParser({ requestQueue, ...context });
        case EnumURLTypes.POPULAR:
          return Parsers.popularParser({ requestQueue, ...context });
        case EnumURLTypes.COMMUNITY_CATEGORY:
          await Parsers.communityCategoryParser({
            requestQueue,
            ...context,
            maxPostCount,
            extendOutputFunction,
            maxItems,
          });
          return;
        case EnumURLTypes.LEADERBOARD:
          return Parsers.leaderBoardParser({
            requestQueue,
            ...context,
            maxLeaderBoardItems,
          });
        default:
          log.warning("Url does not match any parser");
      }
    },

    handleFailedRequestFunction: async ({ request }) => {
      log.exception(`Request ${request.url} failed too many times`);
    },
  });

  Apify.events.on("reachedMaxItemsLimit", async () => {
    await crawler.autoscaledPool.abort();
    log.warning(
      "Actor reached the max items limit. Crawler is going to halt and abort ongoing requests..."
    );
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");
});
