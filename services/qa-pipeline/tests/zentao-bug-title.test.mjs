import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeBugTitle,
  validateBugTitle,
  validateCreatedBugTitle,
} from "../zentao/zentao-bug-create.mjs";

function normalizeAndValidate(rawTitle) {
  return validateBugTitle(normalizeBugTitle(rawTitle));
}

test("converts paired ASCII quotes to Chinese quotation marks", () => {
  assert.equal(
    normalizeAndValidate('【电子围栏】操作列表头被截断为"Act..."'),
    "【电子围栏】操作列表头被截断为“Act...”"
  );
});

test("keeps valid Chinese quotation marks unchanged", () => {
  assert.equal(
    normalizeAndValidate("【电子围栏】操作列表头被截断为“Act...”"),
    "【电子围栏】操作列表头被截断为“Act...”"
  );
});

test("converts corner brackets to Chinese quotation marks", () => {
  assert.equal(
    normalizeAndValidate("【电子围栏】操作列表头被截断为「Act...」"),
    "【电子围栏】操作列表头被截断为“Act...”"
  );
});

test("decodes HTML quote entities before normalizing the title", () => {
  assert.equal(
    normalizeAndValidate("【电子围栏】操作列表头被截断为&quot;Act...&quot;"),
    "【电子围栏】操作列表头被截断为“Act...”"
  );
});

test("rejects unmatched ASCII quotes", () => {
  assert.throws(
    () => normalizeAndValidate('【电子围栏】操作列表头被截断为"Act...'),
    /未配对的半角双引号/
  );
});

test("rejects unsupported residual HTML entities", () => {
  assert.throws(
    () => normalizeAndValidate("【电子围栏】标题包含&nbsp;实体"),
    /禁止包含 HTML 实体/
  );
});

test("marks a created bug invalid when the server returns HTML entities", () => {
  const validation = validateCreatedBugTitle(
    "【电子围栏】操作列表头被截断为&quot;Act...&quot;",
    "【电子围栏】操作列表头被截断为“Act...”"
  );

  assert.equal(validation.valid, false);
  assert.match(validation.validationErrors.join("；"), /服务端原始标题包含 HTML 实体/);
});

test("accepts a created bug whose title exactly matches the normalized title", () => {
  const validation = validateCreatedBugTitle(
    "【电子围栏】操作列表头被截断为“Act...”",
    "【电子围栏】操作列表头被截断为“Act...”"
  );

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.validationErrors, []);
});
