"use client";

import Image from "next/image";
import { type PointerEvent, startTransition, useState } from "react";

export type HomeAwardItem = {
  title: string;
  meta: string;
  image?: {
    src: string;
    alt: string;
  };
};

type HomeAwardsCarouselProps = {
  awards: HomeAwardItem[];
};

function getAwardSlot(index: number, activeIndex: number, direction: 1 | -1, total: number) {
  const forward = (index - activeIndex + total) % total;
  const backward = (activeIndex - index + total) % total;

  if (forward === 0) {
    return "center";
  }

  if (backward === 1) {
    return "left";
  }

  if (forward === 1) {
    return "right";
  }

  if (direction === 1 && forward === 2) {
    return "enter-right";
  }

  if (direction === 1 && backward === 2) {
    return "exit-left";
  }

  if (direction === -1 && backward === 2) {
    return "enter-left";
  }

  if (direction === -1 && forward === 2) {
    return "exit-right";
  }

  return backward < forward ? "hidden-left" : "hidden-right";
}

export function HomeAwardsCarousel({ awards }: HomeAwardsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [dragStartX, setDragStartX] = useState<number | null>(null);

  if (!awards.length) {
    return null;
  }

  const goNext = () => {
    if (awards.length < 2) {
      return;
    }

    startTransition(() => {
      setDirection(1);
      setActiveIndex((current) => (current + 1) % awards.length);
    });
  };

  const goPrev = () => {
    if (awards.length < 2) {
      return;
    }

    startTransition(() => {
      setDirection(-1);
      setActiveIndex((current) => (current - 1 + awards.length) % awards.length);
    });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartX === null) {
      return;
    }

    const deltaX = event.clientX - dragStartX;
    setDragStartX(null);

    if (Math.abs(deltaX) < 42) {
      return;
    }

    if (deltaX < 0) {
      goNext();
      return;
    }

    goPrev();
  };

  return (
    <div
      className="home-awards-carousel"
      aria-label="奖项图片层叠轮播"
      onPointerDown={(event) => setDragStartX(event.clientX)}
      onPointerCancel={() => setDragStartX(null)}
      onPointerUp={handlePointerUp}
    >
      <button className="carousel-nav carousel-nav-prev home-awards-nav" type="button" aria-label="上一项荣誉" onClick={goPrev}>
        <span aria-hidden="true">&lsaquo;</span>
      </button>
      <button className="carousel-nav carousel-nav-next home-awards-nav" type="button" aria-label="下一项荣誉" onClick={goNext}>
        <span aria-hidden="true">&rsaquo;</span>
      </button>

      <div className="home-awards-stack" aria-live="polite">
        {awards.map((award, index) => (
          <article className="home-award-card" data-slot={getAwardSlot(index, activeIndex, direction, awards.length)} key={`${award.title}-${index}`}>
            {award.image ? (
              <div className="home-award-media">
                <Image src={award.image.src} alt={award.image.alt} width={720} height={440} sizes="(max-width: 768px) 74vw, 34rem" />
              </div>
            ) : (
              <div className="home-award-media" aria-hidden="true">
                <span>AWARD</span>
              </div>
            )}
            <div className="home-award-copy">
              <h3>{award.title}</h3>
              <p>{award.meta}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
