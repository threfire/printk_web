"use client";

import Image from "next/image";
import { type FormEvent, startTransition, useEffect, useState } from "react";

type CarouselImage = {
  imageKey: string;
  src: string;
  alt: string;
};

type CarouselQuote = {
  text: string;
  source: string;
};

type HomeCarouselProps = {
  images: CarouselImage[];
  accountName?: string;
  enableInteractive?: boolean;
};

type DanmakuMessage = {
  id: string;
  imageKey?: string;
  imageSrc?: string;
  authorAccount?: string;
  authorName?: string;
  text: string;
  track: number;
  color: string;
  createdAt: number;
  duration: number;
  delay: number;
};

type DanmakuResponse = {
  messages?: Array<Partial<DanmakuMessage> & { imageKey?: string; imageSrc?: string }>;
};

const AUTOPLAY_DELAY_MS = 5000;
const DANMAKU_REFRESH_MS = 4000;
const DANMAKU_TRACKS = 7;
const DANMAKU_COLOR = "#ffffff";

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

  const messages = value
    .filter((item): item is DanmakuMessage => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const message = item as Partial<DanmakuMessage>;
      return (
        typeof message.id === "string" &&
        typeof message.text === "string" &&
        message.text.trim().length > 0
      );
    })
    .map((message, index) => ({
      id: message.id,
      imageKey: message.imageKey,
      imageSrc: message.imageSrc,
      authorAccount: typeof message.authorAccount === "string" ? message.authorAccount : "",
      authorName: typeof message.authorName === "string" ? message.authorName : "",
      text: message.text.slice(0, 48),
      track: Number.isFinite(message.track) ? Math.abs(Math.trunc(message.track)) % DANMAKU_TRACKS : index % DANMAKU_TRACKS,
      color: DANMAKU_COLOR,
      createdAt: Number.isFinite(message.createdAt) ? message.createdAt : Date.now(),
      duration: 36,
      delay: 0,
    }));

  return messages.slice(-(DANMAKU_TRACKS * 3)).map((message, index) => ({
    ...message,
    track: index % DANMAKU_TRACKS,
    delay: -(Math.floor(index / DANMAKU_TRACKS) * 12 + (index % DANMAKU_TRACKS) * 0.8),
  }));
}

async function fetchDanmakuMessages() {
  const response = await fetch("/api/homepage/danmaku", { cache: "no-store" });
  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as DanmakuResponse;
  return messageList(body.messages);
}

export function HomeQuoteCarousel({ quotes }: { quotes: CarouselQuote[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || quotes.length < 2) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      startTransition(() => {
        setActiveIndex((current) => (current + 1) % quotes.length);
      });
    }, AUTOPLAY_DELAY_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [paused, quotes.length]);

  if (!quotes.length) {
    return null;
  }

  return (
    <section className="quote-carousel" aria-label="RoboMaster 赛事文案" aria-live="polite" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="quote-carousel-track">
        {quotes.map((quote, index) => (
          <figure className="quote-slide" data-active={index === activeIndex ? "true" : "false"} key={quote.text}>
            <blockquote>{quote.text}</blockquote>
            <figcaption>{quote.source}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function HomeCarousel({ images, accountName = "", enableInteractive = true }: HomeCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const [danmakuEnabled, setDanmakuEnabled] = useState(true);
  const [danmakuMessages, setDanmakuMessages] = useState<DanmakuMessage[]>([]);
  const [danmakuDraft, setDanmakuDraft] = useState("");
  const [danmakuNotice, setDanmakuNotice] = useState("");
  const activeImage = images[activeIndex];

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
    if (!enableInteractive) {
      return undefined;
    }

    let active = true;
    const refresh = () => {
      void fetchDanmakuMessages()
        .then((messages) => {
          if (!active || !messages) {
            return;
          }

          setDanmakuMessages(messages);
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
  }, [enableInteractive]);

  if (images.length === 0) {
    return null;
  }

  const sendDanmaku = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDanmakuNotice("");

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
        body: JSON.stringify({ imageKey: activeImage.imageKey, imageSrc: activeImage.src, text, authorAccount: accountName }),
      });
      if (!response.ok) {
        setDanmakuNotice("弹幕提交失败，请稍后重试");
        return;
      }
      setDanmakuDraft("");
      setDanmakuEnabled(true);
      setDanmakuNotice("弹幕已提交，审核通过后显示");
    } catch {
      setDanmakuNotice("弹幕提交失败，请稍后重试");
      return;
    }
  };

  return (
    <div className="home-carousel-stack" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
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
          </div>
        ))}
        {enableInteractive && danmakuMessages.length ? (
          <div className="danmaku-stage" data-enabled={danmakuEnabled ? "true" : "false"} aria-hidden="true">
            {danmakuMessages.map((message) => (
              <span
                className="danmaku-item"
                key={message.id}
                style={{
                  top: `${0.9 + message.track * 2.35}rem`,
                  color: message.color,
                  animationDuration: `${message.duration}s`,
                  animationDelay: `${message.delay}s`,
                }}
              >
                {message.authorName ? `${message.authorName}：${message.text}` : message.text}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {enableInteractive ? <form className="danmaku-panel" onSubmit={sendDanmaku}>
        <button
          className="danmaku-toggle"
          type="button"
          aria-pressed={danmakuEnabled}
          onClick={() => setDanmakuEnabled((current) => !current)}
        >
          {danmakuEnabled ? "弹幕开" : "弹幕关"}
        </button>
        <input
          aria-label="给首页轮播发送弹幕"
          maxLength={48}
          placeholder="请发弹幕留下你想说的话吧 (｡･ω･｡)ﾉ♡"
          value={danmakuDraft}
          onChange={(event) => setDanmakuDraft(event.target.value)}
        />
        <button className="button danmaku-send" type="submit">
          发送
        </button>
      </form> : null}
      {danmakuNotice ? <p className="message danmaku-notice" aria-live="polite">{danmakuNotice}</p> : null}
    </div>
  );
}
