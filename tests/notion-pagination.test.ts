import assert from "node:assert/strict";
import test from "node:test";
import { collectAllPages, type NotionPage } from "@/src/lib/notion/pagination";

test("collectAllPages follows the cursor until has_more is false", async () => {
  const pages: NotionPage<number>[] = [
    { items: [1, 2, 3], nextCursor: "cursor-1", hasMore: true },
    { items: [4, 5], nextCursor: "cursor-2", hasMore: true },
    { items: [6], nextCursor: null, hasMore: false }
  ];

  const seenCursors: Array<string | undefined> = [];
  let index = 0;

  const all = await collectAllPages<number>(async (cursor) => {
    seenCursors.push(cursor);
    return pages[index++];
  });

  // Every record across all three pages is collected — not just the first page.
  assert.deepEqual(all, [1, 2, 3, 4, 5, 6]);
  // First request uses no cursor; subsequent requests follow next_cursor.
  assert.deepEqual(seenCursors, [undefined, "cursor-1", "cursor-2"]);
});

test("collectAllPages stops when has_more is false even if a cursor is present", async () => {
  let calls = 0;

  const all = await collectAllPages<string>(async () => {
    calls += 1;
    return { items: ["only"], nextCursor: "ignored-cursor", hasMore: false };
  });

  assert.deepEqual(all, ["only"]);
  assert.equal(calls, 1);
});

test("collectAllPages handles an empty data source", async () => {
  const all = await collectAllPages<number>(async () => ({
    items: [],
    nextCursor: null,
    hasMore: false
  }));

  assert.deepEqual(all, []);
});
