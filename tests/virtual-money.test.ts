import assert from "node:assert/strict";
import test from "node:test";

import { formatVirtualMoney } from "../lib/virtual-money.ts";

test("formats fantasy funds consistently as virtual dollars", () => {
  assert.equal(formatVirtualMoney(140), "$140");
  assert.equal(formatVirtualMoney(1_000), "$1,000");
  assert.equal(formatVirtualMoney(-12), "−$12");
});
