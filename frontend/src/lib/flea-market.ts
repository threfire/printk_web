export type FleaMarketItem = {
  id: string;
  name: string;
  imageSrc: string;
  imageAlt: string;
  owner: string;
  team: string;
  location: string;
  status: string;
  postedAt: string;
  summary: string;
  detail: string;
  contact: string;
  tags: string[];
};

export const fleaMarketItems: FleaMarketItem[] = [
  {
    id: "debug-cart-frame",
    name: "调试小车底盘框架",
    imageSrc: "/robots/engineering-robot.png",
    imageAlt: "调试小车底盘框架",
    owner: "机械组 陈同学",
    team: "机械组",
    location: "实验室 A 区货架",
    status: "可联系流转",
    postedAt: "2026-07-03",
    summary: "适合做传感器支架、线束走线和小型运动验证，随物品附一套固定螺丝。",
    detail:
      "该底盘来自上一轮调试件整理，主体结构完整，轮组和安装孔位保留。适合队内做低速移动测试、线束布置样件或临时展示件，取用前请先联系发布人确认当前存放状态。",
    contact: "企业微信：机械组 陈同学",
    tags: ["底盘", "调试", "结构件"],
  },
  {
    id: "vision-light-board",
    name: "视觉补光测试板",
    imageSrc: "/home-carousel/team-03.jpeg",
    imageAlt: "视觉补光测试板",
    owner: "视觉组 林同学",
    team: "视觉组",
    location: "实验室 B 区视觉柜",
    status: "可联系流转",
    postedAt: "2026-07-02",
    summary: "用于相机曝光、识别阈值和夜间场景补光测试，附常用连接线。",
    detail:
      "补光测试板适合视觉成员做识别环境验证，也可以给电控成员做供电稳定性联调。物品当前放在视觉柜第二层，使用后请按原位置归还并在群内同步状态。",
    contact: "企业微信：视觉组 林同学",
    tags: ["视觉", "补光", "测试"],
  },
  {
    id: "power-module-box",
    name: "电源模块收纳盒",
    imageSrc: "/home-carousel/team-08.png",
    imageAlt: "电源模块收纳盒",
    owner: "电控组 王同学",
    team: "电控组",
    location: "实验室 C 区电控桌",
    status: "可联系流转",
    postedAt: "2026-06-30",
    summary: "收纳盒内含空置隔板和标签位，适合整理调试用模块与线材。",
    detail:
      "收纳盒用于队内闲置模块分类整理，隔板可调整，外侧标签位已经预留。发布人希望优先给需要整理调试台面的成员使用，使用位置变更后请同步给电控组。",
    contact: "企业微信：电控组 王同学",
    tags: ["电控", "收纳", "模块"],
  },
  {
    id: "training-target-panel",
    name: "训练靶板展示件",
    imageSrc: "/home-carousel/team-12.jpeg",
    imageAlt: "训练靶板展示件",
    owner: "运营组 周同学",
    team: "运营组",
    location: "训练场边柜",
    status: "可联系流转",
    postedAt: "2026-06-28",
    summary: "适合活动讲解、训练布置和新队员认知展示，板面状态完整。",
    detail:
      "训练靶板展示件来自活动物资整理，外观保持完整，适合做讲解道具、训练场布置或招新展示。借走后请记录使用场景，方便后续活动继续调用。",
    contact: "企业微信：运营组 周同学",
    tags: ["展示", "训练", "活动"],
  },
];

export function getFleaMarketItem(itemId: string) {
  return fleaMarketItems.find((item) => item.id === itemId);
}
