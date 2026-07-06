export type FleaMarketItemStatus = "available" | "sold" | "delisted";

export type FleaMarketItem = {
  id: string;
  name: string;
  image_src: string;
  image_alt: string;
  author_account: string;
  owner: string;
  team: string;
  location: string;
  status: FleaMarketItemStatus;
  status_text: string;
  summary: string;
  detail: string;
  contact: string;
  tags: string[];
  delisted_at: string;
  created_at: string;
  updated_at: string;
};

export type FleaMarketListData = {
  items: FleaMarketItem[];
};

export type FleaMarketDetailData = {
  item: FleaMarketItem;
};

export function formatMarketTime(value: string) {
  return value.replace("T", " ").slice(0, 16);
}

export function tagsText(tags: string[]) {
  return tags.join("，");
}
