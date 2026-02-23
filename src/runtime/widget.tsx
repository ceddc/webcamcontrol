import { React, css, type AllWidgetProps } from 'jimu-core'
import { JimuMapViewComponent, type JimuMapView } from 'jimu-arcgis'
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision'
import type { IMConfig } from '../config'
import defaultMessages from './translations/default'

type GestureMode = 'idle' | 'pan' | 'zoom'

interface HandPoint {
  x: number
  y: number
  z: number
}

const DEFAULT_FINGER_COLOR = '#00ff88'
const DEFAULT_PAN_SENSITIVITY = 2.1
const DEFAULT_ZOOM_SENSITIVITY = 2.5

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
]

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

const distance = (pointA: HandPoint, pointB: HandPoint): number => {
  const dz = (pointA.z ?? 0) - (pointB.z ?? 0)
  return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y, dz)
}

const isFingerExtended = (
  handLandmarks: HandPoint[],
  mcpIndex: number,
  pipIndex: number,
  tipIndex: number
): boolean => {
  const wrist = handLandmarks[0]
  const mcp = handLandmarks[mcpIndex]
  const pip = handLandmarks[pipIndex]
  const tip = handLandmarks[tipIndex]

  return (
    distance(tip, wrist) > distance(pip, wrist) * 1.05 &&
    distance(tip, mcp) > distance(pip, mcp) * 1.1
  )
}

const getOneFingerPanPoint = (hands: HandPoint[][]): HandPoint | null => {
  for (const hand of hands) {
    if (hand.length < 21) {
      continue
    }

    const indexExtended = isFingerExtended(hand, 5, 6, 8)
    const middleExtended = isFingerExtended(hand, 9, 10, 12)
    const ringExtended = isFingerExtended(hand, 13, 14, 16)
    const pinkyExtended = isFingerExtended(hand, 17, 18, 20)

    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return hand[8]
    }
  }

  return null
}

const getTwoFingerZoomPoints = (hands: HandPoint[][]): [HandPoint, HandPoint] | null => {
  const indexTips: HandPoint[] = []

  for (const hand of hands) {
    if (hand.length < 21) {
      continue
    }

    if (isFingerExtended(hand, 5, 6, 8)) {
      indexTips.push(hand[8])
    }
  }

  return indexTips.length >= 2 ? [indexTips[0], indexTips[1]] : null
}

const widgetStyle = css`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 260px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: linear-gradient(140deg, #081321 0%, #101a2d 55%, #15253f 100%);
  color: #f5f8ff;

  .webcamcontrol-feed {
    position: relative;
    flex: 1;
    min-height: 0;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    overflow: hidden;
    background: #05070c;
  }

  .webcamcontrol-canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  .webcamcontrol-hidden-video {
    display: none;
  }

  .webcamcontrol-pill {
    position: absolute;
    left: 10px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    line-height: 1.3;
    backdrop-filter: blur(2px);
    background: rgba(0, 0, 0, 0.55);
  }

  .webcamcontrol-pill-status {
    top: 10px;
  }

  .webcamcontrol-pill-gesture {
    top: 42px;
  }

  .webcamcontrol-footer {
    font-size: 12px;
    line-height: 1.35;
    opacity: 0.95;
  }

  .webcamcontrol-footer-error {
    color: #ffcbcb;
  }
`

