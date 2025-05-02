import Hammer from 'hammerjs'
import { createCanvas } from '../../utils'
import emitter, { EventTypes } from '../../utils/Emitter'

export interface PointHelperOptions {
  ballRadius: number
  targetRadius: number
  bgColor: string
  targetColor: string
  guideLineColor: string
}
export default class PointHelper {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  width: number
  height: number

  targetPosition = {
    x: 0,
    y: 0,
  }

  targetRadius = 4

  safeRadius = 20

  isDragging = false

  setting: PointHelperOptions = {
    ballRadius: Number.NaN,
    targetRadius: 4,
    bgColor: '#f1f1f1',
    targetColor: 'red',
    guideLineColor: '#ccc',
  }

  constructor(el: string | HTMLElement, options: Partial<PointHelperOptions> = {}) {
    const oEl = typeof el === 'string'
      ? document.querySelector<HTMLElement>(el)
      : el

    if (!oEl || !('innerHTML' in oEl)) {
      throw new Error('Invalid element')
    }

    const { width, height } = oEl.getBoundingClientRect()
    this.width = width
    this.height = height

    this.setting = Object.assign({}, this.setting, options)

    this.canvas = createCanvas(width, height)
    this.ctx = this.canvas.getContext('2d')!

    this.targetPosition.x = width / 2
    this.targetPosition.y = height / 2

    this.setting.ballRadius = this.setting.ballRadius || Math.floor(Math.min(width, height) * 0.9 / 2)
    this.targetRadius = Math.floor(Math.max(this.setting.ballRadius / 10, 2))
    this.safeRadius = this.setting.ballRadius - this.targetRadius

    oEl.appendChild(this.canvas)

    this.initEvent()

    this.draw()
  }

  get center() {
    return {
      x: this.width / 2,
      y: this.height / 2,
    }
  }

  getPosition(radius = this.setting.ballRadius) {
    const { targetPosition, center, setting: { ballRadius } } = this
    return {
      x: radius * (targetPosition.x - center.x) / ballRadius,
      y: radius * (targetPosition.y - center.y) / ballRadius,
    }
  }

  initEvent() {
    const { canvas } = this

    const hm = new Hammer(canvas)
    hm.get('pan').set({ direction: Hammer.DIRECTION_ALL, threshold: 0 })
    hm.get('press').set({ time: 0 })

    hm.on('press', (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.center.x - rect.left
      const y = e.center.y - rect.top
      this.updateTargetPosition(x, y)
    })

    hm.on('panstart', (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.center.x - rect.left
      const y = e.center.y - rect.top

      if (this.isTargetClicked(x, y)) {
        this.isDragging = true
        document.body.style.cursor = 'grabbing'
      }
    })

    hm.on('panmove', (e) => {
      if (this.isDragging) {
        const rect = canvas.getBoundingClientRect()
        const x = e.center.x - rect.left
        const y = e.center.y - rect.top

        this.updateTargetPosition(x, y)
      }
    })

    hm.on('panend', () => {
      this.isDragging = false
      document.body.style.cursor = 'default'
    })

    hm.on('panleave', () => {
      this.isDragging = false
      document.body.style.cursor = 'default'
    })
  }

  draw() {
    const { ctx, width, height } = this
    ctx.clearRect(0, 0, width, height)

    this.drawBall()
    this.drawLightEffect()

    this.drawGuideLine()
    this.drawTarget()

    this.drawDiff()
  }

  drawBall() {
    const { ctx, center, setting: { ballRadius, bgColor } } = this
    ctx.save()

    ctx.beginPath()

    ctx.shadowBlur = 10
    ctx.shadowColor = '#0000000F'
    ctx.shadowOffsetX = 5
    ctx.shadowOffsetY = 5

    ctx.arc(center.x, center.y, ballRadius, 0, Math.PI * 2)
    ctx.strokeStyle = '#0000000F'
    ctx.fillStyle = bgColor
    ctx.fill()
    ctx.stroke()

    ctx.restore()
  }

  drawLightEffect() {
    const { ctx, center, setting: { ballRadius } } = this

    // 左上角一下开壳器
    {
      ctx.save()

      const p1 = {
        x: center.x - ballRadius * 0.6 * Math.cos(Math.PI / 4),
        y: center.y - ballRadius * 0.6 * Math.sin(Math.PI / 4),
      }

      const cp = {
        x: center.x - ballRadius * 0.75 * Math.cos(Math.PI / 4),
        y: center.y - ballRadius * 0.75 * Math.sin(Math.PI / 4),
      }

      const p2 = {
        x: center.x - ballRadius * 0.9 * Math.cos(Math.PI / 4 - Math.PI / 8),
        y: center.y - ballRadius * 0.9 * Math.sin(Math.PI / 4 - Math.PI / 8),
      }

      const p3 = {
        x: center.x - ballRadius * 0.9 * Math.cos(Math.PI / 4 + Math.PI / 8),
        y: center.y - ballRadius * 0.9 * Math.sin(Math.PI / 4 + Math.PI / 8),
      }

      ctx.beginPath()
      ctx.lineCap = 'round'
      ctx.moveTo(p1.x, p1.y)
      ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y)
      ctx.quadraticCurveTo(
        center.x - ballRadius * Math.cos(Math.PI / 4),
        center.y - ballRadius * Math.cos(Math.PI / 4),
        p3.x,
        p3.y,
      )
      ctx.quadraticCurveTo(cp.x, cp.y, p1.x, p1.y)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fill()

      ctx.restore()
    }

