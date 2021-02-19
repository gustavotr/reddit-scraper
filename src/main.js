const Apify = require("apify");
const Parsers = require("./parsers");
const { EnumURLTypes } = require("./constants");
const {
  log,
  getUrlType,
  getSearchUrl,
  getSearchType,
  verifyItemsCount,
  validateInput,
  enableDebugMode,
  blockUnusedRequests,
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
    useBuiltInSearch,
    type,
    debugMode,
  } = input;

  if (debugMode) {
    enableDebugMode();
  }

  const requestList = await Apify.openRequestList(
    "start-urls",
    useBuiltInSearch
      ? []
      : startUrls.map((url) => ({
          url,
          userData: { searchType: getSearchType(url) },
        }))
  );
  const requestQueue = await Apify.openRequestQueue();

  if (useBuiltInSearch) {
    for (const search of searches) {
      await requestQueue.addRequest({
        url: getSearchUrl({ search, type }),
        userData: { searchType: type },
      });
    }
  }

  let proxyConfiguration;

  if (proxy.useApifyProxy) {
    proxyConfiguration = await createProxyWithValidation({
      groups: proxy.apifyProxyGroups,
    });
  }

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

      verifyItemsCount({ maxItems });

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
        case EnumURLTypes.COMMUNITY_CATEGORY:
          await Parsers.communityCategoryParser({
            requestQueue,
            ...context,
            maxPostCount,
            extendOutputFunction,
            maxItems,
          });
          return;
        case EnumURLTypes.USER:
          return Parsers.userParser({ requestQueue, ...context });
        default:
          log.warning("Url does not match any parser");
      }
    },

    handleFailedRequestFunction: async ({ request }) => {
      log.exception(`Request ${request.url} failed too many times`);
    },
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");
});
