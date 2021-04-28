const { subHours } = require("date-fns");
const { convertRelativeDate } = require("./tools");

describe("convertRelativeDate", () => {
  it("should convert humanized date string to ISO date string", () => {
    expect.hasAssertions();
    expect(convertRelativeDate("1 hour ago")).toMatch(
      subHours(new Date(), 1).toISOString().substr(0, 16)
    );
    expect(convertRelativeDate("1h")).toMatch(
      subHours(new Date(), 1).toISOString().substr(0, 16)
    );
  });

  it("should return current time if value is `just now`", () => {
    expect.assertions(1);
    expect(convertRelativeDate("just now")).toMatch(
      new Date().toISOString().substr(0, 16)
    );
  });
});
