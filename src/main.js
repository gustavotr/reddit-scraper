const Apify = require('apify');
const cheerio = require('cheerio');
const safeEval = require('safe-eval');
const { commentsParser, communitiesAndUsersParser, postsParser } = require('./parsers');
const { log, getUrlType, getSearchUrl, splitUrl } = require('./tools');
const { EnumBaseUrl, EnumURLTypes } = require('./constants');

Apify.main(async () => {
    const input = await Apify.getInput();

    const { proxy, startUrls, maxItems, search, extendOutputFunction, maxPostCount, maxComments } = input;

    if (!startUrls && !search) {
        throw new Error('startUrls or search parameter must be provided!');
    }

    if (startUrls && !startUrls.length && !search) {
        startUrls.push(EnumBaseUrl.MAIN_URL);
    }

    const requestList = await Apify.openRequestList('start-urls', startUrls.map((url) => ({ url })));
    const requestQueue = await Apify.openRequestQueue();

    if (search) {
        await requestQueue.addRequest({ url: getSearchUrl(search), userData: { type: EnumURLTypes.SEARCH } });
    }

    let extendOutputFunctionObj;
    if (typeof extendOutputFunction === 'string' && extendOutputFunction.trim() !== '') {
        try {
            extendOutputFunctionObj = safeEval(extendOutputFunction);
        } catch (e) {
            throw new Error(`'extendOutputFunction' is not valid Javascript! Error: ${e}`);
        }
        if (typeof extendOutputFunctionObj !== 'function') {
            throw new Error('extendOutputFunction is not a function! Please fix it or use just default ouput!');
        }
    }

    const crawler = new Apify.PuppeteerCrawler({
        requestList,
        requestQueue,
        useSessionPool: true,
        persistCookiesPerSession: true,
        launchPuppeteerOptions: {
            ...proxy,
            stealth: true,
            devtools: true,
        },

        handlePageFunction: async (context) => {
            const dataset = await Apify.openDataset();
            const { itemCount } = await dataset.getInfo();

            if (itemCount >= maxItems) {
                log.info('Actor reached the max items limit. Crawler is going to halt...');
                log.info('Crawler Finished.');
                process.exit();
            }

            const { page, request, session } = context;
            log.info(`Processing ${request.url}...`);

            const type = getUrlType(request.url);
            log.debug('Type:', type);

            await Apify.utils.puppeteer.injectJQuery(page);
            await Apify.utils.puppeteer.blockRequests(page, {
                extraUrlPatterns: ['ads'],
            });

            switch (type) {
                case EnumURLTypes.POSTS:
                    return postsParser({ requestQueue, ...context, maxPostCount });
                case EnumURLTypes.COMUMUNITIES_AND_USERS:
                    return communitiesAndUsersParser({ requestQueue, ...context });
                case EnumURLTypes.COMMENTS:
                    return commentsParser({ requestQueue, ...context });
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
