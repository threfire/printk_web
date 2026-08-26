"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type TeamTrack = {
  title: string;
  artist: string;
  src: string;
};

// 将音乐文件放入 public/team-music 后，在这里按播放顺序登记。
const tracks: TeamTrack[] = [];

export function TeamEmblemPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const continuePlayingRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const currentTrack = tracks[currentIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || !continuePlayingRef.current) return;

    continuePlayingRef.current = false;
    audio.play().catch(() => {
      setIsPlaying(false);
      setHasPlaybackError(true);
    });
  }, [currentIndex, currentTrack]);

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    setHasPlaybackError(false);
    audio.play().then(() => setIsPlaying(true)).catch(() => setHasPlaybackError(true));
  }

  function changeTrack(offset: number) {
    if (!tracks.length) return;

    continuePlayingRef.current = isPlaying;
    setHasPlaybackError(false);
    setCurrentIndex((index) => (index + offset + tracks.length) % tracks.length);
  }

  function playNextTrack() {
    if (tracks.length < 2) {
      setIsPlaying(false);
      return;
    }

    continuePlayingRef.current = true;
    setCurrentIndex((index) => (index + 1) % tracks.length);
  }

  const playbackLabel = currentTrack
    ? hasPlaybackError
      ? "音乐文件暂时无法播放"
      : `${currentTrack.title} · ${currentTrack.artist}`
    : "音乐待添加";

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
        src="/team-record-player-overlay.png"
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
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={playNextTrack}
          onError={() => {
            setIsPlaying(false);
            setHasPlaybackError(true);
          }}
        />
      ) : null}
    </div>
  );
}
