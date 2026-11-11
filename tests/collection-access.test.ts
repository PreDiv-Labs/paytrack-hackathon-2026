import test from "node:test";
import assert from "node:assert/strict";
import { canCollectSharedExpenses } from "../src/lib/collection-access";
test("only the configured, explicitly identified organizer can collect shared expenses", () => {
  assert.equal(canCollectSharedExpenses("organizer", "organizer"), true);
  assert.equal(canCollectSharedExpenses("participant", "organizer"), false);
  assert.equal(canCollectSharedExpenses(null, "organizer"), false);
  assert.equal(canCollectSharedExpenses("", ""), false);
  assert.equal(canCollectSharedExpenses(undefined, undefined), false);
  assert.equal(canCollectSharedExpenses("organizer", undefined), false);
});
