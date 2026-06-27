import assert from "node:assert/strict";
import test from "node:test";
import { getSafeImageUrl } from "@/src/lib/images/image-url";

test("getSafeImageUrl keeps local upload paths on the server", () => {
  assert.equal(
    getSafeImageUrl("/uploads/recipe-images/original.jpg"),
    "/uploads/recipe-images/original.jpg"
  );
});

test("getSafeImageUrl rejects local upload paths in the browser", () => {
  const previousWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

  try {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {}
    });
    assert.equal(getSafeImageUrl("/uploads/recipe-images/original.jpg"), null);
  } finally {
    if (previousWindowDescriptor) {
      Object.defineProperty(globalThis, "window", previousWindowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});
