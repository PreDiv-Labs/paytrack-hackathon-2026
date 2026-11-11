import test from "node:test";
import assert from "node:assert/strict";
import { serverOrigin } from "../src/lib/server-origin";
test("Render's stable URL supplies the origin before manual OAuth setup", () => {
  assert.equal(
    serverOrigin({ RENDER_EXTERNAL_URL: "https://paytrack.onrender.com" }),
    "https://paytrack.onrender.com",
  );
  assert.equal(
    serverOrigin({
      AUTH_URL: "https://example.com/path",
      RENDER_EXTERNAL_URL: "https://paytrack.onrender.com",
    }),
    "https://example.com",
  );
  assert.throws(() => serverOrigin({}));
  assert.throws(() => serverOrigin({ AUTH_URL: "file:///tmp/app" }));
});
