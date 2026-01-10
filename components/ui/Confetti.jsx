import React, {
  createContext,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react"
import confetti from "canvas-confetti"

const ConfettiContext = createContext({})

const Confetti = forwardRef((props, ref) => {
  const {
    options,
    globalOptions = { resize: true, useWorker: true },
    manualstart = false,
    children,
    className,
    ...rest
  } = props
  const instanceRef = useRef(null)

  const canvasRef = useCallback(
    (node) => {
      if (node !== null) {
        if (instanceRef.current) return
        instanceRef.current = confetti.create(node, {
          ...globalOptions,
          resize: true,
        })
      } else {
        if (instanceRef.current) {
          instanceRef.current.reset()
          instanceRef.current = null
        }
      }
    },
    [globalOptions]
  )

  const fire = useCallback(
    async (opts = {}) => {
      try {
        await instanceRef.current?.({ ...options, ...opts })
      } catch (error) {
        console.error("Confetti error:", error)
      }
    },
    [options]
  )

  const api = useMemo(
    () => ({
      fire,
    }),
    [fire]
  )

  useImperativeHandle(ref, () => api, [api])

  useEffect(() => {
    if (!manualstart) {
      fire()
    }
  }, [manualstart, fire])

  return (
    <ConfettiContext.Provider value={api}>
      <canvas 
        ref={canvasRef} 
        className={className}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 50 }}
        {...rest} 
      />
      {children}
    </ConfettiContext.Provider>
  )
})

Confetti.displayName = "Confetti"

export function triggerFireworks() {
  const duration = 5 * 1000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 }

  const randomInRange = (min, max) => Math.random() * (max - min) + min

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      return clearInterval(interval)
    }

    const particleCount = 50 * (timeLeft / duration)
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    })
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    })
  }, 250)
}

export default Confetti