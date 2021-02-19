const { postsParser } = require("./postsParser");
const { communitiesAndUsersParser } = require("./communitiesAndUsersParser");
const { commentsParser } = require("./commentsParser");
const { communityParser } = require("./communityParser");
const { communityCategoryParser } = require("./communityCategoryParser");
const { searchParser } = require("./searchParser");
const { leaderBoardParser } = require("./leaderBoardParser");

module.exports = {
  postsParser,
  communitiesAndUsersParser,
  commentsParser,
  communityParser,
  communityCategoryParser,
  searchParser,
  leaderBoardParser,
};
