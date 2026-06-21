import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

const CONFIG_PATH = path.resolve(process.cwd(), "..", "storage", "image2-channel.json");

type Image2ChannelRecord = {
  id?: string;
  name?: string;
  _type?: string;
  key?: string;
  url?: string;
  provider?: string;
  model?: string;
  response_format?: string;
  include_response_format?: boolean;
  generation_path?: string;
  edit_path?: string;
};

type Image2ChannelsConfigRecord = Image2ChannelRecord & {
  default_channel?: string;
  channels?: Image2ChannelRecord[];
};

export type Image2Channel = {
  id: string;
  name: string;
  _type?: string;
  key: string;
  url: string;
  provider: string;
  model?: string;
  response_format?: string;
  include_response_format?: boolean;
  generation_path?: string;
  edit_path?: string;
};

export type Image2ChannelOption = {
  id: string;
  name: string;
  provider: string;
  model: string;
};

export type Image2ChannelsConfig = {
  defaultChannelId: string;
  channels: Image2Channel[];
};

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function defaultChannelId(channel: Image2ChannelRecord, index: number) {
  return textValue(channel.id) || textValue(channel.provider) || textValue(channel._type) || `channel-${index + 1}`;
}

function defaultChannelName(channel: Image2ChannelRecord, id: string) {
  return textValue(channel.name) || textValue(channel.provider) || textValue(channel._type) || id;
}

function normalizeChannel(channel: Image2ChannelRecord, index: number) {
  const id = defaultChannelId(channel, index);
  const key = textValue(channel.key);
  const url = textValue(channel.url);
  if (!key || !url) {
    throw new Error(`image2-channel.json 中的通道 ${id} 缺少 key 或 url`);
  }

  return {
    id,
    name: defaultChannelName(channel, id),
    _type: textValue(channel._type) || undefined,
    key,
    url,
    provider: textValue(channel.provider) || textValue(channel._type) || id,
    model: textValue(channel.model) || undefined,
    response_format: textValue(channel.response_format) || undefined,
    include_response_format: typeof channel.include_response_format === "boolean" ? channel.include_response_format : undefined,
    generation_path: textValue(channel.generation_path) || undefined,
    edit_path: textValue(channel.edit_path) || undefined,
  } satisfies Image2Channel;
}

export async function readImage2Channels(): Promise<Image2ChannelsConfig> {
  const raw = await readFile(CONFIG_PATH, "utf8");
  const config = JSON.parse(raw) as Image2ChannelsConfigRecord;
  const sourceChannels = Array.isArray(config.channels) && config.channels.length ? config.channels : [config];
  const channels = sourceChannels.map(normalizeChannel);
  if (!channels.length) {
    throw new Error("image2-channel.json 没有可用通道");
  }

  const configuredDefaultId = textValue(config.default_channel);
  const defaultChannelId = channels.some((channel) => channel.id === configuredDefaultId)
    ? configuredDefaultId
    : channels[0].id;

  return { defaultChannelId, channels };
}

export function listImage2ChannelOptions(config: Image2ChannelsConfig): Image2ChannelOption[] {
  return config.channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    provider: channel.provider,
    model: channel.model || "gpt-image-2",
  }));
}
