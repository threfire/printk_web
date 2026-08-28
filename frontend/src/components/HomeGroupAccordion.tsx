"use client";

import { useState } from "react";
import Image from "next/image";
import type { HomepageRecruitmentGroup } from "@/lib/api";

const icons = [
  "/recruitment-mechanical.jpg",
  "/recruitment-electrical.jpg",
  "/recruitment-hardware.jpg",
  "/recruitment-algorithm.jpg",
  "/recruitment-operations.jpg",
];

export function HomeGroupAccordion({ groups }: { groups: HomepageRecruitmentGroup[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeGroup = groups[activeIndex] ?? groups[0];

  if (!activeGroup) return null;

  return (
    <div className="home-group-accordion">
      <div className="home-group-panels" role="tablist" aria-label="招新组别选择">
        {groups.map((group, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              className={`home-group-panel${isActive ? " is-active" : ""}`}
              key={`${group.name}-${index}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveIndex(index)}
            >
              <Image src={icons[index % icons.length]} alt="" aria-hidden="true" width={112} height={112} />
              <span className="home-group-panel-name">{group.name}</span>
              <span className="home-group-panel-summary" aria-hidden={!isActive}>{group.summary}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
