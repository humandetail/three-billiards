import { createCanvas } from '../../utils'

export default class ArrowButton {
  width = 0
  height = 0

  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  hover = false
  flowOffset = 0
  scale = 1
  constructor(el: string | HTMLElement, public rotation = 0, public callBack?: () => void) {
    const oEl = typeof el === 'string'
      ? document.querySelector<HTMLElement>(el)
      : el

    if (!oEl || !('innerHTML' in oEl)) {
      throw new Error('Invalid element')
    }

    const { width, height } = oEl.getBoundingClientRect()

    this.width = width
    this.height = height

    this.canvas = createCanvas(width, height, oEl.tagName === 'CANVAS' ? oEl as HTMLCanvasElement : undefined)
    this.ctx = this.canvas.getContext('2d')!

    if (oEl.tagName !== 'CANVAS') {
      oEl.appendChild(this.canvas)
    }

    this.animate()

    this.init()
  }

  get size() {
    return Math.min(this.width, this.height)
  }

  init() {
    this.initEvents()
    this.draw()
  }

  initEvents() {
    const { canvas } = this
    canvas.addEventListener('mouseenter', () => {
      this.hover = true
      document.body.style.cursor = 'pointer'
    })
    canvas.addEventListener('mouseleave', () => {
      this.hover = false
      this.flowOffset = 0
      this.draw()
      document.body.style.cursor = 'default'
    })
    canvas.addEventListener('mousedown', () => {
      this.scale = 0.8
      this.draw()
    })
    canvas.addEventListener('mouseup', (e) => {
      this.scale = 1
      this.draw()
      e.stopPropagation()
      this.callBack?.()
    })
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this))
    if (this.hover) {
      this.flowOffset += 1
      if (this.flowOffset > this.size)
        this.flowOffset = -this.size
      this.draw()
    }
  }

  draw() {
    const { ctx, size, width, height, rotation, hover, flowOffset, scale } = this
    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.rotate(rotation)
    ctx.scale(scale, scale)

    ctx.beginPath()
    ctx.moveTo(0, size / 2)
    ctx.lineTo(size / 2, -size / 2)
    ctx.quadraticCurveTo(0, 0, -size / 2, -size / 2)
    ctx.closePath()

    // 填充主箭头
    const dx = Math.cos(rotation) * size
    const dy = Math.sin(rotation) * size
    const gradient = ctx.createLinearGradient(0, 0, dx, dy)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)')
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.stroke()

    if (hover) {
      const glow = ctx.createLinearGradient(flowOffset - size, 0, flowOffset, size)
      glow.addColorStop(0, 'rgba(255,255,255,0)')
      glow.addColorStop(0.5, 'rgba(255,255,255,0.7)')
      glow.addColorStop(1, 'rgba(255,255,255,0)')

      ctx.fillStyle = glow
      ctx.globalCompositeOperation = 'lighter'
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }

    ctx.restore()
  }

  show() {
    this.canvas.style.visibility = 'visible'
  }

  hide() {
    this.canvas.style.visibility = 'hidden'
  }
}
