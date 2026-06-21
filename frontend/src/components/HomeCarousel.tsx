"use client";

import Image from "next/image";
import { type FormEvent, startTransition, useEffect, useState } from "react";

type CarouselImage = {
  src: string;
  alt: string;
};

type CarouselQuote = {
  text: string;
  source: string;
};

type HomeCarouselProps = {
  images: CarouselImage[];
  quotes?: CarouselQuote[];
};

type DanmakuMessage = {
  id: string;
  text: string;
  track: number;
  color: string;
  createdAt: number;
  duration: number;
  delay: number;
};

type DanmakuStore = Record<string, DanmakuMessage[]>;
type DanmakuResponse = {
  messages?: Array<Partial<DanmakuMessage> & { imageSrc?: string }>;
};

const AUTOPLAY_DELAY_MS = 5000;
const DANMAKU_REFRESH_MS = 4000;
const DANMAKU_TRACKS = 7;
const DANMAKU_COLORS = ["#ffffff", "#ffc857", "#37a9ff", "#32d583", "#ff8a9a"];

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

function messageList(value: unknown): DanmakuMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is DanmakuMessage => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const message = item as Partial<DanmakuMessage>;
      return typeof message.id === "string" && typeof message.text === "string" && message.text.trim().length > 0;
    })
    .map((message, index) => ({
      id: message.id,
      text: message.text.slice(0, 48),
      track: Number.isFinite(message.track) ? Math.abs(Math.trunc(message.track)) % DANMAKU_TRACKS : index % DANMAKU_TRACKS,
      color: typeof message.color === "string" ? message.color : DANMAKU_COLORS[index % DANMAKU_COLORS.length],
      createdAt: Number.isFinite(message.createdAt) ? message.createdAt : Date.now(),
      duration: Number.isFinite(message.duration) ? message.duration : 9 + (index % 4),
      delay: Number.isFinite(message.delay) ? message.delay : (index % 5) * 0.7,
    }));
}

async function fetchDanmakuMessages(imageSrc: string) {
  if (!imageSrc) {
    return null;
  }

  const response = await fetch(`/api/homepage/danmaku?image_src=${encodeURIComponent(imageSrc)}`, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as DanmakuResponse;
  return messageList(body.messages);
}

export function HomeCarousel({ images, quotes = [] }: HomeCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const [danmakuEnabled, setDanmakuEnabled] = useState(true);
  const [danmakuByImage, setDanmakuByImage] = useState<DanmakuStore>({});
  const [danmakuDraft, setDanmakuDraft] = useState("");
  const activeImage = images[activeIndex];
  const activeImageSrc = activeImage?.src ?? "";

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

  useEffect(() => {
    if (paused || images.length < 2) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      startTransition(() => {
        setDirection(1);
        setActiveIndex((current) => (current + 1) % images.length);
      });
    }, AUTOPLAY_DELAY_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [images.length, paused]);

  useEffect(() => {
    if (!activeImageSrc) {
      return undefined;
    }

    let active = true;
    const refresh = () => {
      void fetchDanmakuMessages(activeImageSrc)
        .then((messages) => {
          if (!active || !messages) {
            return;
          }

          setDanmakuByImage((current) => ({
            ...current,
            [activeImageSrc]: messages,
          }));
        })
        .catch(() => null);
    };

    const firstTimer = window.setTimeout(refresh, 0);
    const timer = window.setInterval(() => {
      refresh();
    }, DANMAKU_REFRESH_MS);

    return () => {
      active = false;
      window.clearTimeout(firstTimer);
      window.clearInterval(timer);
    };
  }, [activeImageSrc]);

  if (images.length === 0) {
    return null;
  }

  const activeQuoteIndex = quotes.length ? activeIndex % quotes.length : -1;
  const activeMessages = danmakuByImage[activeImageSrc] ?? [];

  const sendDanmaku = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = danmakuDraft.trim().slice(0, 48);

    if (!text) {
      return;
    }

    try {
      const response = await fetch("/api/homepage/danmaku", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageSrc: activeImage.src, text }),
      });
      if (!response.ok) {
        return;
      }
      const body = (await response.json()) as { message?: DanmakuMessage };
      const nextMessage = body.message;
      if (nextMessage) {
        setDanmakuByImage((current) => ({
          ...current,
          [activeImage.src]: [...(current[activeImage.src] ?? []), nextMessage],
        }));
      } else {
        void fetchDanmakuMessages(activeImage.src)
          .then((messages) => {
            if (messages) {
              setDanmakuByImage((current) => ({
                ...current,
                [activeImage.src]: messages,
              }));
            }
          })
          .catch(() => null);
      }
      setDanmakuDraft("");
      setDanmakuEnabled(true);
    } catch {
      return;
    }
  };

  return (
    <div className="home-carousel-stack" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {quotes.length ? (
        <section className="quote-carousel" aria-label="RoboMaster 赛事文案" aria-live="polite">
          <div className="quote-carousel-track">
            {quotes.map((quote, index) => (
              <figure className="quote-slide" data-active={index === activeQuoteIndex ? "true" : "false"} key={quote.text}>
                <blockquote>{quote.text}</blockquote>
                <figcaption>{quote.source}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <form className="danmaku-panel" onSubmit={sendDanmaku}>
        <button
          className="danmaku-toggle"
          type="button"
          aria-pressed={danmakuEnabled}
          onClick={() => setDanmakuEnabled((current) => !current)}
        >
          {danmakuEnabled ? "弹幕开" : "弹幕关"}
        </button>
        <input
          aria-label="给当前图片发送弹幕"
          maxLength={48}
          placeholder="请发弹幕留下你想说的话吧 (｡･ω･｡)ﾉ♡"
          value={danmakuDraft}
          onChange={(event) => setDanmakuDraft(event.target.value)}
        />
        <button className="button danmaku-send" type="submit">
          发送
        </button>
      </form>

      <section className="image-carousel" aria-label="战队图片展示">
        <button className="carousel-nav carousel-nav-prev" type="button" aria-label="上一张" onClick={goPrev}>
          <span aria-hidden="true">&lsaquo;</span>
        </button>
        <button className="carousel-nav carousel-nav-next" type="button" aria-label="下一张" onClick={goNext}>
          <span aria-hidden="true">&rsaquo;</span>
        </button>
        {images.map((image, index) => (
          <div className="carousel-card" data-slot={getSlot(index, activeIndex, direction, images.length)} key={image.src}>
            <Image
              className="carousel-image"
              src={image.src}
              alt={image.alt}
              width={1920}
              height={1080}
              loading={index < 3 ? "eager" : "lazy"}
              sizes="(max-width: 1180px) 98vw, 1150px"
            />
            {index === activeIndex && activeMessages.length ? (
              <div className="danmaku-stage" data-enabled={danmakuEnabled ? "true" : "false"} aria-hidden="true">
                {activeMessages.map((message) => (
                  <span
                    className="danmaku-item"
                    key={`${activeImage.src}-${message.id}`}
                    style={{
                      top: `${0.9 + message.track * 2.35}rem`,
                      color: message.color,
                      animationDuration: `${message.duration}s`,
                      animationDelay: `${message.delay}s`,
                    }}
                  >
                    {message.text}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}
