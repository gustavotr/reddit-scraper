const Apify = require('apify');
const sub = require('date-fns/sub');
const { EnumBaseUrl, EnumURLTypes } = require('./constants');

const { log } = Apify.utils;
log.setLevel(log.LEVELS.DEBUG);

exports.log = log;

exports.getSearchUrl = ({ search, type }) => {
    const searchType = type === 'posts' ? 'link' : 'sr,user';

    const params = new URLSearchParams([
        ['q', search],
        ['type', searchType],
    ]);
    return `${EnumBaseUrl.SEARCH_URL}?${params.toString()}`;
};

exports.getSearchType = (url) => {
    const type = this.getUrlType(url);
    if ([EnumURLTypes.COMUMUNITIES_AND_USERS, EnumURLTypes.POSTS].includes(type)) {
        return type;
    }
    log.exception('Url search type not supported!');
    return false;
};

exports.getUrlType = (url) => {
    let type = null;

    const [, params] = url.split('?');

    const searchParameters = new URLSearchParams(params);

    if (url.match(/www\.reddit\.com\/search\/.*$/)) {
        if (searchParameters.get('type') === 'link') {
            type = EnumURLTypes.POSTS;
        }

        if (searchParameters.get('type') === 'sr,user') {
            type = EnumURLTypes.COMUMUNITIES_AND_USERS;
        }
    }

    if (url.match(/www\.reddit\.com\/r\/.+\/comments\/.*$/)) {
        type = EnumURLTypes.COMMENTS;
    }

    if (url.match(/reddit.com\/r\/([^/]+)\/$/)) {
        type = EnumURLTypes.COMMUNITY;
    }

    if (url.match(/reddit.com\/r\/([^/]+)\/[^/]+\/?$/)) {
        type = EnumURLTypes.COMMUNITY_CATEGORY;
    }

    return type;
};

exports.splitUrl = (url) => url.split('?')[0];

exports.gotoFunction = async ({ page, request }) => {
    await Apify.utils.puppeteer.blockRequests(page, {
        urlPatterns: [
            '.jpg',
            '.jpeg',
            '.png',
            '.svg',
            '.gif',
            '.woff',
            '.pdf',
            '.zip',
            'doubleclicks',
        ],
    });

    return page.goto(request.url, { timeout: 60000 });
};

exports.convertStringToNumber = (stringNumber) => {
    const number = stringNumber
        .replace('k', '000')
        .replace('m', '000000')
        .replace(/[^\d]+/, '');
    return Number(number);
};

exports.convertRelativeDate = (passedTimeString) => {
    try {
        const results = passedTimeString.match(/^(\d+)\s(\w+)\sago.*$/);
        if (results) {
            const num = results[1];
            const key = results[2];
            const duration = {};
            duration[key] = Number(num);
            const convertedDate = sub(new Date(), duration).toISOString();
            return convertedDate;
        }
        throw new Error();
    } catch (err) {
        log.error(`Error converting relative date/time: ${passedTimeString}`);
        return passedTimeString;
    }
};

exports.hasReachedScrapeLimit = ({ maxItems, itemCount }) => {
    return itemCount >= maxItems;
};
exports.defaultInput = {
    proxy: '',
    startUrls: [],
    searches: [],
    extendOutputFunction: '',
    maxItems: 50,
    maxPostCount: 50,
    maxComments: 50,
    maxCommunitiesAndUsers: 50,
    useBuiltInSearch: false,
    type: 'Posts',
    proxyConfiguration: { useApifyProxy: true },
};

exports.validateInput = (input) => {
    if (input.useBuiltInSearch === undefined) {
        log.warning('Input: built-in search is not set, set true as default');
    }
    if (input.searches === undefined) {
        log.warning('Input: searches is not set, set [] as default.');
    }
    if (input.startUrls === undefined) {
        log.warning('Input: startUrls is not set, set [] as default.');
    }
    const newInput = { ...exports.defaultInput, ...input };
    if (newInput.useBuiltInSearch && newInput.searches.length === 0) {
        log.warning('Empty searches with built-in search found.');
    }
    if (newInput.startUrls.length === 0) {
        log.warning('Empty startUrls found.');
    }
    if (!newInput.useBuiltInSearch && newInput.startUrls.length === 0) {
        log.error('startUrls or built-in search must be used!');
    }
    return newInput;
};
