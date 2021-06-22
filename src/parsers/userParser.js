const { EnumURLTypes } = require("../constants");

exports.userParser = async ({ requestQueue, page, request }) => {
  const pUrl = request.url.replace(/\/$/, "");

  const trophies = await page.$$eval("._3lNmiqeZrNM0E_H2ZCIpN_", (elements) =>
    elements.map((el) => el.innerText)
  );
  const username = request.url.match(/user\/([^/]+)/)[1];
  const userUrl = request.url.split("comments")[0];

  const user = {
    trophies,
    user: username,
    userUrl,
  };

  await requestQueue.addRequest({
    url: `${pUrl}/posts`,
    userData: { ...request.userData, user, searchType: EnumURLTypes.POSTS },
  });
  await requestQueue.addRequest({
    url: `${pUrl}/comments`,
    userData: {
      ...request.userData,
      user,
      searchType: EnumURLTypes.USER_COMMENTS,
    },
  });
};
