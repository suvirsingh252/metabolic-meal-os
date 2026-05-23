import { Client } from "@notionhq/client";
import { serverEnv } from "@/src/lib/env";

export function getNotionClient(apiKey = serverEnv.NOTION_API_KEY) {
  return new Client({
    auth: apiKey
  });
}