export default function Widget (props: AllWidgetProps<IMConfig>) {
  const [statusText, setStatusText] = React.useState(defaultMessages.loadingCamera)
  const [errorText, setErrorText] = React.useState<string | null>(null)
  const [gestureMode, setGestureMode] = React.useState<GestureMode>('idle')

  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const animationFrameRef = React.useRef<number | null>(null)
  const handLandmarkerRef = React.useRef<HandLandmarker | null>(null)
  const mapViewRef = React.useRef<JimuMapView | null>(null)
  const previousPanPointRef = React.useRef<HandPoint | null>(null)
  const pinchStartDistanceRef = React.useRef<number | null>(null)
  const pinchStartScaleRef = React.useRef<number | null>(null)
  const gestureModeRef = React.useRef<GestureMode>('idle')

  const fingerColorRef = React.useRef<string>(props.config.fingerColor ?? DEFAULT_FINGER_COLOR)
  const panSensitivityRef = React.useRef<number>(props.config.panSensitivity ?? DEFAULT_PAN_SENSITIVITY)
  const zoomSensitivityRef = React.useRef<number>(props.config.zoomSensitivity ?? DEFAULT_ZOOM_SENSITIVITY)

  React.useEffect(() => {
    fingerColorRef.current = props.config.fingerColor ?? DEFAULT_FINGER_COLOR
  }, [props.config.fingerColor])

  React.useEffect(() => {
    panSensitivityRef.current = props.config.panSensitivity ?? DEFAULT_PAN_SENSITIVITY
  }, [props.config.panSensitivity])

  React.useEffect(() => {
    zoomSensitivityRef.current = props.config.zoomSensitivity ?? DEFAULT_ZOOM_SENSITIVITY
  }, [props.config.zoomSensitivity])

  React.useEffect(() => {
    if (!props.useMapWidgetIds?.length) {
      mapViewRef.current = null
    }
  }, [props.useMapWidgetIds])

  const setGestureModeIfChanged = React.useCallback((nextMode: GestureMode) => {
    if (gestureModeRef.current !== nextMode) {
      gestureModeRef.current = nextMode
      setGestureMode(nextMode)
    }
  }, [])

  const drawHandGraphics = React.useCallback((result: HandLandmarkerResult, canvasWidth: number, canvasHeight: number) => {
    const ctx = canvasRef.current?.getContext('2d')

    if (!ctx) {
      return
    }

    const hands = result.landmarks as HandPoint[][]
    const baseLandmarkRadius = Math.max(4, Math.min(canvasWidth, canvasHeight) * 0.01)
    const indexLineWidth = Math.max(6, Math.min(canvasWidth, canvasHeight) * 0.017)

    for (const hand of hands) {
      if (hand.length < 21) {
        continue
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.lineWidth = Math.max(3, Math.min(canvasWidth, canvasHeight) * 0.008)
      ctx.beginPath()

      for (const [fromIndex, toIndex] of HAND_CONNECTIONS) {
        const from = hand[fromIndex]
        const to = hand[toIndex]
        ctx.moveTo(from.x * canvasWidth, from.y * canvasHeight)
        ctx.lineTo(to.x * canvasWidth, to.y * canvasHeight)
      }

      ctx.stroke()

      for (const point of hand) {
        ctx.beginPath()
        ctx.fillStyle = 'rgba(235, 242, 255, 0.8)'
        ctx.arc(point.x * canvasWidth, point.y * canvasHeight, baseLandmarkRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      const indexChain = [5, 6, 7, 8]
      ctx.strokeStyle = fingerColorRef.current
      ctx.lineWidth = indexLineWidth
      ctx.beginPath()

      for (let i = 0; i < indexChain.length; i++) {
        const indexPoint = hand[indexChain[i]]
        const x = indexPoint.x * canvasWidth
        const y = indexPoint.y * canvasHeight

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }

      ctx.stroke()

      const indexTip = hand[8]
      ctx.beginPath()
      ctx.fillStyle = fingerColorRef.current
      ctx.arc(indexTip.x * canvasWidth, indexTip.y * canvasHeight, baseLandmarkRadius * 2.1, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [])

  const resetGestureTrackers = React.useCallback(() => {
    previousPanPointRef.current = null
    pinchStartDistanceRef.current = null
    pinchStartScaleRef.current = null
  }, [])

  const getActive2DMapView = React.useCallback((): __esri.MapView | null => {
    const view = mapViewRef.current?.view
    if (!view || view.type !== '2d') {
      return null
    }

    return view as __esri.MapView
  }, [])

  const handlePanGesture = React.useCallback((point: HandPoint) => {
    const mapView = getActive2DMapView()
    const previousPoint = previousPanPointRef.current
    previousPanPointRef.current = point

    if (!mapView || !previousPoint) {
      return
    }

    const deltaX = point.x - previousPoint.x
    const deltaY = point.y - previousPoint.y

    if (Math.abs(deltaX) < 0.0015 && Math.abs(deltaY) < 0.0015) {
      return
    }

    const mapDeltaX = deltaX * mapView.width * mapView.resolution * panSensitivityRef.current
    const mapDeltaY = deltaY * mapView.height * mapView.resolution * panSensitivityRef.current

    mapView.center = {
      x: mapView.center.x - mapDeltaX,
      y: mapView.center.y + mapDeltaY,
      spatialReference: mapView.spatialReference
    } as __esri.PointProperties
  }, [getActive2DMapView])

  const handleZoomGesture = React.useCallback((firstPoint: HandPoint, secondPoint: HandPoint) => {
    const mapView = getActive2DMapView()

    if (!mapView) {
      return
    }

    const distanceBetweenPoints = Math.max(distance(firstPoint, secondPoint), 0.01)

    if (pinchStartDistanceRef.current == null || pinchStartScaleRef.current == null) {
      pinchStartDistanceRef.current = distanceBetweenPoints
      pinchStartScaleRef.current = mapView.scale
      return
    }

    const ratio = pinchStartDistanceRef.current / distanceBetweenPoints
    const desiredScale = pinchStartScaleRef.current * Math.pow(ratio, zoomSensitivityRef.current)
    const smoothedScale = mapView.scale + ((desiredScale - mapView.scale) * 0.35)
    const minScale = typeof mapView.constraints.minScale === 'number' && mapView.constraints.minScale > 0
      ? mapView.constraints.minScale
      : 1
    const maxScale = typeof mapView.constraints.maxScale === 'number' && mapView.constraints.maxScale > 0
      ? mapView.constraints.maxScale
      : Number.MAX_VALUE

    mapView.scale = clamp(smoothedScale, minScale, maxScale)
  }, [getActive2DMapView])

  const analyzeAndApplyGestures = React.useCallback((result: HandLandmarkerResult) => {
    const hands = (result.landmarks ?? []) as HandPoint[][]

    if (!hands.length) {
      resetGestureTrackers()
      setGestureModeIfChanged('idle')
      return
    }

    const zoomPoints = getTwoFingerZoomPoints(hands)
    if (zoomPoints) {
      previousPanPointRef.current = null
      setGestureModeIfChanged('zoom')
      handleZoomGesture(zoomPoints[0], zoomPoints[1])
      return
    }

    const panPoint = getOneFingerPanPoint(hands)
    if (panPoint) {
      pinchStartDistanceRef.current = null
      pinchStartScaleRef.current = null
      setGestureModeIfChanged('pan')
      handlePanGesture(panPoint)
      return
    }

    resetGestureTrackers()
    setGestureModeIfChanged('idle')
  }, [handlePanGesture, handleZoomGesture, resetGestureTrackers, setGestureModeIfChanged])

  React.useEffect(() => {
    let isCancelled = false

    const cleanup = () => {
      if (animationFrameRef.current != null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      handLandmarkerRef.current?.close()
      handLandmarkerRef.current = null

      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop()
        }
      }

      streamRef.current = null
    }

    const renderFrame = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const handLandmarker = handLandmarkerRef.current

      if (!video || !canvas || !handLandmarker) {
        animationFrameRef.current = window.requestAnimationFrame(renderFrame)
        return
      }

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        animationFrameRef.current = window.requestAnimationFrame(renderFrame)
        return
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        animationFrameRef.current = window.requestAnimationFrame(renderFrame)
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const detectionResult = handLandmarker.detectForVideo(video, performance.now())
      drawHandGraphics(detectionResult, canvas.width, canvas.height)
      analyzeAndApplyGestures(detectionResult)

      animationFrameRef.current = window.requestAnimationFrame(renderFrame)
    }

    const initialize = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('MediaDevices API is not available in this browser.')
        }

        setStatusText(defaultMessages.loadingCamera)

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        })

        if (isCancelled) {
          for (const track of stream.getTracks()) {
            track.stop()
          }
          return
        }

        streamRef.current = stream

        if (!videoRef.current) {
          return
        }

        videoRef.current.srcObject = stream
        await videoRef.current.play()

        setStatusText(defaultMessages.loadingModel)

        const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_PATH
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        })

        if (isCancelled) {
          handLandmarker.close()
          return
        }

        handLandmarkerRef.current = handLandmarker
        setStatusText(defaultMessages.ready)
        setErrorText(null)
        animationFrameRef.current = window.requestAnimationFrame(renderFrame)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setErrorText(`${defaultMessages.cameraError} ${message}`)
        setStatusText(defaultMessages.cameraError)
      }
    }

    void initialize()

    return () => {
      isCancelled = true
      cleanup()
    }
  }, [analyzeAndApplyGestures, drawHandGraphics])

  const onActiveViewChange = React.useCallback((jimuMapView: JimuMapView) => {
    mapViewRef.current = jimuMapView
  }, [])

  const hasMapSelection = props.useMapWidgetIds?.length === 1

  const gestureText = gestureMode === 'pan'
    ? defaultMessages.panMode
    : gestureMode === 'zoom'
        ? defaultMessages.zoomMode
        : defaultMessages.idleMode

  return (
    <div className='jimu-widget webcamcontrol-widget' css={widgetStyle}>
      {hasMapSelection && (
        <JimuMapViewComponent
          useMapWidgetId={props.useMapWidgetIds?.[0]}
          onActiveViewChange={onActiveViewChange}
        />
      )}

      <video ref={videoRef} className='webcamcontrol-hidden-video' muted playsInline />

      <div className='webcamcontrol-feed'>
        <canvas ref={canvasRef} className='webcamcontrol-canvas' />
        <div className='webcamcontrol-pill webcamcontrol-pill-status'>{statusText}</div>
        <div className='webcamcontrol-pill webcamcontrol-pill-gesture'>{gestureText}</div>
      </div>

      {errorText
        ? <div className='webcamcontrol-footer webcamcontrol-footer-error'>{errorText}</div>
        : <div className='webcamcontrol-footer'>{defaultMessages.gestureHint}</div>}

      {!hasMapSelection && <div className='webcamcontrol-footer'>{defaultMessages.mapHint}</div>}
    </div>
  )
}
