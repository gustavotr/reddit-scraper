/* global $ */

const Apify = require("apify");
const { SCROLL_TIMEOUT } = require("../constants");
const { incrementItemsCount } = require("../saved-items");
const { log, hasReachedMaxItemsLimit } = require("../tools");

exports.userCommentsParser = async ({
  page,
  request,
  maxComments,
  extendOutputFunction,
  maxItems,
}) => {
  const { user } = request.userData;
  if (!user) {
    const username = request.url.match(/user\/([^/]+)/)[1];
    const userUrl = request.url.split("comments")[0];
    Object.assign(user, { user: username, userUrl });
  }

  let loading = true;
  let previousCommentsLength = -1;
  let comments = [];

  setTimeout(() => {
    loading = false;
  }, SCROLL_TIMEOUT);

  while (loading) {
    await Apify.utils.puppeteer.infiniteScroll(page, { timeoutSecs: 1 });

    comments = await page.$$eval(".Comment", (elements) => {
      const temp = [];
      elements.forEach((el) => {
        const classes = $(el).attr("class");
        const id = classes.split(" ")[1];
        const description = $(el).find(".RichTextJSON-root").text();
        const span = Array.from($(el).find("span")).find((sp) =>
          $(sp).text().includes("point")
        );
        const points = span
          ? $(span)
              .text()
              .match(/(\d+).+/)[1]
          : null;
        const commentLink = $(el).find(`#CommentTopMeta--Created--${id}`);
        const commentDate = $(commentLink).text();
        const commentUrl = $(commentLink).attr("href");
        const comment = { commentUrl, commentDate, description };

        if (points) {
          comment.points = Number(points);
        }

        temp.push(comment);
      });
      return temp;
    });

    if (
      comments.length >= maxComments ||
      previousCommentsLength === comments.length
    ) {
      loading = false;
    }

    previousCommentsLength = comments.length;
  }

  comments.splice(maxComments);

  let userResult = {};
  if (extendOutputFunction) {
    userResult = await page.evaluate((functionStr) => {
      // eslint-disable-next-line no-eval
      const f = eval(functionStr);
      return f();
    }, extendOutputFunction);
  }

  Object.assign(comments, userResult);

  const userComments = {
    dataType: "user-comments",
    ...user,
    comments,
  };

  if (hasReachedMaxItemsLimit({ maxItems })) {
    return;
  }
  log.debug("Saving comments data");
  await Apify.pushData(userComments);
  incrementItemsCount();
};
