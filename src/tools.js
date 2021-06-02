const Apify = require("apify");
const sub = require("date-fns/sub");
const { EnumBaseUrl, EnumURLTypes } = require("./constants");
const { getItemsCount } = require("./saved-items");

const { log } = Apify.utils;
exports.log = log;

exports.enableDebugMode = () => {
  log.setLevel(log.LEVELS.DEBUG);
};

let config = {
  scrollTimeout: 40000,
};

exports.getConfig = () => config;

exports.setConfig = (newConfig) => {
  config = { ...config, ...newConfig };
};

exports.getSearchUrl = ({ search, type, sort, time }) => {
  const searchType = type === "posts" ? "link" : "sr,user";

  const params = new URLSearchParams([
    ["q", search],
    ["type", searchType],
  ]);

  if (sort) {
    params.set("sort", sort);
  }

  if (time) {
    params.set("t", time);
  }

  return `${EnumBaseUrl.SEARCH_URL}?${params.toString()}`;
};

exports.getSearchType = (url) => {
  const type = this.getUrlType(url);
  log.debug("Search type", { type });
  if (!type) {
    log.error("Url search type not supported!", { url });
    process.exit(0);
  }
  return type;
};

/**
 *
 * @param {string} url
 */
exports.getUrlType = (url) => {
  if (!url) {
    return null;
  }

  let type = null;

  const [, params] = url.split("?");

  const searchParameters = new URLSearchParams(params);

  if (url.match(/reddit\.com\/search\/.*$/)) {
    if (searchParameters.get("type") === "link") {
      type = EnumURLTypes.POSTS;
    } else if (searchParameters.get("type") === "sr,user") {
      type = EnumURLTypes.COMMUNITIES_AND_USERS;
    } else {
      type = EnumURLTypes.SEARCH;
    }
  }

  if (url.match(/www\.reddit\.com\/r\/.+\/comments\/.*$/)) {
    type = EnumURLTypes.COMMENTS;
  }

  if (url.match(/reddit\.com\/r\/([^/]+)(\/?)$/)) {
    type = EnumURLTypes.COMMUNITY;
  }

  if (url.match(/reddit\.com\/r\/popular(\/?)$/)) {
    type = EnumURLTypes.POPULAR;
  }

  if (url.match(/reddit\.com\/r\/([^/]+)\/[^/]+\/?$/)) {
    type = EnumURLTypes.COMMUNITY_CATEGORY;
  }

  if (url.match(/reddit\.com\/user\/([^/]+)\/?$/)) {
    type = EnumURLTypes.USER;
  }

  if (url.match(/www\.reddit\.com\/user\/.+\/comments\/?$/)) {
    type = EnumURLTypes.USER_COMMENTS;
  }

  if (url.match(/reddit\.com\/user\/([^/]+)\/posts\/?.*$/)) {
    type = EnumURLTypes.POSTS;
  }

  if (url.match(/reddit\.com\/subreddits\/leaderboard(\/.*)?$/)) {
    type = EnumURLTypes.LEADERBOARD;
  }

  return type;
};

/**
 *
 * @param {string} url
 */
exports.splitUrl = (url) => url.split("?")[0];

exports.blockUnusedRequests = async (page) => {
  await Apify.utils.puppeteer.blockRequests(page, {
    urlPatterns: [
      ".jpg",
      ".jpeg",
      ".png",
      ".svg",
      ".gif",
      ".woff",
      ".pdf",
      ".zip",
      "doubleclicks",
    ],
  });
};

exports.convertStringToNumber = (stringNumber) => {
  const number = stringNumber
    .replace("k", "000")
    .replace("m", "000000")
    .replace(/[^\d]+/, "");
  return Number(number);
};

exports.mapCharToDuration = (char) => {
  switch (char) {
    case "s":
      return "seconds";
    case "m":
      return "minutes";
    case "h":
      return "hours";
    case "d":
      return "days";
    case "w":
      return "weeks";
    case "y":
      return "years";
    default:
      return char;
  }
};

exports.convertRelativeDate = (passedTimeString) => {
  try {
    if (passedTimeString.trim() === "just now") {
      return new Date().toISOString();
    }
    const results = passedTimeString.match(/^(\d+)\s(\w+)\sago.*$/);
    if (results) {
      const num = results[1];
      const key = results[2].slice(-1) === "s" ? results[2] : `${results[2]}s`;
      const duration = {};
      duration[key] = Number(num);
      const convertedDate = sub(new Date(), duration).toISOString();
      return convertedDate;
    }
    const shortTag = passedTimeString.match(/^(\d+)(\w)$/);
    if (shortTag) {
      const num = shortTag[1];
      const key = this.mapCharToDuration(shortTag[2]);
      if (!key) {
        throw new Error();
      }
      const duration = {};
      duration[key] = Number(num);
      const convertedDate = sub(new Date(), duration).toISOString();
      if (convertedDate) {
        return convertedDate;
      }
    }
    throw new Error();
  } catch (err) {
    log.debug(`Error converting relative date/time: ${passedTimeString}`, err);
    return passedTimeString;
  }
};

/**
 *
 * @param {Object} params
 * @param {number} params.maxItems
 * @returns {boolean}
 */
exports.hasReachedMaxItemsLimit = ({ maxItems }) => {
  const itemCount = getItemsCount();
  const reachedLimit = itemCount >= maxItems;
  if (reachedLimit) {
    Apify.events.emit("reachedMaxItemsLimit");
    return true;
  }
  return false;
};

exports.defaultInput = {
  proxy: "",
  startUrls: [],
  searches: [],
  extendOutputFunction: "",
  maxItems: 50,
  maxPostCount: 50,
  maxComments: 50,
  maxCommunitiesAndUsers: 50,
  type: "Posts",
  proxyConfiguration: { useApifyProxy: true },
};

exports.validateInput = (input) => {
  const newInput = { ...this.defaultInput, ...input };
  const { startUrls, searches } = newInput;

  if (!searches.length && !startUrls.length) {
    log.error("startUrls and searches are empty. One of them must be used");
    process.exit(0);
  }

  if (startUrls.length) {
    log.info("Found startUrl. Search params will be ignored.");

    startUrls.forEach((url) => {
      let urlObj = {
        userData: {},
      };
      if (typeof url === "string") {
        urlObj.url = url;
      } else if (typeof url === "object") {
        urlObj = {
          ...urlObj,
          ...url,
        };
      }

      if (urlObj.requestsFromUrl) {
        return;
      }

      const searchType = this.getSearchType(urlObj.url);
      if (!searchType) {
        log.error(`This url is not supported: ${urlObj.url}`);
        process.exit(0);
      }
    });
  }

  if (!startUrls.length && searches.length) {
    log.info("Search param found. Performing search...");
  }

  return newInput;
};
