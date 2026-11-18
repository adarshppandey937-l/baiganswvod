import Hls from 'hls.js';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Radio,
  RotateCcw,
  RotateCw,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/api';
import type { PlaybackSource } from '../types';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

function PlayerHeader({
  title,
  subtitle,
  onBack,
  isLive,
  badge,
}: {
  title: string;
  subtitle?: string | null;
  onBack?: () => void;
  isLive?: boolean;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 border-b border-stone-200 bg-stone-50">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 hover:text-stone-900 transition-colors shrink-0"
            aria-label="Close player"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <p className="sb-clamp-1 text-[10px] font-black uppercase tracking-widest text-purple-600">
            {subtitle || 'Now Playing'}
          </p>
          <h3 className="sb-clamp-1 text-sm font-bold text-stone-900">{title}</h3>
        </div>
      </div>
      {(isLive || badge) && (
        <span className="shrink-0 text-[9px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-200 px-2.5 py-1.5 rounded-md">
          {badge || 'Live'}
        </span>
      )}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors',
        active ? 'bg-purple-600 text-white' : 'text-white/90 hover:text-white hover:bg-white/10'
      )}
    >
      {children}
    </button>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl hover:bg-stone-100 text-xs font-bold text-stone-800 transition-colors"
    >
      <span className="flex items-center gap-2 text-stone-500">
        {icon}
        <span className="text-stone-800">{label}</span>
      </span>
      <span className="flex items-center gap-1 text-purple-600">
        {value}
        <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}

function SettingsSubHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-widest text-stone-500 hover:text-stone-900 border-b border-stone-200 mb-1"
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </button>
  );
}

function SettingsOption({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors',
        active ? 'bg-purple-600 text-white' : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
      )}
    >
      {label}
    </button>
  );
}

