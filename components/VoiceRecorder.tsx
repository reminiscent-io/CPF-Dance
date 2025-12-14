'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

interface VoiceRecorderProps {
  onTranscriptReady: (html: string) => void
  disabled?: boolean
}

type RecordingState = 'idle' | 'recording' | 'processing'

export function VoiceRecorder({ onTranscriptReady, disabled = false }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      // Stop all media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setState('idle')
        setRecordingDuration(0)
        setError('Recording error occurred. Please try again.')
        // Clean up
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.onstop = async () => {
        try {
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop())

          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          await processAudio(audioBlob)
        } catch (err) {
          console.error('Error in onstop handler:', err)
          setState('idle')
          setRecordingDuration(0)
          setError('Failed to process recording. Please try again.')
        }
      }

      mediaRecorder.start(1000) // Collect data every second
      setState('recording')
      setRecordingDuration(0)

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)

    } catch (err) {
      console.error('Error accessing microphone:', err)
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.')
      } else {
        setError('Could not access microphone. Please check your device settings.')
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setState('processing')
    }
  }, [])

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    audioChunksRef.current = []
    setState('idle')
    setRecordingDuration(0)
  }, [])

  const processAudio = async (audioBlob: Blob) => {
    try {
      // Validate that we have audio data
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('No audio recorded. Please try again.')
      }

      // Check minimum audio size (at least 1KB)
      if (audioBlob.size < 1000) {
        throw new Error('Recording too short. Please speak for at least 1 second.')
      }

      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/voice-to-notes', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to process audio')
      }

      const result = await response.json()

      if (result.html) {
        onTranscriptReady(result.html)
        setError(null) // Clear any previous errors on success
      } else if (result.cleaned_notes) {
        // Convert markdown to basic HTML if needed
        const html = markdownToHtml(result.cleaned_notes)
        onTranscriptReady(html)
        setError(null) // Clear any previous errors on success
      } else {
        throw new Error('No transcription received. Please try again.')
      }

    } catch (err) {
      console.error('Error processing audio:', err)
      setError(err instanceof Error ? err.message : 'Failed to process voice note')
    } finally {
      setState('idle')
      setRecordingDuration(0)
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Simple markdown to HTML converter for common patterns
  const markdownToHtml = (markdown: string): string => {
    return markdown
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
      // Paragraphs (lines that aren't already wrapped)
      .split('\n\n')
      .map(para => {
        if (para.startsWith('<') || para.trim() === '') return para
        return `<p>${para.replace(/\n/g, '<br>')}</p>`
      })
      .join('\n')
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        {state === 'idle' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <MicrophoneIcon className="w-4 h-4" />
            Record Voice Note
          </Button>
        )}

        {state === 'recording' && (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-red-700">
                Recording... {formatDuration(recordingDuration)}
              </span>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={stopRecording}
              className="bg-red-600 hover:bg-red-700"
            >
              <StopIcon className="w-4 h-4 mr-1" />
              Stop
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelRecording}
            >
              Cancel
            </Button>
          </>
        )}

        {state === 'processing' && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg">
            <Spinner size="sm" />
            <span className="text-sm text-rose-700">
              Processing your voice note...
            </span>
          </div>
        )}
      </div>

      {state === 'idle' && (
        <p className="text-xs text-gray-500">
          Click to record, then speak your notes. Your voice will be transcribed and cleaned up automatically.
        </p>
      )}
    </div>
  )
}

function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  )
}
