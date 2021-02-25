const { EnumURLTypes } = require("../constants");

exports.userParser = async ({ requestQueue, page, request }) => {
  const pUrl = request.url.replace(/\/$/, "");
  await requestQueue.addRequest({
    url: `${pUrl}/posts`,
    userData: { ...request.userData, searchType: EnumURLTypes.POSTS },
  });
  await requestQueue.addRequest({
    url: `${pUrl}/comments`,
    userData: { ...request.userData, searchType: EnumURLTypes.USER_COMMENTS },
  });
};
