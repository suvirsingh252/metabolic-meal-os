export interface NotionPage<TItem> {
  items: TItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Collect every item across a cursor-paginated Notion query. Notion returns at
 * most 100 results per request and signals more with `has_more`/`next_cursor`;
 * a single query therefore silently truncates large data sources. This helper
 * follows the cursor until `has_more` is false so callers receive the full set.
 */
export async function collectAllPages<TItem>(
  fetchPage: (cursor: string | undefined) => Promise<NotionPage<TItem>>
): Promise<TItem[]> {
  const items: TItem[] = [];
  let cursor: string | undefined;

  do {
    const page = await fetchPage(cursor);
    items.push(...page.items);
    cursor = page.hasMore ? page.nextCursor ?? undefined : undefined;
  } while (cursor);

  return items;
}
