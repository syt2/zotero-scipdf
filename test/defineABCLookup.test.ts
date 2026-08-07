import { assert } from "chai";
import { buildDefineABCURL } from "../src/modules/DefineABCLookup";

describe("DefineABC lookup", function () {
  it("prefers a DOI over the title", function () {
    const result = buildDefineABCURL("10.1234/example", "An example article");
    assert.equal(new URL(result!).searchParams.get("q"), "10.1234/example");
  });

  it("uses a normalized exact title when the DOI is missing", function () {
    const result = buildDefineABCURL("", "  An “example”   article  ");
    assert.equal(
      new URL(result!).searchParams.get("q"),
      '"An example article"',
    );
  });

  it("returns no URL when both identifiers are missing", function () {
    assert.isUndefined(buildDefineABCURL("", ""));
  });
});
