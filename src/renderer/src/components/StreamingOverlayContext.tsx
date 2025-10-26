import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import StreamingOverlay from './StreamingOverlay'

interface OverlayState {
  visible: boolean
  title?: string
  content: string
  modelName?: string
  status?: 'streaming' | 'complete' | 'error'
  cancellable?: boolean
  onCancel?: () => void
}

interface StreamingOverlayAPI {
  show: (opts?: {
    title?: string
    modelName?: string
    cancellable?: boolean
    onCancel?: () => void
  }) => void
  update: (text: string, mode?: 'append' | 'replace') => void
  hide: () => void
  isVisible: boolean
}

const Ctx = createContext<StreamingOverlayAPI | null>(null)

export const StreamingOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<OverlayState>({ visible: false, content: '' })

  // Buffer writes to avoid excessive re-renders
  const bufferRef = useRef<string>('')
  const rafIdRef = useRef<number | null>(null)

  const flush = useCallback(() => {
    rafIdRef.current = null
    setState((prev) => ({ ...prev, content: bufferRef.current }))
  }, [])

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current != null) return
    rafIdRef.current = requestAnimationFrame(flush)
  }, [flush])

  const api = useMemo<StreamingOverlayAPI>(
    () => ({
      show: (opts) => {
        bufferRef.current = ''
        setState({
          visible: true,
          content: '',
          title: opts?.title,
          modelName: opts?.modelName,
          cancellable: opts?.cancellable !== false,
          onCancel: opts?.onCancel,
          status: 'streaming'
        })
      },
      update: (text, mode = 'append') => {
        if (mode === 'replace') bufferRef.current = text
        else bufferRef.current += text
        scheduleFlush()
      },
      hide: () => {
        setState((prev) => ({ ...prev, visible: false, status: 'complete' }))
        bufferRef.current = ''
        if (rafIdRef.current != null) {
          cancelAnimationFrame(rafIdRef.current)
          rafIdRef.current = null
        }
      },
      get isVisible() {
        return state.visible
      }
    }),
    [scheduleFlush, state.visible]
  )

  return (
    <Ctx.Provider value={api}>
      {children}
      <StreamingOverlay
        visible={state.visible}
        title={state.title}
        content={state.content}
        modelName={state.modelName}
        cancellable={state.cancellable}
        onCancel={state.onCancel}
        status={state.status}
      />
    </Ctx.Provider>
  )
}

export const useStreamingOverlay = (): StreamingOverlayAPI => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStreamingOverlay must be used within StreamingOverlayProvider')
  return ctx
}
