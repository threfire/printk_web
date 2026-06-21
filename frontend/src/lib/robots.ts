export type RobotRole = {
  id: string;
  shortName: string;
  name: string;
  role: string;
  group: string;
  focus: string;
  deliverable: string;
  overview: string;
  training: string[];
  archive: string[];
};

export const robotRoles: RobotRole[] = [
  {
    id: "hero",
    shortName: "英雄",
    name: "英雄兵种",
    role: "高能量机关与远距离打击",
    group: "机械组 / 电控组 / 视觉组",
    focus: "完成云台稳定、弹道补偿和装甲板识别链路联调。",
    deliverable: "射击精度记录、云台控制参数、视觉识别测试报告",
    overview: "英雄兵种承担高价值目标打击任务，页面集中展示云台、发射、识别和赛前检查资料。",
    training: ["云台稳定性训练", "弹道补偿测试", "装甲板识别联调"],
    archive: ["射击精度记录", "云台控制参数", "视觉识别测试报告"],
  },
  {
    id: "infantry",
    shortName: "步兵",
    name: "步兵兵种",
    role: "场地对抗与快速机动",
    group: "机械组 / 电控组 / 算法组",
    focus: "提升底盘响应、功率控制和自动巡航基础能力。",
    deliverable: "底盘调参表、功率曲线、机动测试复盘",
    overview: "步兵兵种承担常规对抗任务，页面集中展示底盘机动、功率控制和训练复盘资料。",
    training: ["底盘响应训练", "功率限制测试", "对抗路线复盘"],
    archive: ["底盘调参表", "功率曲线", "机动测试复盘"],
  },
  {
    id: "engineer",
    shortName: "工程",
    name: "工程兵种",
    role: "资源岛作业与补给支援",
    group: "机械组 / 电控组 / 运营组",
    focus: "围绕取放机构、补给路径和可靠性维护建立作业清单。",
    deliverable: "机构检查表、作业流程、备件与维修记录",
    overview: "工程兵种承担资源操作与支援任务，页面集中展示机构、流程和维护资料。",
    training: ["取放机构训练", "补给路径演练", "可靠性维护检查"],
    archive: ["机构检查表", "作业流程", "备件与维修记录"],
  },
  {
    id: "sentry",
    shortName: "哨兵",
    name: "哨兵兵种",
    role: "自动巡航与防区控制",
    group: "电控组 / 算法组 / 视觉组",
    focus: "建立导航、识别、避障和状态监控链路。",
    deliverable: "巡航路径记录、识别测试报告、异常状态清单",
    overview: "哨兵兵种承担自动巡航和防区控制任务，页面集中展示导航、识别和监控资料。",
    training: ["巡航路径训练", "避障策略测试", "状态监控复盘"],
    archive: ["巡航路径记录", "识别测试报告", "异常状态清单"],
  },
  {
    id: "drone",
    shortName: "无人机",
    name: "无人机兵种",
    role: "空中侦察与战术支援",
    group: "电控组 / 视觉组 / 算法组",
    focus: "维护飞控状态、图传链路和空中识别流程。",
    deliverable: "飞控参数、图传测试记录、任务流程表",
    overview: "无人机兵种承担空中侦察与支援任务，页面集中展示飞控、图传和任务流程资料。",
    training: ["飞控状态检查", "图传链路测试", "空中识别演练"],
    archive: ["飞控参数", "图传测试记录", "任务流程表"],
  },
  {
    id: "radar",
    shortName: "雷达",
    name: "雷达兵种",
    role: "全局感知与信息支援",
    group: "视觉组 / 算法组 / 运营组",
    focus: "维护场地感知、目标标注和信息同步流程。",
    deliverable: "标注数据、识别报告、信息同步记录",
    overview: "雷达兵种承担全局感知和信息支援任务，页面集中展示标注、识别和同步资料。",
    training: ["场地感知测试", "目标标注训练", "信息同步演练"],
    archive: ["标注数据", "识别报告", "信息同步记录"],
  },
  {
    id: "dart",
    shortName: "飞镖",
    name: "飞镖兵种",
    role: "定点发射与机构可靠性",
    group: "机械组 / 电控组 / 视觉组",
    focus: "完成发射机构、瞄准链路和赛前检查流程。",
    deliverable: "发射测试记录、机构检查表、瞄准参数",
    overview: "飞镖兵种承担定点发射任务，页面集中展示发射机构、瞄准链路和检查流程资料。",
    training: ["发射机构测试", "瞄准链路联调", "赛前流程检查"],
    archive: ["发射测试记录", "机构检查表", "瞄准参数"],
  },
];

export function getRobotRole(id: string) {
  return robotRoles.find((robot) => robot.id === id);
}
