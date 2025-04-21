import Hammer from 'hammerjs'
import { createCanvas } from '../utils'

export default class ForceHelper {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  width: number
  height: number

  #progress = 0
  
  constructor(el: string | HTMLElement, public maxForce = 500) {
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

    oEl.appendChild(this.canvas)

    this.init()
  }

  get barSize() {
    return {
      width: Math.min(this.width * 0.8, 24),
      height: this.height * 0.8
    }
  }

  get gradient() {
    const { ctx, height } = this
    const gradient = ctx.createLinearGradient(0, height * 0.1, 0, height * 0.9)
    gradient.addColorStop(0, 'green')
    gradient.addColorStop(0.5, 'yellow')
    gradient.addColorStop(1, 'red')
    return gradient
  }

  get progress() {
    return this.#progress
  }
  set progress(value: number) {
    this.#progress = Math.min(Math.max(0, value), 1)
    this.draw()
  }

  get currentForce() {
    return Math.round(this.maxForce * this.progress)
  }

  init() {
    this.initEvent()
    this.draw()
  }

  initEvent() {
    const mc = new Hammer(this.canvas)
    mc.get('pan').set({ threshold: 10, direction: Hammer.DIRECTION_ALL })

    mc.on('panstart', () => {
      this.draw()
    })
    mc.on('panmove', e => {
      this.progress = e.deltaY / this.barSize.height
    })
    mc.on('panend', e => {
      this.progress = e.deltaY / this.barSize.height
    })
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height)
    this.drawForce()
    this.drawBody()
    this.drawProgress()
  }

  #addShape(progress = 1) {
    const { ctx, width, height, barSize } = this
    const radius = Math.min(barSize.width, barSize.height) / 2
    ctx.roundRect(
      (width - barSize.width) / 2,
      (height - barSize.height) / 2,
      barSize.width,
      barSize.height * progress,
      radius
    )
  }

  drawForce() {
    const { ctx, width, progress } = this

    ctx.save()

    const fillStyle = progress > 0.7
      ? '#f00'
      : progress > 0.4
        ? '#fa0'
        : '#0f0'
    
    ctx.beginPath()
    ctx.fillStyle = fillStyle
    ctx.font = 'Bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowBlur = 1
    ctx.shadowColor = '#fff'
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.fillText(this.currentForce.toString(), width / 2, 16)
    ctx.beginPath()
    ctx.shadowColor = '#000'
    ctx.shadowOffsetX = -1
    ctx.shadowOffsetY = -1
    ctx.fillText(this.currentForce.toString(), width / 2, 16)

    ctx.restore()
  }

  drawBody() {
    const { ctx } = this

    ctx.save()
    
    ctx.shadowBlur = 10
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.strokeStyle = '#666'
    ctx.beginPath()
    this.#addShape()
    ctx.stroke()

    ctx.restore()
  }

  drawProgress() {
    const { ctx } = this

    ctx.save()
    
    ctx.fillStyle = this.gradient
    ctx.beginPath()
    this.#addShape(this.progress)
    ctx.fill()

    ctx.restore()
  }

  reset() {
    this.progress = 0
  }

  updateMaxForce(force: number) {
    this.maxForce = force
  }
}