"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type TeamTrack = {
  title: string;
  src: string;
};

// 将音乐文件放入 public/team-music 后，在这里按播放顺序登记。
const tracks: TeamTrack[] = [
  { title: "你", src: "/team-music/you.mp3" },
  { title: "三分钟准备 BGM", src: "/team-music/robomaster-ready.mp4" },
  { title: "Summoning Glory", src: "/team-music/summoning-glory.mp4" },
  { title: "过场 1", src: "/team-music/robomaster-transition-1.mp4" },
  { title: "过场音乐", src: "/team-music/robomaster-transition-3.mp4" },
];

export function TeamEmblemPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const continuePlayingRef = useRef(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTrack = tracks[currentIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || !continuePlayingRef.current) return;

    const removeUnlockListeners = () => {
      document.removeEventListener("pointerdown", attemptPlayback);
      document.removeEventListener("keydown", attemptPlayback);
    };
    const attemptPlayback = () => {
      audio.play().then(() => {
        setIsPlaying(true);
        removeUnlockListeners();
      }).catch(() => setIsPlaying(false));
    };

    attemptPlayback();
    document.addEventListener("pointerdown", attemptPlayback, { once: true });
    document.addEventListener("keydown", attemptPlayback, { once: true });

    return removeUnlockListeners;
  }, [currentIndex, currentTrack]);

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      continuePlayingRef.current = false;
      audio.pause();
      setIsPlaying(false);
      return;
    }

    continuePlayingRef.current = true;
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }

  function changeTrack(offset: number) {
    if (!tracks.length) return;

    continuePlayingRef.current = isPlaying || continuePlayingRef.current;
    setCurrentIndex((index) => (index + offset + tracks.length) % tracks.length);
  }

  const playbackLabel = currentTrack ? `《${currentTrack.title}》` : "《你》";

  return (
    <div className={`team-record-player${isPlaying ? " is-playing" : ""}`}>
      <button
        className="record-skip record-skip-prev"
        type="button"
        onClick={() => changeTrack(-1)}
        disabled={tracks.length < 2}
        aria-label="上一首"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M15.5 5.5 9 12l6.5 6.5M7 6v12" />
        </svg>
      </button>

      <button
        className="team-record"
        type="button"
        onClick={togglePlayback}
        disabled={!currentTrack}
        aria-label={currentTrack ? (isPlaying ? "暂停音乐" : "播放音乐") : "音乐待添加"}
      >
        <span className="record-grooves" aria-hidden="true" />
        <Image className="emblem-image" src="/team-logo.jpg" alt="PRINTK 战队徽" width={360} height={360} priority />
        <span className="record-spindle" aria-hidden="true" />
      </button>

      <Image
        className="record-player-overlay"
        src="/team-record-player-overlay-flat-v2.png"
        alt=""
        width={1254}
        height={1254}
        aria-hidden="true"
        priority
      />

      <button
        className="record-skip record-skip-next"
        type="button"
        onClick={() => changeTrack(1)}
        disabled={tracks.length < 2}
        aria-label="下一首"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="m8.5 5.5 6.5 6.5-6.5 6.5M17 6v12" />
        </svg>
      </button>

      <p className="record-track-label" title={playbackLabel}>{playbackLabel}</p>

      {currentTrack ? (
        <audio
          ref={audioRef}
          src={currentTrack.src}
          autoPlay
          preload="metadata"
          loop
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setIsPlaying(false)}
        />
      ) : null}
    </div>
  );
}
