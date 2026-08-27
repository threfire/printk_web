"use client";

import { useRef, useState } from "react";

export function ProfilePhotoUpload() {
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setMessage("请选择个人照片");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/account/photo");
    xhr.setRequestHeader("Accept", "application/json");
    setProgress(0);
    setMessage("正在上传…");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
        setMessage("个人照片已上传");
        window.setTimeout(() => window.location.reload(), 300);
      } else {
        setProgress(null);
        setMessage("个人照片上传失败");
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setMessage("个人照片上传失败");
    };
    xhr.send(form);
  };

  return (
    <div className="form profile-photo-upload">
      <div className="field">
        <label htmlFor="profile-photo">个人照片</label>
        <input ref={inputRef} id="profile-photo" name="file" type="file" accept="image/jpeg,image/png,image/webp" />
        <small>支持 jpg、png、webp，大小不超过 8MB。</small>
      </div>
      <button className="ghost-button" type="button" onClick={submit} disabled={progress !== null && progress < 100}>上传照片</button>
      {progress !== null ? (
        <div className="profile-photo-progress" role="status">
          <div className="profile-photo-progress-bar" style={{ width: `${progress}%` }} />
          <span>{progress}%</span>
        </div>
      ) : null}
      {message ? <small>{message}</small> : null}
    </div>
  );
}
