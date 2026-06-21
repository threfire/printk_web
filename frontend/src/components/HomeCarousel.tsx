"use client";

import Image from "next/image";
import { startTransition, useEffect, useEffectEvent, useState } from "react";

type CarouselImage = {
  src: string;
  alt: string;
};

type HomeCarouselProps = {
  images: CarouselImage[];
};

const AUTOPLAY_DELAY_MS = 5000;

function getSlot(index: number, activeIndex: number, direction: 1 | -1, total: number) {
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

export function HomeCarousel({ images }: HomeCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);

  const goNext = () => {
    if (images.length < 2) {
      return;
    }

    startTransition(() => {
      setDirection(1);
      setActiveIndex((current) => (current + 1) % images.length);
    });
  };

  const goPrev = () => {
    if (images.length < 2) {
      return;
    }

    startTransition(() => {
      setDirection(-1);
      setActiveIndex((current) => (current - 1 + images.length) % images.length);
    });
  };

  const autoplayNext = useEffectEvent(() => {
    if (images.length < 2) {
      return;
    }

    startTransition(() => {
      setDirection(1);
      setActiveIndex((current) => (current + 1) % images.length);
    });
  });

  useEffect(() => {
    if (paused || images.length < 2) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      autoplayNext();
    }, AUTOPLAY_DELAY_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [images.length, paused]);

  if (images.length === 0) {
    return null;
  }

  return (
    <section
      className="image-carousel"
      aria-label="战队图片展示"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <button className="carousel-nav carousel-nav-prev" type="button" aria-label="上一张" onClick={goPrev}>
        <span aria-hidden="true">‹</span>
      </button>
      <button className="carousel-nav carousel-nav-next" type="button" aria-label="下一张" onClick={goNext}>
        <span aria-hidden="true">›</span>
      </button>
      {images.map((image, index) => (
        <div className="carousel-card" data-slot={getSlot(index, activeIndex, direction, images.length)} key={image.src}>
          <Image
            className="carousel-image"
            src={image.src}
            alt={image.alt}
            width={1920}
            height={1080}
            priority={index === 0}
            sizes="(max-width: 1180px) 98vw, 1150px"
          />
        </div>
      ))}
    </section>
  );
}
