"use client";

import Image from "next/image";
import { type FormEvent, startTransition, useEffect, useEffectEvent, useState } from "react";

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

const AUTOPLAY_DELAY_MS = 5000;
const DANMAKU_STORAGE_KEY = "printk-home-carousel-danmaku";
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

function readStoredDanmaku(): DanmakuStore {
  try {
    const raw = window.localStorage.getItem(DANMAKU_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([imageSrc, messages]) => [imageSrc, messageList(messages)]),
    );
  } catch {
    return {};
  }
}

export function HomeCarousel({ images, quotes = [] }: HomeCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const [danmakuEnabled, setDanmakuEnabled] = useState(true);
  const [danmakuByImage, setDanmakuByImage] = useState<DanmakuStore>({});
  const [danmakuDraft, setDanmakuDraft] = useState("");
  const [storageReady, setStorageReady] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      setDanmakuByImage(readStoredDanmaku());
      setStorageReady(true);
    }, 0);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    window.localStorage.setItem(DANMAKU_STORAGE_KEY, JSON.stringify(danmakuByImage));
  }, [danmakuByImage, storageReady]);

  if (images.length === 0) {
    return null;
  }

  const activeQuoteIndex = quotes.length ? activeIndex % quotes.length : -1;
  const activeImage = images[activeIndex];
  const activeMessages = danmakuByImage[activeImage.src] ?? [];

  const sendDanmaku = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = danmakuDraft.trim().slice(0, 48);

    if (!text) {
      return;
    }

    const messageIndex = activeMessages.length;
    const nextMessage: DanmakuMessage = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      track: messageIndex % DANMAKU_TRACKS,
      color: DANMAKU_COLORS[messageIndex % DANMAKU_COLORS.length],
      createdAt: Date.now(),
      duration: 8 + (messageIndex % 5),
      delay: 0,
    };

    setDanmakuByImage((current) => ({
      ...current,
      [activeImage.src]: [...(current[activeImage.src] ?? []), nextMessage],
    }));
    setDanmakuDraft("");
    setDanmakuEnabled(true);
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
          placeholder={`给第 ${activeIndex + 1} 张图片留言`}
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