    // 下面来个半月牙
    {
      ctx.save()

      const p1 = {
        x: center.x - ballRadius * 0.8 * Math.cos(Math.PI / 4),
        y: center.y + ballRadius * 0.75 * Math.cos(Math.PI / 4),
      }

      const p2 = {
        x: center.x + ballRadius * 0.8 * Math.cos(Math.PI / 4),
        y: center.y + ballRadius * 0.75 * Math.cos(Math.PI / 4),
      }

      ctx.beginPath()
      ctx.lineCap = 'round'
      ctx.moveTo(p1.x, p1.y)
      ctx.quadraticCurveTo(center.x, center.y + ballRadius * 1.1, p2.x, p2.y)
      ctx.quadraticCurveTo(center.x, center.y + ballRadius * 0.75, p1.x, p1.y)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
      ctx.fill()
      // ctx.stroke()

      ctx.restore()
    }

    // 右边再来个小曲线
    {
      ctx.save()

      const p1 = {
        x: center.x + ballRadius * 0.9 * Math.cos(Math.PI / 4),
        y: center.y - ballRadius * 0.6 * Math.cos(Math.PI / 4),
      }

      const cp = {
        x: center.x + ballRadius * Math.cos(Math.PI / 4 - Math.PI / 8),
        y: center.y - ballRadius * Math.cos(Math.PI / 4 + Math.PI / 6),
      }

      const p2 = {
        x: center.x + ballRadius * 0.9,
        y: center.y,
      }

      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y)
      // ctx.lineTo(p2.x, p2.y)
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.stroke()

      ctx.restore()
    }
  }

  drawGuideLine() {
    const { ctx, width, height, center, setting: { ballRadius } } = this
    ctx.save()
    const diffX = Math.ceil(width / 2 - ballRadius)
    const diffY = Math.ceil(height / 2 - ballRadius)
    ctx.beginPath()
    ctx.moveTo(center.x, diffY)
    ctx.lineTo(center.x, height - diffY)
    ctx.moveTo(diffX, center.y)
    ctx.lineTo(width - diffX, center.y)
    ctx.strokeStyle = this.setting.guideLineColor
    ctx.setLineDash([ballRadius / 10])
    ctx.stroke()
    ctx.restore()
  }

  drawTarget() {
    const { ctx, targetPosition, targetRadius } = this
    ctx.save()
    ctx.beginPath()
    ctx.arc(targetPosition.x, targetPosition.y, targetRadius, 0, Math.PI * 2)
    ctx.fillStyle = this.setting.targetColor
    ctx.fill()
    ctx.restore()
  }

  drawDiff() {
    const { ctx, targetPosition, center } = this
    const text = `(${(targetPosition.x - center.x).toFixed(1)}, ${(center.y - targetPosition.y).toFixed(1)})`

    ctx.save()
    ctx.beginPath()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `Bold ${this.setting.ballRadius * 0.3}px Arial`
    ctx.fillText(text, center.x, center.y)
    ctx.stroke()
    ctx.restore()
  }

  isTargetClicked(x: number, y: number) {
    const { targetPosition, targetRadius } = this
    const distance = Math.sqrt((x - targetPosition.x) ** 2 + (y - targetPosition.y) ** 2)

    return distance <= targetRadius * 2
  }

  // 更新点位置
  updateTargetPosition(x: number, y: number) {
    const { targetPosition, width, height, safeRadius } = this
    const cx = width / 2
    const cy = height / 2

    // 计算极坐标
    const dx = x - cx
    const dy = y - cy
    const r = Math.sqrt(dx * dx + dy * dy)
    let angle = Math.atan2(dy, dx) * 180 / Math.PI
    if (angle < 0)
      angle += 360

    // 检查是否在圆内
    const isInSafe = r <= safeRadius
    if (!isInSafe) {
      // 计算缩放比例
      const scale = safeRadius / r
      // 计算新的坐标
      targetPosition.x = cx + dx * scale
      targetPosition.y = cy + dy * scale
    }
    else {
      targetPosition.x = x
      targetPosition.y = y
    }
    console.log(targetPosition)
    const p = this.getPosition()
    emitter.emit(EventTypes.point, {
      x: p.x / this.safeRadius,
      y: p.y / this.safeRadius
    })
    this.draw()
  }

  resetTarget() {
    this.updateTargetPosition(this.center.x, this.center.y)
  }
}
