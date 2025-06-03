import { BilliardsStatus, context, emitter, EventTypes } from '../../central-control'
import { toRadians } from '../../config'
import { createCanvas } from '../../utils'
import ArrowButton from './ArrowButton'
import Ball2D from './Ball2D'

export default class AngleDemodulator extends Ball2D {
  #angle = 0
  width = 0
  height = 0
  padding = 0
  ballRadius = 0
  arcRadius = 0
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  isDragging = false

  plusBtn: ArrowButton
  minusBtn: ArrowButton

  constructor(el: string | HTMLElement) {
    const oEl = typeof el === 'string'
      ? document.querySelector<HTMLElement>(el)
      : el

    if (!oEl || !('innerHTML' in oEl)) {
      throw new Error('Invalid element')
    }

    const { width, height } = oEl.getBoundingClientRect()
    const padding = Math.min(width, height) * 0.1

    const ballRadius = padding * 1.5

    super({
      radius: ballRadius,
    })

    this.width = width
    this.height = height

    this.canvas = createCanvas(width, height)
    this.ctx = this.canvas.getContext('2d')!
    oEl.appendChild(this.canvas)

    this.ballRadius = ballRadius
    this.padding = padding
    this.arcRadius = Math.min(width, height) * 0.8 - padding

    this.setCenter(ballRadius, height - ballRadius)
    this.angle = 0

    const oPlusBtn = document.createElement('canvas')
    oPlusBtn.className = 'btn btn-plus'

    const oMinusBtn = document.createElement('canvas')
    oMinusBtn.className = 'btn btn-minus'
    oEl.appendChild(oPlusBtn)
    oEl.appendChild(oMinusBtn)

    oPlusBtn.style.cssText = `
      position: absolute;
      left: ${0}px;
      top: ${padding / 2}px;
      transform-origin: center center;
      transform: rotate(90deg);
    `
    oMinusBtn.style.cssText = `
      position: absolute;
      right: ${padding / 2}px;
      bottom: ${0}px;
      transform-origin: center center;
      transform: rotate(0deg);
    `

    this.plusBtn = new ArrowButton(oPlusBtn, 0, () => {
      this.angle += 1
    })
    this.minusBtn = new ArrowButton(oMinusBtn, 0, () => {
      this.angle -= 1
    })
    this.init()
  }

  get angle() {
    return this.#angle
  }

  set angle(value: number) {
    this.#angle = Math.max(0, Math.min(90, value))
    this.draw()
  }

  get angleRadian() {
    return toRadians(this.angle)
  }

  init() {
    this.initEvents()

    emitter.on(EventTypes.targetPoint, () => {
      this.draw()
    })

    emitter.on(EventTypes.force, () => {
      this.draw()
    })

    this.draw()
  }

  initEvents() {
    const { canvas } = this
    // 鼠标事件处理

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (this.isDragging) {
        this.angle = this.#getAngleFromMouse(Object.hasOwn(e, 'touches') ? (e as TouchEvent).touches[0] : (e as MouseEvent))
      }
    }

    const handleUp = () => {
      this.isDragging = false
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      document.removeEventListener('mouseleave', handleUp)
    }

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true
      this.angle = this.#getAngleFromMouse(e)

      document.addEventListener('mousemove', handleMove)

      document.addEventListener('mouseup', handleUp)

