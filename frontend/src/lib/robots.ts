export type RobotMilestone = {
  title: string;
  date: string;
  summary: string;
  done: boolean;
  owner: string;
};

export type RobotMonthlyTask = {
  title: string;
  node: string;
  owner: string;
  done: boolean;
};

export type RobotWeeklyUpdate = {
  week: string;
  progress: string;
  owner: string;
};

export type RobotRole = {
  id: string;
  shortName: string;
  name: string;
  role: string;
  group: string;
  focus: string;
  deliverable: string;
  overview: string;
  seasonLead: string;
  mechanicalLead: string;
  electricalLead: string;
  algorithmLead: string;
  seasonNeeds: string[];
  acceptanceGoals: string[];
  training: string[];
  archive: string[];
  milestones: RobotMilestone[];
  monthlyTasks: RobotMonthlyTask[];
  weeklyUpdates: RobotWeeklyUpdate[];
};

export const robotRoles: RobotRole[] = [
  {
    id: "swerve-hero",
    shortName: "舵轮英雄",
    name: "舵轮英雄",
    role: "高机动远距离打击",
    group: "机械组 / 电控组 / 视觉组",
    focus: "完成舵轮底盘稳定、云台跟随、弹道补偿和装甲板识别联调。",
    deliverable: "舵轮参数、射击精度记录、云台控制参数、视觉识别报告",
    overview: "舵轮英雄承担高价值目标打击任务，核心关注底盘响应、云台稳定和远距离命中率。",
    seasonLead: "英雄组长",
    mechanicalLead: "机械英雄负责人",
    electricalLead: "电控英雄负责人",
    algorithmLead: "视觉识别负责人",
    seasonNeeds: ["舵轮底盘稳定", "远距离发射链路", "云台视觉闭环"],
    acceptanceGoals: ["连续运行 20 分钟", "关键距离命中率达标", "赛前检查表闭环"],
    training: ["舵轮底盘响应", "云台稳定性训练", "弹道补偿测试"],
    archive: ["射击精度记录", "云台控制参数", "视觉识别测试报告"],
    milestones: [
      { title: "底盘样机", date: "第 2 周", summary: "完成舵轮模组装车和基础运动控制。", done: true, owner: "机械组" },
      { title: "云台闭环", date: "第 5 周", summary: "完成云台跟随、限位保护和基础参数整定。", done: true, owner: "电控组" },
      { title: "射击联调", date: "第 8 周", summary: "完成供弹、发射、识别链路联动测试。", done: false, owner: "英雄组" },
      { title: "整车验收", date: "第 12 周", summary: "完成连续运行、命中率和维护清单验收。", done: false, owner: "组长" },
    ],
    monthlyTasks: [
      { title: "舵轮零位校准", node: "底盘调试", owner: "电控组", done: true },
      { title: "发射机构耐久", node: "机构验证", owner: "机械组", done: false },
      { title: "装甲板识别回归", node: "视觉联调", owner: "视觉组", done: false },
    ],
    weeklyUpdates: [
      { week: "本周", progress: "完成舵轮底盘基本运动和云台初始参数。", owner: "英雄组长" },
      { week: "下周", progress: "进入发射机构稳定性测试和视觉数据采集。", owner: "机械组 / 视觉组" },
    ],
  },
  {
    id: "omni-hero",
    shortName: "全向英雄",
    name: "全向英雄",
    role: "轻量化远距离输出",
    group: "机械组 / 电控组 / 视觉组",
    focus: "围绕全向底盘、发射稳定和快速维护建立可靠训练版本。",
    deliverable: "全向底盘参数、发射曲线、维护检查表",
    overview: "全向英雄用于快速迭代远距离输出方案，重点压缩维护时间并提高调试效率。",
    seasonLead: "英雄组长",
    mechanicalLead: "机械英雄负责人",
    electricalLead: "电控英雄负责人",
    algorithmLead: "视觉识别负责人",
    seasonNeeds: ["全向底盘可维护", "发射一致性", "视觉辅助瞄准"],
    acceptanceGoals: ["维护流程 10 分钟内完成", "发射速度稳定", "识别链路稳定输出"],
    training: ["底盘机动训练", "发射一致性测试", "维护流程演练"],
    archive: ["底盘参数表", "发射曲线", "维护记录"],
    milestones: [
      { title: "底盘复装", date: "第 1 周", summary: "完成全向轮底盘复装和线束整理。", done: true, owner: "机械组" },
      { title: "发射稳定", date: "第 4 周", summary: "完成摩擦轮、拨弹和热管理验证。", done: false, owner: "机械组" },
      { title: "视觉辅助", date: "第 7 周", summary: "接入识别结果并完成云台跟随测试。", done: false, owner: "视觉组" },
    ],
    monthlyTasks: [
      { title: "底盘电机检查", node: "底盘维护", owner: "电控组", done: true },
      { title: "拨弹卡滞复盘", node: "发射维护", owner: "机械组", done: false },
      { title: "瞄准数据采集", node: "视觉训练", owner: "视觉组", done: false },
    ],
    weeklyUpdates: [
      { week: "本周", progress: "完成底盘线束整理和驱动测试。", owner: "电控组" },
      { week: "下周", progress: "集中处理拨弹卡滞和发射速度波动。", owner: "机械组" },
    ],
  },
  {
    id: "swerve-infantry",
    shortName: "舵轮步兵",
    name: "舵轮步兵",
    role: "高响应地面对抗",
    group: "机械组 / 电控组 / 算法组",
    focus: "提升舵轮响应、功率控制和对抗路线执行稳定性。",
    deliverable: "底盘调参表、功率曲线、对抗复盘记录",
    overview: "舵轮步兵承担主力对抗任务，核心关注机动、功率和可靠性。",
    seasonLead: "步兵组长",
    mechanicalLead: "机械步兵负责人",
    electricalLead: "电控步兵负责人",
    algorithmLead: "算法机动负责人",
    seasonNeeds: ["舵轮响应", "功率控制", "对抗可靠性"],
    acceptanceGoals: ["连续对抗训练稳定", "功率曲线达标", "底盘故障闭环"],
    training: ["底盘响应训练", "功率限制测试", "对抗路线复盘"],
    archive: ["底盘调参表", "功率曲线", "机动测试复盘"],
    milestones: [
      { title: "底盘闭环", date: "第 2 周", summary: "完成舵轮速度环和角度环基础调参。", done: true, owner: "电控组" },
      { title: "功率策略", date: "第 5 周", summary: "完成超级电容和功率限制策略联调。", done: false, owner: "电控组" },
      { title: "对抗验收", date: "第 9 周", summary: "完成连续对抗训练和故障复盘。", done: false, owner: "步兵组" },
    ],
    monthlyTasks: [
      { title: "角度环参数固化", node: "底盘闭环", owner: "电控组", done: true },
      { title: "功率保护测试", node: "功率策略", owner: "电控组", done: false },
      { title: "结构松动复检", node: "可靠性", owner: "机械组", done: false },
    ],
    weeklyUpdates: [
      { week: "本周", progress: "完成角度环参数固化和短时机动测试。", owner: "电控组" },
      { week: "下周", progress: "进入功率保护与连续对抗训练。", owner: "步兵组长" },
    ],
  },
  {
    id: "omni-infantry",
    shortName: "全向步兵",
    name: "全向步兵",
    role: "常规对抗与训练主车",
    group: "机械组 / 电控组 / 算法组",
    focus: "把全向底盘、发射机构和训练复盘做成稳定训练基线。",
    deliverable: "训练主车检查表、发射维护表、对抗复盘模板",
    overview: "全向步兵承担高频训练任务，强调易维护、易复盘和稳定上场。",
    seasonLead: "步兵组长",
    mechanicalLead: "机械步兵负责人",
    electricalLead: "电控步兵负责人",
    algorithmLead: "算法机动负责人",
    seasonNeeds: ["训练稳定性", "维护效率", "对抗数据沉淀"],
    acceptanceGoals: ["训练日稳定运行", "维护项可追踪", "复盘记录完整"],
    training: ["底盘机动训练", "发射链路维护", "对抗数据复盘"],
    archive: ["训练检查表", "发射维护记录", "复盘模板"],
    milestones: [
      { title: "训练基线", date: "第 1 周", summary: "完成全向步兵训练版本检查表。", done: true, owner: "步兵组" },
      { title: "发射维护", date: "第 4 周", summary: "固化发射机构维护流程和备件清单。", done: true, owner: "机械组" },
      { title: "数据复盘", date: "第 8 周", summary: "建立对抗训练数据记录模板。", done: false, owner: "算法组" },
    ],
    monthlyTasks: [
      { title: "训练车日检", node: "训练基线", owner: "机械组", done: true },
      { title: "发射热衰减测试", node: "发射维护", owner: "机械组", done: true },
      { title: "对抗轨迹整理", node: "数据复盘", owner: "算法组", done: false },
    ],
    weeklyUpdates: [
      { week: "本周", progress: "完成训练日检表和发射热衰减记录。", owner: "步兵组员" },
      { week: "下周", progress: "补齐对抗轨迹和故障标签。", owner: "算法组" },
    ],
  },
  {
    id: "swerve-sentry",
    shortName: "舵轮哨兵",
    name: "舵轮哨兵",
    role: "自主巡航与防区控制",
    group: "机械组 / 电控组 / 算法组",
    focus: "建立舵轮运动平台、导航定位、识别和状态监控链路。",
    deliverable: "巡航路径记录、识别测试报告、异常状态清单",
    overview: "舵轮哨兵承担自动巡航和防区控制任务，哨兵页面包含机械、电控、算法三组负责人。",
    seasonLead: "哨兵组长",
    mechanicalLead: "机械哨兵负责人",
    electricalLead: "电控哨兵负责人",
    algorithmLead: "算法哨兵负责人",
    seasonNeeds: ["自主巡航", "避障策略", "状态监控"],
    acceptanceGoals: ["巡航路线稳定", "避障触发有效", "异常状态可追溯"],
    training: ["巡航路径训练", "避障策略测试", "状态监控复盘"],
    archive: ["巡航路径记录", "识别测试报告", "异常状态清单"],
    milestones: [
      { title: "运动平台", date: "第 2 周", summary: "完成舵轮哨兵底盘闭环与定位接口。", done: true, owner: "电控组" },
      { title: "导航联调", date: "第 6 周", summary: "完成巡航路线、定位和避障联调。", done: false, owner: "算法组" },
      { title: "哨兵验收", date: "第 11 周", summary: "完成整机长时间巡航和异常恢复测试。", done: false, owner: "哨兵组" },
    ],
    monthlyTasks: [
      { title: "定位接口检查", node: "运动平台", owner: "电控组", done: true },
      { title: "巡航路线标注", node: "导航联调", owner: "算法组", done: false },
      { title: "异常日志整理", node: "状态监控", owner: "算法组", done: false },
    ],
    weeklyUpdates: [
      { week: "本周", progress: "完成定位接口检查和底盘基础巡航。", owner: "电控组" },
      { week: "下周", progress: "补齐巡航路线标注和异常日志字段。", owner: "算法组" },
    ],
  },
  {
    id: "mecanum-sentry",
    shortName: "麦轮哨兵",
    name: "麦轮哨兵",
    role: "低成本自主防区验证",
    group: "机械组 / 电控组 / 算法组",
    focus: "使用麦轮平台验证哨兵导航、识别、避障和防区策略。",
    deliverable: "麦轮底盘参数、导航脚本、策略验证记录",
    overview: "麦轮哨兵用于快速验证自动防区策略，帮助算法组缩短方案验证周期。",
    seasonLead: "哨兵组长",
    mechanicalLead: "机械哨兵负责人",
    electricalLead: "电控哨兵负责人",
    algorithmLead: "算法哨兵负责人",
    seasonNeeds: ["导航验证", "策略回放", "低成本维护"],
    acceptanceGoals: ["脚本可重复运行", "策略日志完整", "维护项闭环"],
    training: ["巡航脚本训练", "策略回放测试", "异常恢复演练"],
    archive: ["底盘参数", "导航脚本", "策略验证记录"],
    milestones: [
      { title: "平台复用", date: "第 1 周", summary: "完成麦轮底盘驱动与传感器检查。", done: true, owner: "电控组" },
      { title: "策略回放", date: "第 4 周", summary: "完成防区路线脚本和日志记录。", done: false, owner: "算法组" },
      { title: "迁移验证", date: "第 8 周", summary: "把有效策略迁移到舵轮哨兵。", done: false, owner: "哨兵组" },
    ],
    monthlyTasks: [
      { title: "底盘驱动复测", node: "平台复用", owner: "电控组", done: true },
      { title: "防区脚本编排", node: "策略回放", owner: "算法组", done: false },
      { title: "迁移参数整理", node: "迁移验证", owner: "哨兵组长", done: false },
    ],
    weeklyUpdates: [
      { week: "本周", progress: "完成麦轮底盘驱动复测。", owner: "电控组" },
      { week: "下周", progress: "开始防区脚本编排和日志格式统一。", owner: "算法组" },
    ],
  },
  {
    id: "wheel-leg-infantry",
    shortName: "轮腿步兵",
    name: "轮腿步兵",
    role: "复杂地形机动验证",
    group: "机械组 / 电控组 / 算法组",
    focus: "围绕轮腿机构、姿态控制和对抗机动完成样机验证。",
    deliverable: "轮腿结构记录、姿态控制参数、机动测试复盘",
    overview: "轮腿步兵承担新形态机动验证任务，重点在机构可靠性、姿态控制和训练安全边界。",
    seasonLead: "步兵组长",
    mechanicalLead: "机械轮腿负责人",
    electricalLead: "电控轮腿负责人",
    algorithmLead: "算法姿态负责人",
    seasonNeeds: ["轮腿机构可靠", "姿态控制稳定", "安全边界明确"],
    acceptanceGoals: ["站立行走稳定", "姿态保护有效", "测试记录完整"],
    training: ["轮腿站立测试", "姿态控制训练", "机动安全复盘"],
    archive: ["结构记录", "姿态参数", "机动测试复盘"],
    milestones: [
      { title: "机构样机", date: "第 3 周", summary: "完成轮腿机构样机和限位保护。", done: true, owner: "机械组" },
      { title: "姿态控制", date: "第 7 周", summary: "完成基础站立、行走和保护策略。", done: false, owner: "电控组" },
      { title: "机动验收", date: "第 12 周", summary: "完成复杂地形机动和安全边界验收。", done: false, owner: "轮腿组" },
    ],
    monthlyTasks: [
      { title: "限位结构复检", node: "机构样机", owner: "机械组", done: true },
      { title: "站立控制调参", node: "姿态控制", owner: "电控组", done: false },
      { title: "机动风险记录", node: "安全边界", owner: "算法组", done: false },
    ],
    weeklyUpdates: [
      { week: "本周", progress: "完成限位结构复检和站立参数初调。", owner: "机械组 / 电控组" },
      { week: "下周", progress: "进行低速行走和保护策略测试。", owner: "轮腿组长" },
    ],
  },
];

export function getRobotRole(id: string) {
  return robotRoles.find((robot) => robot.id === id);
}
