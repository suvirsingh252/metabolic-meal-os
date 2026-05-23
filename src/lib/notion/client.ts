import { Client } from "@notionhq/client";
import { serverEnv } from "@/src/lib/env";

export function getNotionClient() {
  return new Client({
    auth: serverEnv.NOTION_API_KEY
  });
}
