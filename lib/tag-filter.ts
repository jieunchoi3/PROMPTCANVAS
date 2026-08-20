import { tagMatchesTopTab } from "@/lib/top-categories";
import type { AssetTag, Tag } from "@/lib/types";

export function tagFilterTabId(tag: Tag): string {
  return tag.category_key ?? tag.kind;
}

export function filterAssetsByTags(
  assetIds: string[],
  assetTags: AssetTag[],
  tags: Tag[],
  filterTagIds: string[],
): Set<string> {
  if (filterTagIds.length === 0) return new Set(assetIds);

  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const byTab = new Map<string, string[]>();
  for (const id of filterTagIds) {
    const tag = tagById.get(id);
    if (!tag) continue;
    const tabId = tagFilterTabId(tag);
    const arr = byTab.get(tabId) ?? [];
    arr.push(id);
    byTab.set(tabId, arr);
  }

  const byAsset = new Map<string, Set<string>>();
  for (const link of assetTags) {
    const set = byAsset.get(link.asset_id) ?? new Set<string>();
    set.add(link.tag_id);
    byAsset.set(link.asset_id, set);
  }

  const matched = new Set<string>();
  for (const assetId of assetIds) {
    const tagIds = byAsset.get(assetId);
    if (!tagIds) continue;
    let ok = true;
    for (const ids of byTab.values()) {
      if (!ids.some((id) => tagIds.has(id))) {
        ok = false;
        break;
      }
    }
    if (ok) matched.add(assetId);
  }
  return matched;
}

export function coarseTagTabFilter(
  assetIds: string[],
  assetTags: AssetTag[],
  tags: Tag[],
  tabIds: string[],
): Set<string> {
  if (tabIds.length === 0) return new Set(assetIds);

  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const byAsset = new Map<string, Tag[]>();
  for (const link of assetTags) {
    const tag = tagById.get(link.tag_id);
    if (!tag) continue;
    const arr = byAsset.get(link.asset_id) ?? [];
    arr.push(tag);
    byAsset.set(link.asset_id, arr);
  }

  const matched = new Set<string>();
  for (const assetId of assetIds) {
    const assetTagList = byAsset.get(assetId) ?? [];
    if (tabIds.some((tabId) => assetTagList.some((tag) => tagMatchesTopTab(tag, tabId)))) {
      matched.add(assetId);
    }
  }
  return matched;
}
