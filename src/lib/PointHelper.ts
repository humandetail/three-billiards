import Hammer from 'hammerjs'
import { createCanvas } from '../utils'
export default class PointHelper {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  width: number
  height: number

  targetPosition = {
    x: 0,
    y: 0
  }
  targetRadius = 4

  ballRadius = 24
  safeRadius = 20

  isDragging = false

  constructor(el: string | HTMLElement) {
    const oEl = typeof el === 'string'
      ? document.querySelector<HTMLElement>(el)
      : el

    if (!oEl || !('innerHTML' in oEl)) {
      throw new Error('Invalid element')
    }


    const { width, height } = oEl.getBoundingClientRect()
    this.width = width
    this.height = height

    this.canvas = createCanvas(width, height)
    this.ctx = this.canvas.getContext('2d')!

    this.targetPosition.x = width / 2
    this.targetPosition.y = height / 2

    this.ballRadius = Math.floor(Math.min(width, height) * 0.9 / 2)
    this.targetRadius = Math.floor(Math.max(this.ballRadius / 10, 4))
    this.safeRadius = this.ballRadius - this.targetRadius

    oEl.appendChild(this.canvas)

    this.initEvent()

    this.draw()
  }

  get center() {
    return {
      x: this.width / 2,
      y: this.height / 2
    }
  }

  getPosition(radius = this.ballRadius) {
    const { targetPosition, center, ballRadius } = this
    return {
      x: radius * (targetPosition.x - center.x) / ballRadius,
      y: radius * (targetPosition.y - center.y) / ballRadius,
    }
  }

  initEvent() {
    const { canvas } = this

    const hm = new Hammer(canvas)
    hm.get('pan').set({ direction: Hammer.DIRECTION_ALL, threshold: 0 })

    hm.on('panstart', e => {
      const rect = canvas.getBoundingClientRect();
      const x = e.center.x - rect.left;
      const y = e.center.y - rect.top;

      if (this.isTargetClicked(x, y)) {
        this.isDragging = true;
        console.log('?')
        document.body.style.cursor = 'grabbing';
      }
    })

    hm.on('panmove', e => {
      if (this.isDragging) {
        const rect = canvas.getBoundingClientRect();
        const x = e.center.x - rect.left;
        const y = e.center.y - rect.top;

        this.updateTargetPosition(x, y);
      }
    })

    hm.on('panend', () => {
      this.isDragging = false;
      document.body.style.cursor = 'default';
    })

    hm.on('panleave', () => {
      this.isDragging = false;
      document.body.style.cursor = 'default';
    })
  }

  draw() {
    const { ctx, width, height } = this
    ctx.clearRect(0, 0, width, height)

    this.drawBall()

    this.drawGuideLine()
    this.drawTarget()

    this.drawDiff()
  }

  drawBall() {
    const { ctx, center, ballRadius } = this
    ctx.save()

    ctx.beginPath()

    ctx.shadowBlur = 10
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    ctx.arc(center.x, center.y, ballRadius, 0, Math.PI * 2)
    ctx.strokeStyle = '#555'
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.stroke()

    ctx.restore()
  }

  drawGuideLine() {
    const { ctx, width, height, center, ballRadius } = this
    ctx.save()
    const diffX = Math.ceil(width / 2 - ballRadius)
    const diffY = Math.ceil(height / 2 - ballRadius)
    ctx.beginPath()
    ctx.moveTo(center.x, diffY)
    ctx.lineTo(center.x, height - diffY)
    ctx.moveTo(diffX, center.y)
    ctx.lineTo(width - diffX, center.y)
    ctx.strokeStyle = '#ccc'
    ctx.setLineDash([ballRadius / 10])
    ctx.stroke()
    ctx.restore()
  }

  drawTarget() {
    const { ctx, targetPosition, targetRadius } = this
    ctx.save()
    ctx.beginPath();
    ctx.arc(targetPosition.x, targetPosition.y, targetRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'red'
    ctx.fill();
    ctx.restore();
  }

  drawDiff() {
    const { ctx, targetPosition, center } = this
    const text = `(${(targetPosition.x - center.x).toFixed(1)}, ${(center.y - targetPosition.y).toFixed(1)})`

    ctx.save()
    ctx.beginPath()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'Bold 12px Arial'
    ctx.fillText(text, center.x, center.y)
    ctx.stroke()
    ctx.restore()
  }

  isTargetClicked(x: number, y: number) {
    const { targetPosition, targetRadius } = this
    const distance = Math.sqrt((x - targetPosition.x) ** 2 + (y - targetPosition.y) ** 2);

    return distance <= targetRadius * 2;
  }

  // 更新点位置
  updateTargetPosition(x: number, y: number) {
    const { targetPosition, width, height, safeRadius } = this
    const cx = width / 2
    const cy = height / 2

    // 计算极坐标
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle < 0) angle += 360;

    // 检查是否在圆内
    const isInSafe = r <= safeRadius;
    if (!isInSafe) {
      // 计算缩放比例
      const scale = safeRadius / r;
      // 计算新的坐标
      targetPosition.x = cx + dx * scale;
      targetPosition.y = cy + dy * scale;
    } else {
      targetPosition.x = x
      targetPosition.y = y
    }
    console.log(targetPosition)
    this.draw();
  }

  resetTarget() {
    this.updateTargetPosition(this.center.x, this.center.y)
  }
}