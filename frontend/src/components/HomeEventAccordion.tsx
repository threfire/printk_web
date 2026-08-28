"use client";

import { useState } from "react";
import type { HomepageRecruitmentEvent } from "@/lib/api";

const fallbackEvents: HomepageRecruitmentEvent[] = [
  {
    id: "robomaster",
    name: "RoboMaster",
    kicker: "01 / 机甲大师",
    title: "RoboMaster 赛事介绍",
    description: "RoboMaster 机甲大师赛聚焦大学生机器人对抗，综合考验机械结构、电控编程、机器视觉与团队协作能力。",
  },
  {
    id: "robocon",
    name: "Robocon",
    kicker: "02 / 亚太大学生机器人大赛",
    title: "Robocon 赛事介绍",
    description: "Robocon 鼓励大学生围绕年度主题自主设计和制作机器人，在限定场地完成任务挑战，强调创意、工程实现与现场协作。",
  },
  {
    id: "robocup",
    name: "RoboCup",
    kicker: "03 / 世界机器人足球赛",
    title: "RoboCup 赛事介绍",
    description: "RoboCup 以全自主机器人足球为核心，训练感知、定位、路径规划和多机协同，让算法决策在真实赛场中持续进化。",
  },
];

export function HomeEventAccordion({ events: configuredEvents }: { events?: HomepageRecruitmentEvent[] }) {
  const events = configuredEvents?.length ? configuredEvents : fallbackEvents;
  const [activeId, setActiveId] = useState(events[0].id);
  const active = events.find((event) => event.id === activeId) ?? events[0];

  return (
    <div className="home-event-accordion">
      <div className="home-event-panels" role="tablist" aria-label="赛事选择">
        {events.map((event) => {
          const isActive = event.id === active.id;
          return (
            <button
              className={`home-event-panel${isActive ? " is-active" : ""}`}
              key={event.id}
              data-event={event.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(event.id)}
            >
              <span className="home-event-panel-label">{event.name}</span>
              <span className="home-event-panel-content" aria-hidden={!isActive}>
                <span>{event.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
