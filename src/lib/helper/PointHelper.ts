import type { Point } from '../../utils'
import Hammer from 'hammerjs'
import { BilliardsStatus, context, setContext } from '../../central-control'
import { createCanvas } from '../../utils'
import ArrowButton from './ArrowButton'
import Ball2D from './Ball2D'
import Helper from './Helper'

export interface PointHelperOptions {
  radius: number
  targetRadius: number
  bgColor: string
  targetColor: string
  guideLineColor: string
}

export default class PointHelper extends Ball2D {
  el: HTMLElement
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  width: number
  height: number

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

  resetBtn: HTMLElement

  helper: Helper

  #position: Point = {
    x: 0,
    y: 0,
  }

  constructor(el: string | HTMLElement, options: Partial<PointHelperOptions> = {}) {
    const oEl = typeof el === 'string'
      ? document.querySelector<HTMLElement>(el)
      : el

    if (!oEl || !('innerHTML' in oEl)) {
      throw new Error('Invalid element')
    }

    let { width, height } = oEl.getBoundingClientRect()
    if (!width || !height) {
      width = 108
      height = 108
    }
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

    this.targetRadius = Math.floor(Math.max(radius / 10, 4))
    this.safeRadius = radius - this.targetRadius

    oEl.appendChild(this.canvas)
    const oResetBtn = this.resetBtn = document.createElement('div')
    oResetBtn.className = 'btn btn-reset'
    oResetBtn.innerHTML = '重置'

    const oUpBtn = document.createElement('canvas')
    oUpBtn.className = 'btn btn-up'

    const oRightBtn = document.createElement('canvas')
    oRightBtn.className = 'btn btn-right'

    const oDownBtn = document.createElement('canvas')
    oDownBtn.className = 'btn btn-down'

    const oLeftBtn = document.createElement('canvas')
    oLeftBtn.className = 'btn btn-left'

    oEl.appendChild(oResetBtn)
    oEl.appendChild(oUpBtn)
    oEl.appendChild(oRightBtn)
    oEl.appendChild(oDownBtn)
    oEl.appendChild(oLeftBtn)

    const helper = new Helper()

    helper.btns.add(new ArrowButton(oUpBtn, Math.PI, () => {
      this.updateTargetPosition(this.targetPosition.x, this.targetPosition.y - 0.1)
    }))
    helper.btns.add(new ArrowButton(oDownBtn, 0, () => {
      this.updateTargetPosition(this.targetPosition.x, this.targetPosition.y + 0.1)
    }))
    helper.btns.add(new ArrowButton(oLeftBtn, Math.PI / 2, () => {
      this.updateTargetPosition(this.targetPosition.x - 0.1, this.targetPosition.y)
    }))
    helper.btns.add(new ArrowButton(oRightBtn, -Math.PI / 2, () => {
      this.updateTargetPosition(this.targetPosition.x + 0.1, this.targetPosition.y)
    }))
    helper.btns.add(oResetBtn)
    helper.hideBtns()

    this.el = oEl
    this.helper = helper

    this.initEvent()

    this.draw()
  }

  handleResize(width: number, height: number) {
    ;(this.canvas as any).handleResize(width, height)

    const radius = Math.floor(Math.min(width, height) * 0.6 / 2)
    this.width = width
    this.height = height

    this.el.style.width = `${width}px`
    this.el.style.height = `${height}px`

    this.options.radius = radius

    this.setRadius(radius)

    this.targetRadius = Math.floor(Math.max(radius / 10, 4))
    this.safeRadius = radius - this.targetRadius

    this.helper.btns.forEach((btn) => {
      if (btn instanceof ArrowButton) {
        btn.handleResize(width * 0.1, width * 0.1)
      }
    })

    this.draw()
  }

  get position() {
    return this.#position
  }

  set position(p: Point) {
    this.#position = p

    setContext('targetPoint', p)
    this.draw()
  }

  get targetPosition() {
    return {
      x: this.center.x + this.safeRadius * this.position.x,
      y: this.center.y + this.safeRadius * this.position.y,
    }
  }

  initEvent() {
    const hm = new Hammer(this.canvas)
    hm.get('pan').set({ direction: Hammer.DIRECTION_ALL, threshold: 0 })
    hm.get('press').set({ time: 0 })
    hm.on('tap', e => e.srcEvent.stopPropagation())

    this.el.addEventListener('click', e => e.stopPropagation())

    hm.on('press', (e) => {
      e.srcEvent.stopPropagation()
      if (!context.isAdvanced() && context.canIControl()) {
        setContext('status', BilliardsStatus.Advanced)
        this.draw()
        return
      }
      const rect = this.canvas.getBoundingClientRect()

      const x = e.center.x - rect.left
      const y = e.center.y - rect.top
      this.updateTargetPosition(x, y)
    })

    hm.on('panstart', (e) => {
      e.srcEvent.stopPropagation()
      if (!context.isAdvanced())
        return
      const rect = this.canvas.getBoundingClientRect()
      const x = e.center.x - rect.left
      const y = e.center.y - rect.top

      if (this.isTargetClicked(x, y)) {
        this.isDragging = true
        document.body.style.cursor = 'grabbing'
      }
    })

    hm.on('panmove', (e) => {
      e.srcEvent.stopPropagation()
      if (this.isDragging) {
        const rect = this.canvas.getBoundingClientRect()
        const x = e.center.x - rect.left
        const y = e.center.y - rect.top

        this.updateTargetPosition(x, y)
      }
    })

    hm.on('panend', (e) => {
      e.srcEvent.stopPropagation()
      this.isDragging = false
      document.body.style.cursor = 'default'
    })

    hm.on('panleave', (e) => {
      e.srcEvent.stopPropagation()
      this.isDragging = false
      document.body.style.cursor = 'default'
    })
    this.resetBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      if (!context.isAdvanced())
        return
      this.updateTargetPosition(this.center.x, this.center.y)
    })
  }

  draw() {
    const { ctx, width, height } = this
    ctx.clearRect(0, 0, width, height)
    this.setCenter(width / 2, height / 2)

    super.draw(ctx)

    this.drawTarget()

    if (context.isAdvanced()) {
      this.drawPos()
    }
    else {
      this.drawAngle()
    }
  }

  drawTarget() {
    const { ctx, safeRadius, center, targetRadius, position } = this

    const x = center.x + safeRadius * position.x
    const y = center.y + safeRadius * position.y

    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, targetRadius, 0, Math.PI * 2)
    ctx.fillStyle = this.options.targetColor
    ctx.fill()
    ctx.restore()
  }

  drawPos() {
    const { ctx, position, width } = this
    const text = `(${(position.x * 50).toFixed(1)}, ${((-position.y * 50).toFixed(1))})`

    ctx.save()
    ctx.beginPath()
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.font = `Bold 12px Arial`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillText(text, width * 0.99, width * 0.01)
    ctx.stroke()
    ctx.restore()
  }

  drawAngle() {
    const { ctx, width, height } = this

    ctx.save()
    ctx.beginPath()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `Bold 10px Arial`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fillText(`${context.phi}°`, width / 2, height * 0.1)
    ctx.stroke()
    ctx.restore()
  }

  isTargetClicked(x: number, y: number) {
    const distance = Math.sqrt((x - this.targetPosition.x) ** 2 + (y - this.targetPosition.y) ** 2)

    return distance <= this.targetRadius * 2
  }

  /**
   * 更新目标点位置
   * @param x 目标点 x 坐标
   * @param y 目标点 y 坐标
   */
  updateTargetPosition(x: number, y: number) {
    if (!context.canIControl()) {
      console.warn('当前状态不允许设置目标点')
      return
    }
    const { width, height, safeRadius } = this
    const cx = width / 2
    const cy = height / 2

    // 计算极坐标
    const dx = x - cx
    const dy = y - cy
    const r = Math.sqrt(dx * dx + dy * dy)
    let angle = Math.atan2(dy, dx) * 180 / Math.PI

    let posX = x
    let posY = y
    if (angle < 0)
      angle += 360

    // 检查是否在圆内
    const isInSafe = r <= safeRadius
    if (!isInSafe) {
      // 计算缩放比例
      const scale = safeRadius / r
      // 计算新的坐标
      posX = cx + dx * scale
      posY = cy + dy * scale
    }
    else {
      posX = x
      posY = y
    }

    this.position = {
      x: (posX - this.center.x) / this.safeRadius,
      y: (posY - this.center.y) / this.safeRadius,
    }
  }

  resetTarget() {
    this.updateTargetPosition(this.center.x, this.center.y)
  }
}
