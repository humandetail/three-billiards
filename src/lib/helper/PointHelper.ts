import Hammer from 'hammerjs'
import { BilliardsStatus, context, emitter, EventTypes } from '../../central-control'
import { createCanvas } from '../../utils'
import ArrowButton from './ArrowButton'
import Ball2D from './Ball2D'

export interface PointHelperOptions {
  radius: number
  targetRadius: number
  bgColor: string
  targetColor: string
  guideLineColor: string
}
export default class PointHelper extends Ball2D {
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

  options: PointHelperOptions = {
    radius: 1,
    targetRadius: 4,
    bgColor: '#f1f1f1',
    targetColor: '#0088FF',
    guideLineColor: '#ccc',
  }

  upBtn?: ArrowButton
  downBtn?: ArrowButton
  leftBtn?: ArrowButton
  rightBtn?: ArrowButton
  resetBtn?: HTMLElement

  constructor(el: string | HTMLElement, options: Partial<PointHelperOptions> = {}) {
    const oEl = typeof el === 'string'
      ? document.querySelector<HTMLElement>(el)
      : el

    if (!oEl || !('innerHTML' in oEl)) {
      throw new Error('Invalid element')
    }

    const { width, height } = oEl.getBoundingClientRect()
    const radius = options.radius || Math.floor(Math.min(width, height) * 0.6 / 2)
    super({
      radius,
      bgColor: '#f1f1f1',
      guideLineColor: '#ccc',
    })

    this.width = width
    this.height = height

    this.options = Object.assign({}, this.options, options, {
      radius,
    })

    this.canvas = createCanvas(width, height)
    this.ctx = this.canvas.getContext('2d')!

    this.targetPosition.x = width / 2
    this.targetPosition.y = height / 2

    this.targetRadius = Math.floor(Math.max(radius / 10, 4))
    this.safeRadius = radius - this.targetRadius

    if (context.status === BilliardsStatus.Advanced) {
      this.upBtn = new ArrowButton('#btn-point-controller-up', Math.PI, () => {
        this.updateTargetPosition(this.targetPosition.x, this.targetPosition.y - 0.1)
      })
      this.downBtn = new ArrowButton('#btn-point-controller-down', 0, () => {
        this.updateTargetPosition(this.targetPosition.x, this.targetPosition.y + 0.1)
      })
      this.leftBtn = new ArrowButton('#btn-point-controller-left', Math.PI / 2, () => {
        this.updateTargetPosition(this.targetPosition.x - 0.1, this.targetPosition.y)
      })
      this.rightBtn = new ArrowButton('#btn-point-controller-right', -Math.PI / 2, () => {
        this.updateTargetPosition(this.targetPosition.x + 0.1, this.targetPosition.y)
      })
      this.resetBtn = document.querySelector<HTMLElement>('#btn-point-controller-reset')!
    }

    oEl.appendChild(this.canvas)

    this.initEvent()

    this.draw()
  }

  getPosition(radius = this.options.radius) {
    const { targetPosition, center } = this
    return {
      x: radius * (targetPosition.x - center.x) / radius,
      y: radius * (targetPosition.y - center.y) / radius,
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
    if (context.status === BilliardsStatus.Advanced) {
      if (this.resetBtn) {
        this.resetBtn.addEventListener('click', () => {
          this.updateTargetPosition(this.center.x, this.center.y)
        })
      }
    }
  }

  draw() {
    const { ctx, width, height } = this
    ctx.clearRect(0, 0, width, height)
    this.setCenter(width / 2, height / 2)
    super.draw(ctx)

    this.drawTarget()

    this.drawDiff()
  }

  drawTarget() {
    const { ctx, targetPosition, targetRadius } = this
    ctx.save()
    ctx.beginPath()
    ctx.arc(targetPosition.x, targetPosition.y, targetRadius, 0, Math.PI * 2)
    ctx.fillStyle = this.options.targetColor
    ctx.fill()
    ctx.restore()
  }

  drawDiff() {
    const { ctx, targetPosition, center, safeRadius } = this
    const text = `(${((targetPosition.x - center.x) / safeRadius * 50).toFixed(1)}, ${((center.y - targetPosition.y) / safeRadius * 50).toFixed(1)})`

    ctx.save()
    ctx.beginPath()
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.font = `Bold 14px Arial`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillText(text, this.width - 8, 8)
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

    const p = this.getPosition()
    if (context.status === BilliardsStatus.Idle) {
      emitter.emit(EventTypes.point, {
        x: p.x / this.safeRadius,
        y: -1 * p.y / this.safeRadius,
      })
      this.draw()
    }
  }

  resetTarget() {
    this.updateTargetPosition(this.center.x, this.center.y)
  }
}
