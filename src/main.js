const Apify = require('apify');
const Parsers = require('./parsers');
const { EnumURLTypes } = require('./constants');
const {
    log,
    getUrlType,
    getSearchUrl,
    gotoFunction,
    getSearchType,
    hasReachedScrapeLimit,
    validateInput,
} = require('./tools');

Apify.main(async () => {
    const input = validateInput(await Apify.getInput());

    const dataset = await Apify.openDataset();
    let { itemCount } = await dataset.getInfo();

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
    } = input;

    const requestList = await Apify.openRequestList(
        'start-urls',
        useBuiltInSearch ? [] : startUrls.map((url) => ({
            url,
            userData: { searchType: getSearchType(url) },
        })),
    );
    const requestQueue = await Apify.openRequestQueue();

    if (useBuiltInSearch) {
        for (const search of searches) {
            await requestQueue.addRequest({ url: getSearchUrl({ search, type }), userData: { searchType: type } });
        }
    }

    let proxyConfiguration;

    if (proxy.useApifyProxy) {
        proxyConfiguration = await Apify.createProxyConfiguration({
            groups: proxy.apifyProxyGroups,
        });
    }

    const crawler = new Apify.PuppeteerCrawler({
        requestList,
        requestQueue,
        useSessionPool: true,
        persistCookiesPerSession: true,
        proxyConfiguration,
        gotoFunction,

        handlePageFunction: async (context) => {
            const { page, request } = context;
            const urlType = getUrlType(request.url);

            if (hasReachedScrapeLimit({ maxItems, itemCount })) {
                log.info('Actor reached the max items limit. Crawler is going to halt...');
                log.info('Crawler Finished.');
                process.exit();
            }

            log.info(`Processing ${request.url}...`);
            log.debug(`Type: ${urlType}`);

            await Apify.utils.puppeteer.injectJQuery(page);

            switch (urlType) {
                case EnumURLTypes.POSTS:
                    return Parsers.postsParser({ requestQueue, ...context, maxPostCount });
                case EnumURLTypes.COMUMUNITIES_AND_USERS:
                    return Parsers.communitiesAndUsersParser({ requestQueue, ...context, maxCommunitiesAndUsers, maxItems });
                case EnumURLTypes.COMMENTS:
                    itemCount = await Parsers.commentsParser({ requestQueue, ...context, maxComments, extendOutputFunction, maxItems, itemCount });
                    return;
                case EnumURLTypes.COMMUNITY:
                    return Parsers.communityParser({ requestQueue, ...context });
                case EnumURLTypes.COMMUNITY_CATEGORY:
                    itemCount = await Parsers.communityCategoryParser({
                        requestQueue, ...context, maxPostCount, extendOutputFunction, itemCount, maxItems,
                    });
                    return;
                default:
                    log.warning('Url does not match any parser');
            }
        },

        handleFailedRequestFunction: async ({ request }) => {
            log.exception(`Request ${request.url} failed too many times`);
        },
    });

    log.info('Starting the crawl.');
    await crawler.run();
    log.info('Crawl finished.');
});
