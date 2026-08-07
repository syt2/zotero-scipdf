import { assert } from "chai";
import { buildGoogleScholarURL } from "../src/modules/GoogleScholarLookup";

describe("Google Scholar lookup", function () {
  it("prefers a DOI over the title", function () {
    const result = buildGoogleScholarURL(
      "10.1234/example",
      "An example article",
    );
    assert.equal(new URL(result!).searchParams.get("q"), "10.1234/example");
  });

  it("uses a normalized exact title when the DOI is missing", function () {
    const result = buildGoogleScholarURL("", "  An “example”   article  ");
    assert.equal(
      new URL(result!).searchParams.get("q"),
      '"An example article"',
    );
  });

  it("returns no URL when both identifiers are missing", function () {
    assert.isUndefined(buildGoogleScholarURL("", ""));
  });
});
