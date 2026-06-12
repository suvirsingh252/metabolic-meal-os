import assert from "node:assert/strict";
import test from "node:test";
import { classifySourceInput } from "@/src/lib/intake/source-classifier";

test("classifySourceInput detects TikTok video URLs", () => {
  assert.equal(
    classifySourceInput("https://www.tiktok.com/@user/video/123456789"),
    "tiktok"
  );
});

test("classifySourceInput detects TikTok short URLs", () => {
  assert.equal(classifySourceInput("https://vm.tiktok.com/ZMabc123/"), "tiktok");
});

test("classifySourceInput detects Instagram reel URLs", () => {
  assert.equal(
    classifySourceInput("https://www.instagram.com/reel/C123abc/"),
    "instagram"
  );
});

test("classifySourceInput detects Instagram post URLs", () => {
  assert.equal(
    classifySourceInput("https://instagram.com/p/C123abc/"),
    "instagram"
  );
});

test("classifySourceInput detects YouTube Shorts URLs", () => {
  assert.equal(
    classifySourceInput("https://www.youtube.com/shorts/abc123"),
    "youtube"
  );
});

test("classifySourceInput detects youtu.be URLs", () => {
  assert.equal(classifySourceInput("https://youtu.be/abc123"), "youtube");
});

test("classifySourceInput detects Pinterest pins", () => {
  assert.equal(
    classifySourceInput("https://www.pinterest.com/pin/123456789/"),
    "pinterest"
  );
});

test("classifySourceInput classifies regular recipe URLs", () => {
  assert.equal(
    classifySourceInput(
      "https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/"
    ),
    "recipe_page"
  );
});

test("classifySourceInput classifies non-URL pasted text", () => {
  assert.equal(
    classifySourceInput("Dal tadka recipe: fry cumin, add dal, simmer."),
    "plain_text"
  );
});

