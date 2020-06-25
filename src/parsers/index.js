const { postsParser } = require('./postsParser');
const { communitiesAndUsersParser } = require('./communitiesAndUsersParser');
const { commentsParser } = require('./commentsParser');
const { communityParser } = require('./communityParser');
const { communityCategoryParser } = require('./communityCategoryParser');

module.exports = {
    postsParser,
    communitiesAndUsersParser,
    commentsParser,
    communityParser,
    communityCategoryParser,
};