      document.addEventListener('mouseleave', handleUp)
    })

    // 触摸事件处理
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      this.isDragging = true
      this.angle = this.#getAngleFromMouse(e.touches[0])

      document.addEventListener('touchmove', handleMove)

      document.addEventListener('touchend', handleUp)
    })

    emitter.on(EventTypes.status, (status) => {
      if (status === BilliardsStatus.Advanced) {
        this.plusBtn.show()
        this.minusBtn.show()
      }
    })
  }

  draw() {
    this.clear()
    super.draw(this.ctx)

    this.drawDemodulator()
    this.drawCue()
    this.drawText()
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  drawDemodulator() {
    const { ctx, width, height, padding } = this

    ctx.save()

    const startAngle = 0
    const endAngle = Math.PI * 1.5

    // 背景圆弧
    ctx.beginPath()
    ctx.arc(0, height, Math.min(width, height) - padding, startAngle, endAngle, true)
    ctx.lineWidth = padding * 2
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.stroke()

    // // 绘制刻度
    // ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    // ctx.lineWidth = 2
    // ctx.font = `bold ${arcRadius * 0.1}px Arial`

    // for (let i = 0; i <= 90; i += 15) {
    //   const angle = (i / 90) * (Math.PI / 2)
    //   const startX = center.x + (arcRadius * 0.9) * Math.cos(angle)
    //   const startY = center.y - (arcRadius * 0.9) * Math.sin(angle)
    //   const endX = center.x + arcRadius * Math.cos(angle)
    //   const endY = center.y - arcRadius * Math.sin(angle)

    //   ctx.beginPath()
    //   ctx.moveTo(startX, startY)
    //   ctx.lineTo(endX, endY)
    //   ctx.stroke()

    //   // 绘制刻度值
    //   if (i % 15 === 0 && i !== 0 && i !== 90) {
    //     const textX = center.x + (arcRadius * 1.1) * Math.cos(angle)
    //     const textY = center.y - (arcRadius * 1.1) * Math.sin(angle) + 5
    //     ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    //     ctx.textAlign = 'center'
    //     ctx.textBaseline = 'middle'
    //     ctx.fillText(`${i}°`, textX, textY)
    //   }
    // }

    ctx.restore()
  }

  drawCue() {
    const { ctx, center, ballRadius, arcRadius, angle } = this
    const { targetPoint, safePercent, force } = context

    ctx.save()

    const L = targetPoint.y * ballRadius * safePercent
    const mergeX = L * Math.sin(toRadians(-angle))
    const mergeY = -L * Math.cos(toRadians(-angle))
    ctx.translate(center.x + mergeX, center.y + mergeY)

    const forceDistance = force * ballRadius / 2

    const minR = ballRadius * 1.1 + forceDistance
    const maxR = arcRadius * 0.88 + forceDistance

    const A = {
      x: Math.cos(toRadians(angle + 2)) * minR,
      y: -Math.sin(toRadians(angle + 2)) * minR,
    }
    const B = {
      x: Math.cos(toRadians(angle + 1)) * maxR,
      y: -Math.sin(toRadians(angle + 1)) * maxR,
    }
    const C = {
      x: Math.cos(toRadians(angle - 1)) * maxR,
      y: -Math.sin(toRadians(angle - 1)) * maxR,
    }
    const D = {
      x: Math.cos(toRadians(angle - 2)) * minR,
      y: -Math.sin(toRadians(angle - 2)) * minR,
    }

    // 计算梯形中心线方向，用作渐变方向
    const midTop = {
      x: (A.x + D.x) / 2,
      y: (A.y + D.y) / 2,
    }
    const midBottom = {
      x: (B.x + C.x) / 2,
      y: (B.y + C.y) / 2,
    }

    // 创建线性渐变，方向从内向外
    const gradient = ctx.createLinearGradient(midBottom.x, midBottom.y, midTop.x, midTop.y)

    gradient.addColorStop(0, '#282C38')
    gradient.addColorStop(0.4, '#282C38')
    gradient.addColorStop(0.401, '#FBCB79')
    gradient.addColorStop(0.92, '#FBCB79')
    gradient.addColorStop(0.921, '#FFFEFA')
    gradient.addColorStop(0.97, '#FFFEFA')
    gradient.addColorStop(0.971, '#0088FF')
    gradient.addColorStop(1, '#0088FF')

    // 画个梯形
    ctx.beginPath()
    ctx.moveTo(A.x, A.y)
    ctx.lineTo(B.x, B.y)
    ctx.lineTo(C.x, C.y)
    ctx.lineTo(D.x, D.y)
    ctx.closePath()
    // ctx.strokeStyle = '#FFD700'
    // ctx.lineWidth = 1
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.restore()
  }

  drawText() {
    const { ctx, padding, width, angle } = this

    ctx.font = `bold ${padding}px Arial`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${angle}°`, width - padding, padding)
  }

  // 计算鼠标位置对应的角度
  #getAngleFromMouse(event: MouseEvent | Touch) {
    const { canvas, center } = this
    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    // 计算相对于圆心的角度
    const deltaX = mouseX - center.x
    const deltaY = center.y - mouseY // 反转Y轴
    let angle = Math.atan2(deltaY, deltaX)

    // 将角度限制在0到π/2范围内
    if (angle < 0)
      angle += Math.PI * 2
    if (angle > Math.PI / 2) {
      if (angle < Math.PI) {
        angle = Math.PI / 2
      }
      else {
        angle = 0
      }
    }

    // 转换为0-90度
    const degrees = Math.round(angle * 180 / Math.PI)
    return Math.min(90, Math.max(0, degrees))
  }
}
