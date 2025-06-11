import { context, setContext } from '../../central-control'
import { createCanvas } from '../../utils'

export default class RegulatorHelper {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  width: number
  height: number

  isDragging = false
  lastX = 0

  #offset = {
    top: 8,
    bottom: 0,
  }

  gap = 8

  constructor(el: string) {
    const oEl = typeof el === 'string'
      ? document.querySelector<HTMLElement>(el)
      : el

    if (!oEl || !('innerHTML' in oEl)) {
      throw new Error('Invalid element')
    }

    const { width, height } = oEl.getBoundingClientRect()

    this.width = Math.min(width * 0.8, 320)
    this.height = Math.min(height * 0.8, 32)

    this.canvas = createCanvas(this.width, this.height)
    this.ctx = this.canvas.getContext('2d')!

    oEl.appendChild(this.canvas)

    this.initEvents()

    this.animate()
  }

  get offsetTop() {
    return this.#offset.top
  }

  set offsetTop(top: number) {
    this.#offset.top = top
    setContext('theta', context.theta + 0.05)
  }

  get offsetBottom() {
    return this.#offset.bottom
  }

  set offsetBottom(bottom: number) {
    this.#offset.bottom = bottom
    setContext('theta', context.theta - 0.05)
  }

  initEvents() {
    const { canvas } = this

    const handleMove = (clientX: number) => {
      if (clientX < this.lastX) {
        // 左滑，上面刻度左移
        let offsetTop = this.offsetTop - 2
        if (offsetTop < 0)
          offsetTop += this.width
        this.offsetTop = offsetTop
      }
      else if (clientX > this.lastX) {
        // 右滑，下面刻度右移
        let offsetBottom = this.offsetBottom + 2
        if (offsetBottom > this.width)
          offsetBottom -= this.width
        this.offsetBottom = offsetBottom
      }
      this.lastX = clientX
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.isDragging)
        return
      handleMove(e.clientX)
    }

    const handleMouseUp = () => {
      this.isDragging = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    canvas.addEventListener('mousedown', (e) => {
      e.stopPropagation()
      if (!context.canIControl())
        return
      this.isDragging = true
      this.lastX = e.clientX
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    })

    const handleTouchMove = (e: TouchEvent) => {
      if (!this.isDragging)
        return
      if (e.touches.length !== 1)
        return
      e.preventDefault()
      handleMove(e.touches[0].clientX)
    }

    const handleTouchEnd = () => {
      this.isDragging = false
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }

    canvas.addEventListener('touchstart', (e) => {
      e.stopPropagation()
      if (!context.canIControl())
        return
      if (e.touches.length === 1) {
        this.isDragging = true
        this.lastX = e.touches[0].clientX
        window.addEventListener('touchmove', handleTouchMove, { passive: false })
        window.addEventListener('touchend', handleTouchEnd)
      }
    })
  }

  animate = () => {
    this.draw()
    requestAnimationFrame(this.animate)
  }

  clear() {
    const { ctx, width, height } = this
    ctx.clearRect(0, 0, width, height)
  }

  draw() {
    const { ctx, width, height } = this
    this.clear()

    // 背景渐变和粒子
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height)
    bgGrad.addColorStop(0, '#0d0019')
    bgGrad.addColorStop(1, '#1a004d')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, width, height)

    // 粒子粒子
    ctx.save()
    for (let i = 0; i < 30; i++) {
      const px = Math.random() * width
      const py = Math.random() * height
      const r = Math.random() * 1.2
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 255)}, 255, 255, ${Math.random() * 0.05})`
      ctx.shadowColor = 'cyan'
      ctx.shadowBlur = 8
      ctx.fill()
    }
    ctx.restore()

    // 动态发光中心线和涟漪
    const time = performance.now() / 1000
    ctx.save()
    ctx.lineWidth = 4
    const pulse = 0.6 + 0.4 * Math.sin(time * 6)
    const centerGrad = ctx.createRadialGradient(width / 2, height / 2, 2, width / 2, height / 2, 20)
    centerGrad.addColorStop(0, `rgba(0, 255, 255, ${pulse})`)
    centerGrad.addColorStop(1, 'rgba(0, 255, 255, 0)')
    ctx.strokeStyle = centerGrad
    ctx.shadowColor = `rgba(0, 255, 255, ${pulse})`
    ctx.shadowBlur = 16
    ctx.beginPath()
    ctx.moveTo(width / 2, 0)
    ctx.lineTo(width / 2, height)
    ctx.stroke()
    ctx.restore()

    // 中心涟漪
    ctx.save()
    const rippleTime = Math.sin(performance.now() / 200) * 5 + 10
    const rippleGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, rippleTime)
    rippleGrad.addColorStop(0, 'rgba(0,255,255,0.4)')
    rippleGrad.addColorStop(1, 'rgba(0,255,255,0)')
    ctx.fillStyle = rippleGrad
    ctx.fillRect(0, 0, width, height)
    ctx.restore()

    // 上下刻度
    this.drawTicks('top', time)
    this.drawTicks('bottom', time)

    // // 横向扫描光斑
    // ctx.save()
    // const scanX = (performance.now() / 5) % width
    // const scanGrad = ctx.createRadialGradient(scanX, height / 2, 0, scanX, height / 2, 40)
    // scanGrad.addColorStop(0, 'rgba(255,255,255,0.25)')
    // scanGrad.addColorStop(0.5, 'rgba(0,255,255,0.1)')
    // scanGrad.addColorStop(1, 'rgba(0,0,0,0)')
    // ctx.fillStyle = scanGrad
    // ctx.fillRect(0, 0, width, height)
    // ctx.restore()
  }

  drawTicks(position: 'top' | 'bottom', time: number) {
    const { ctx, gap, width, height, offsetTop, offsetBottom } = this

    const tickHeight = height / 2 - 6
    const yBase = position === 'top' ? 0 : height

    ctx.save()
    ctx.lineCap = 'round'

    const directionBias = position === 'top' ? 1 : -1

    const drawLine = (x: number, isMajor: boolean) => {
      ctx.beginPath()
      ctx.moveTo(x, yBase)
      const tickLen = isMajor ? tickHeight : tickHeight / 2
      const tickEndY = position === 'top' ? yBase + tickLen : yBase - tickLen

      const hue = ((x + directionBias * time * 80) / width) * 360
      const color1 = `hsl(${hue % 360}, 100%, ${isMajor ? '70%' : '50%'})`
      const color2 = `hsl(${(hue + 60) % 360}, 100%, ${isMajor ? '40%' : '30%'})`

      const grad = ctx.createLinearGradient(x, yBase, x, tickEndY)
      grad.addColorStop(0, color1)
      grad.addColorStop(1, color2)

      ctx.strokeStyle = grad
      ctx.lineWidth = isMajor ? 3 : 1.5

      ctx.shadowColor = color1
      ctx.shadowBlur = isMajor ? 10 : 5
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      ctx.lineTo(x, tickEndY)
      ctx.stroke()
    }

    let x = position === 'top' ? offsetTop : offsetBottom
    let count = 0
    while (x <= width) {
      drawLine(x, count % 5 === 0)
      x += gap
      count++
    }

    x = position === 'top' ? offsetTop : offsetBottom
    count = 0
    while (x >= 0) {
      drawLine(x, count % 5 === 0)
      x -= gap
      count++
    }

    ctx.restore()
  }
}
