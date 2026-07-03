'use client'

import * as React from 'react'
import { Play, Pause, Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CallRecordingPlayerProps {
  recordingSid: string
}

function fmtTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function CallRecordingPlayer({ recordingSid }: CallRecordingPlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null)
  const pendingPlay = React.useRef(false)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [loaded, setLoaded] = React.useState(false)
  const [error, setError] = React.useState(false)

  const src = `/api/twilio/recording/${recordingSid}`
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) {
      // First click — mount the audio element, play once it's ready
      pendingPlay.current = true
      setLoaded(true)
      return
    }
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => setError(true))
    }
  }

  // Fires when enough data is buffered to start playback
  function handleCanPlay() {
    if (pendingPlay.current) {
      pendingPlay.current = false
      audioRef.current?.play().catch(() => setError(true))
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio || !duration) return
    audio.currentTime = (Number(e.target.value) / 100) * duration
  }

  if (error) {
    return <span className="text-xs text-muted-foreground">Recording unavailable</span>
  }

  return (
    <div className="flex items-center gap-2 min-w-[200px] max-w-[280px]">
      {loaded && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onCanPlay={handleCanPlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => { setIsPlaying(false); setCurrentTime(0) }}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
          onError={() => setError(true)}
        />
      )}

      <Headphones className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={togglePlay}
        title={isPlaying ? 'Pause' : 'Play recording'}
      >
        {isPlaying
          ? <Pause className="h-3.5 w-3.5" />
          : <Play className="h-3.5 w-3.5" />
        }
      </Button>

      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={progress}
        onChange={handleSeek}
        disabled={!loaded || duration === 0}
        className="flex-1 h-1 cursor-pointer accent-foreground disabled:opacity-40"
        aria-label="Seek recording"
      />

      <span className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap shrink-0">
        {fmtTime(currentTime)}
        {duration > 0 && ` / ${fmtTime(duration)}`}
      </span>
    </div>
  )
}
