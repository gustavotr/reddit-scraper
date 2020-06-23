const Apify = require('apify');
const { EnumBaseUrl, EnumURLTypes } = require('./constants');

const { log } = Apify.utils;
log.setLevel(log.LEVELS.DEBUG);

exports.log = log;

exports.getSearchUrl = (keyword) => {
    const params = new URLSearchParams([
        ['origin', 'keywordsearch'],
        ['keyword', keyword],
    ]);
    return `${EnumBaseUrl.SEARCH_URL}?${params.toString()}`;
};

exports.getUrlType = (url) => {
    let type = null;

    const [baseUrl, params] = url.split('?');

    const searchParameters = new URLSearchParams(params);

    if (url.match(/www\.reddit\.com\/search\/.*$/)) {
        if(searchParameters.get('type') === 'link'){
            type = EnumURLTypes.POSTS;
        }

        if(searchParameters.get('type') === 'sr,user'){
            type = EnumURLTypes.COMUMUNITIES_AND_USERS;
        }
    }

    if(url.match(/www\.reddit\.com\/r\/.+\/comments\/.*$/)){
        type = EnumURLTypes.COMMENTS;
    }

    return type;
};

exports.splitUrl = (url) => url.split('?')[0];