export function VideoPlayer({
  source,
  sources,
  onSourceChange,
  title,
  subtitle,
  isLive,
  poster,
  onBack,
}: {
  source: PlaybackSource;
  sources: PlaybackSource[];
  onSourceChange?: (s: PlaybackSource) => void;
  title: string;
  subtitle?: string | null;
  isLive?: boolean;
  poster?: string;
  onBack?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [levels, setLevels] = useState<Array<{ index: number; label: string }>>([]);
  const [qualityIndex, setQualityIndex] = useState(-1);
  const [settingsTab, setSettingsTab] = useState<'main' | 'speed' | 'quality' | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const resetHideTimer = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (!videoRef.current?.paused) {
        setControlsVisible(false);
      }
    }, 2800);
  };

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.volume = volume;
      v.muted = muted;
      v.playbackRate = speed;
    }
  }, [volume, muted, speed, source.url]);

  useEffect(() => {
    if (source.kind === 'youtube') return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let networkRetries = 0;
    let mediaRetries = 0;

    setErrorMsg(null);
    setPlaying(false);
    setBuffering(true);
    setHasLoaded(false);
    setLevels([]);
    setQualityIndex(-1);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const attemptPlay = () => {
      video.play().catch(() => {
        if (!cancelled) setBuffering(false);
      });
    };

    const startHls = (useWorker: boolean) => {
      if (cancelled) return;
      let hls: Hls;
      try {
        hls = new Hls({
          enableWorker: useWorker,
          lowLatencyMode: Boolean(isLive),
          maxBufferLength: 45,
          maxMaxBufferLength: 120,
          fragLoadingMaxRetry: 4,
          manifestLoadingMaxRetry: 3,
        });
      } catch {
        if (useWorker) {
          startHls(false);
          return;
        }
        setErrorMsg('Video player failed to initialize.');
        setBuffering(false);
        return;
      }

      hlsRef.current = hls;
      hls.loadSource(source.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (cancelled) return;
        setLevels(
          (data.levels || []).map((lvl, idx) => ({
            index: idx,
            label: lvl.height
              ? `${lvl.height}p`
              : `${Math.round((lvl.bitrate || 0) / 1000)}kbps`,
          }))
        );
        setHasLoaded(true);
        setBuffering(false);
        attemptPlay();
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        if (!cancelled) {
          setQualityIndex(hls.autoLevelEnabled ? -1 : data.level);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (cancelled || !data.fatal) return;

        if (useWorker && String(data.details || '').toLowerCase().includes('worker')) {
          hls.destroy();
          hlsRef.current = null;
          startHls(false);
          return;
        }

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (
            data.details !== Hls.ErrorDetails.MANIFEST_LOAD_ERROR &&
            networkRetries < 2
          ) {
            networkRetries += 1;
            hls.startLoad();
            return;
          }
          setErrorMsg('Unable to load video stream. Try another quality or retry.');
          setBuffering(false);
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetries < 2) {
          mediaRetries += 1;
          hls.recoverMediaError();
          return;
        }

        setErrorMsg('Playback failed for this video.');
        setBuffering(false);
      });
    };

    if (source.kind === 'hls') {
      if (Hls.isSupported()) {
        startHls(true);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = source.url;
        video.load();
        attemptPlay();
      } else {
        setErrorMsg('HLS playback is not supported in this browser.');
        setBuffering(false);
      }
    } else {
      video.src = source.url;
      video.load();
      attemptPlay();
    }

    const onPlay = () => {
      setPlaying(true);
      setBuffering(false);
      setHasLoaded(true);
    };
    const onPause = () => {
      setPlaying(false);
      setControlsVisible(true);
    };
    const onEnded = () => {
      setPlaying(false);
      setBuffering(false);
      setControlsVisible(true);
    };
    const onWaiting = () => setBuffering(true);
    const onReady = () => {
      setBuffering(false);
      setHasLoaded(true);
    };
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBufferedEnd(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onDurationChange = () => {
      if (Number.isFinite(video.duration)) setDuration(video.duration);
    };
    const onError = () => {
      setErrorMsg('Playback failed for this source.');
      setBuffering(false);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('playing', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('suspend', onReady);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('error', onError);

    return () => {
      cancelled = true;
      video.removeEventListener('play', onPlay);
      video.removeEventListener('playing', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('suspend', onReady);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('error', onError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [source.url, source.kind, isLive]);

  useEffect(() => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = qualityIndex;
    }
  }, [qualityIndex]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      setBuffering(true);
      v.play()
        .then(() => {
          setBuffering(false);
        })
        .catch(() => {
          setBuffering(false);
        });
    } else {
      v.pause();
    }
    resetHideTimer();
  };

  const skip = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration || v.duration || 0, v.currentTime + delta));
    resetHideTimer();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
  };

  const togglePiP = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (v.requestPictureInPicture) {
        await v.requestPictureInPicture();
      }
    } catch {
      // ignore PiP errors
    }
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // ignore fullscreen errors
    }
  };

  const getSeekTime = (clientX: number): number => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect || !duration) return 0;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  if (source.kind === 'youtube') {
    return (
      <div className="liquid-glass rounded-3xl overflow-hidden">
        <PlayerHeader
          title={title}
          subtitle={subtitle}
          onBack={onBack}
          isLive={isLive}
          badge="YouTube"
        />
        <div className="relative w-full bg-black" style={{ paddingTop: '56.25%' }}>
          <iframe
            src={source.url}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>
      </div>
    );
  }

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : Volume2;

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      className="liquid-glass rounded-3xl overflow-hidden"
    >
      <PlayerHeader title={title} subtitle={subtitle} onBack={onBack} isLive={isLive} />

      <div className="relative w-full bg-black select-none" style={{ paddingTop: '56.25%' }}>
        <video
          ref={videoRef}
          poster={poster || undefined}
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-contain"
          onClick={togglePlay}
        />

        {buffering && !errorMsg && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <LoaderCircle className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-4 text-center bg-black/80 backdrop-blur-sm">
            <AlertTriangle className="w-10 h-10 text-red-400" />
            <p className="text-sm text-stone-200 font-semibold max-w-md">{errorMsg}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => {
                  setErrorMsg(null);
                  setBuffering(true);
                  const hls = hlsRef.current;
                  const v = videoRef.current;
                  if (hls) {
                    hls.startLoad();
                    v?.play().catch(() => setBuffering(false));
                  } else if (v) {
                    v.load();
                    v.play().catch(() => setBuffering(false));
                  }
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors"
              >
                Retry
              </button>
              {sources.length > 1 && onSourceChange && (
                <button
                  onClick={() => {
                    const idx = sources.findIndex((s) => s.url === source.url);
                    const next = sources[(idx + 1) % sources.length];
                    if (next) onSourceChange(next);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                >
                  Try other quality
                </button>
              )}
            </div>
          </div>
        )}

        <AnimatePresence>
          {!playing && !errorMsg && (!buffering || hasLoaded) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={togglePlay}
              aria-label="Play"
              className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-purple-600/90 hover:bg-purple-500 border border-purple-300/40 shadow-[0_0_40px_rgba(168,85,247,0.5)] flex items-center justify-center transition-colors z-10"
            >
              <Play className="w-9 h-9 text-white fill-white ml-1" />
            </motion.button>
          )}
        </AnimatePresence>

        {isLive && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-red-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-red-400/50">
            <Radio className="w-3 h-3 sb-live-dot" /> Live
          </div>
        )}

        <AnimatePresence>
          {(controlsVisible || !playing || settingsTab) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10 px-3 sm:px-4 pb-2"
            >
              <div
                ref={progressRef}
                onPointerDown={(e) => {
                  const v = videoRef.current;
                  if (!v || !duration) return;
                  const t = getSeekTime(e.clientX);
                  v.currentTime = t;
                  setCurrentTime(t);
                  const onMove = (ev: PointerEvent) => {
                    const nt = getSeekTime(ev.clientX);
                    v.currentTime = nt;
                    setCurrentTime(nt);
                  };
                  const onUp = () => {
                    window.removeEventListener('pointermove', onMove);
                    window.removeEventListener('pointerup', onUp);
                  };
                  window.addEventListener('pointermove', onMove);
                  window.addEventListener('pointerup', onUp);
                }}
                onMouseMove={(e) => setHoverTime(getSeekTime(e.clientX))}
                onMouseLeave={() => setHoverTime(null)}
                className="relative h-4 flex items-center cursor-pointer group/bar mb-1"
                role="slider"
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(currentTime)}
              >
                <div className="relative w-full h-1.5 rounded-full bg-white/20 overflow-visible">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-white/30"
                    style={{ width: `${bufferedPct}%` }}
                  />
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400 shadow-[0_0_10px_rgba(168,85,247,0.6)]"
                    style={{ width: `${progressPct}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity"
                    style={{ left: `${progressPct}%` }}
                  />
                  {hoverTime !== null && duration > 0 && (
                    <div
                      className="absolute -top-8 -translate-x-1/2 bg-black/85 backdrop-blur px-2 py-1 rounded-md text-[10px] font-bold text-white border border-white/15 pointer-events-none"
                      style={{ left: `${(hoverTime / duration) * 100}%` }}
                    >
                      {formatClock(hoverTime)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-1 sm:gap-2">
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <IconButton onClick={togglePlay} label={playing ? 'Pause' : 'Play'}>
                    {playing ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current" />
                    )}
                  </IconButton>
                  <IconButton onClick={() => skip(-10)} label="Back 10s">
                    <RotateCcw className="w-4 h-4" />
                  </IconButton>
                  <IconButton onClick={() => skip(10)} label="Forward 10s">
                    <RotateCw className="w-4 h-4" />
                  </IconButton>
                  <div className="flex items-center group/vol">
                    <IconButton onClick={toggleMute} label="Mute">
                      <VolumeIcon className="w-5 h-5" />
                    </IconButton>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={muted ? 0 : volume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVolume(val);
                        setMuted(val === 0);
                        if (videoRef.current) {
                          videoRef.current.volume = val;
                          videoRef.current.muted = val === 0;
                        }
                      }}
                      className="w-0 group-hover/vol:w-20 sm:w-20 transition-all duration-300 accent-purple-500 h-1 cursor-pointer"
                      aria-label="Volume"
                    />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-white/90 tabular-nums ml-1">
                    {formatClock(currentTime)}
                    <span className="text-white/50">
                      {' '}
                      / {isLive ? 'LIVE' : formatClock(duration)}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-0.5 sm:gap-1">
                  <div className="relative">
                    <IconButton
                      onClick={() => setSettingsTab((prev) => (prev ? null : 'main'))}
                      label="Settings"
                      active={Boolean(settingsTab)}
                    >
                      <Settings
                        className={cn(
                          'w-5 h-5 transition-transform',
                          settingsTab && 'rotate-45'
                        )}
                      />
                    </IconButton>
                    <AnimatePresence>
                      {settingsTab && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-11 right-0 w-56 bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-2xl z-30"
                        >
                          {settingsTab === 'main' && (
                            <div className="p-1.5">
                              {levels.length > 0 && (
                                <SettingsRow
                                  icon={<Settings className="w-4 h-4" />}
                                  label="Quality"
                                  value={
                                    qualityIndex === -1
                                      ? 'Auto'
                                      : levels.find((l) => l.index === qualityIndex)?.label || 'Auto'
                                  }
                                  onClick={() => setSettingsTab('quality')}
                                />
                              )}
                              {sources.length > 1 && (
                                <SettingsRow
                                  icon={<Settings className="w-4 h-4" />}
                                  label="Source"
                                  value={source.label}
                                  onClick={() => setSettingsTab('quality')}
                                />
                              )}
                              <SettingsRow
                                icon={<Settings className="w-4 h-4" />}
                                label="Playback speed"
                                value={speed === 1 ? 'Normal' : `${speed}x`}
                                onClick={() => setSettingsTab('speed')}
                              />
                            </div>
                          )}

                          {settingsTab === 'speed' && (
                            <div className="p-1.5 max-h-56 overflow-y-auto sb-scroll">
                              <SettingsSubHeader
                                label="Speed"
                                onBack={() => setSettingsTab('main')}
                              />
                              {SPEED_OPTIONS.map((sp) => (
                                <SettingsOption
                                  key={sp}
                                  active={speed === sp}
                                  onClick={() => {
                                    setSpeed(sp);
                                    if (videoRef.current) videoRef.current.playbackRate = sp;
                                    setSettingsTab(null);
                                  }}
                                  label={sp === 1 ? 'Normal' : `${sp}x`}
                                />
                              ))}
                            </div>
                          )}

                          {settingsTab === 'quality' && (
                            <div className="p-1.5 max-h-56 overflow-y-auto sb-scroll">
                              <SettingsSubHeader
                                label="Quality"
                                onBack={() => setSettingsTab('main')}
                              />
                              {levels.length > 0 && (
                                <SettingsOption
                                  active={qualityIndex === -1}
                                  onClick={() => {
                                    setQualityIndex(-1);
                                    setSettingsTab(null);
                                  }}
                                  label="Auto"
                                />
                              )}
                              {levels.map((lvl) => (
                                <SettingsOption
                                  key={lvl.index}
                                  active={qualityIndex === lvl.index}
                                  onClick={() => {
                                    setQualityIndex(lvl.index);
                                    setSettingsTab(null);
                                  }}
                                  label={lvl.label}
                                />
                              ))}
                              {sources.length > 1 &&
                                sources
                                  .filter((s) => s.url !== source.url)
                                  .map((s, idx) => (
                                    <SettingsOption
                                      key={`${s.url}-${idx}`}
                                      active={false}
                                      onClick={() => {
                                        onSourceChange?.(s);
                                        setSettingsTab(null);
                                      }}
                                      label={`↳ ${s.label}`}
                                    />
                                  ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <IconButton onClick={togglePiP} label="Picture in picture">
                    <PictureInPicture2 className="w-5 h-5" />
                  </IconButton>
                  <IconButton onClick={toggleFullscreen} label="Fullscreen">
                    {isFullscreen ? (
                      <Minimize className="w-5 h-5" />
                    ) : (
                      <Maximize className="w-5 h-5" />
                    )}
                  </IconButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
