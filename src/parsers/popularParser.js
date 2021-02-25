exports.popularParser = async ({ requestQueue, request, page }) => {
  const categories = await page.$$eval(
    "div.wBtTDilkW_rtT2k5x3eie a",
    (elements) => {
      const cats = new Set(elements.map((el) => el.href));
      return Array.from(cats);
    }
  );

  for (const categoryUrl of categories) {
    const category = categoryUrl.split("/").reverse().filter(Boolean)[0];
    await requestQueue.addRequest(
      {
        url: categoryUrl,
        userData: {
          ...request.userData,
          community: { title: "popular", category },
        },
      },
      {
        forefront: true,
      }
    );
  }
};
