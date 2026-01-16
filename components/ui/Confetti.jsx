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

/**
 * Triggers a quick confetti burst from the center of the screen
 * Perfect for celebration moments like confetti blast button
 */
export function triggerConfettiBurst() {
  // First burst - center explosion
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x: 0.5, y: 0.5 },
    colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4'],
    ticks: 200,
    gravity: 0.8,
    scalar: 1.2,
    drift: 0,
  })

  // Delayed side bursts for extra flair
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: ['#ff0000', '#ffa500', '#ffff00', '#ff69b4'],
    })
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: ['#00ff00', '#00ffff', '#0000ff', '#ff00ff'],
    })
  }, 150)

  // Final top burst
  setTimeout(() => {
    confetti({
      particleCount: 30,
      angle: 270,
      spread: 100,
      origin: { x: 0.5, y: 0 },
      gravity: 1.5,
      colors: ['#ffd700', '#ff6347', '#32cd32', '#1e90ff'],
    })
  }, 300)
}

export default Confetti