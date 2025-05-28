import Hammer from 'hammerjs'
import { BilliardsStatus, context, emitter, EventTypes, setContext } from '../../central-control'
import { createCanvas } from '../../utils'
import FireButton from './FireButton'

export default class ForceHelper {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  width: number
  height: number

  gradientColors = [
    '#00FFE0', // 霓虹蓝绿
    '#00F5FF', // 青色火焰
    '#F9F9F9', // 炽热白
    '#FFEA00', // 亮黄色
    '#FFB800', // 琥珀色
    '#FF7E00', // 橙色
    '#DD2476', // 深粉色
    '#FF512F', // 红橙色
    '#8E2DE2', // 紫罗兰
    '#4A00E0', // 深紫色基底
  ]

  bgGradientColors = [
    '#333',
    '#111',
  ]

  flameColors = ['#FF4500', '#FF8C00', '#FFD700', '#FFF', '#00F5FF']

  scale = {
    size: 12,
    gap: 2,
    length: 0,
    radius: 2,
  }

  btnRadius = 10
  bodyRadius = 4
  fontSize = 16
  componentGap = 4

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

    this.fontSize = Math.min(16, width * 0.8)
    this.btnRadius = Math.min(10, width * 0.6)
    oEl.appendChild(this.canvas)

    this.init()
  }

  get barSize() {
    const {
      componentGap: gap,
      fontSize,
      btnRadius,
      width,
      height,
    } = this
    const start = gap + fontSize + gap + btnRadius * 2 + gap
    const end = height - gap - btnRadius * 2 - gap
    return {
      width: Math.min(width * 0.8, 32),
      height: end - start,
      start,
      end,
    }
  }

  get gradient() {
    const { ctx, barSize: { start, end }, gradientColors } = this
    const gradient = ctx.createLinearGradient(0, start, 0, end)
    const length = gradientColors.length

    gradientColors.forEach((color, index) => {
      gradient.addColorStop(index / (length - 1), color)
    })

    return gradient
  }

  get bgGradient() {
    const bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.height)
    this.bgGradientColors.forEach((color, index) => {
      bgGradient.addColorStop(index / (this.bgGradientColors.length - 1), color)
    })
    return bgGradient
  }

  get progress() {
    return this.#progress
  }

  set progress(value: number) {
    this.#progress = Math.min(Math.max(0, value), 1)
    if (context.status === BilliardsStatus.Idle) {
      emitter.emit(EventTypes.force, Math.round(this.#progress * this.maxForce))
    }
    this.draw()
  }

  get currentForce() {
    return Math.round(this.maxForce * this.progress)
  }

  init() {
    this.initScale()
    this.initEvent()
    this.draw()

    this.drawButton()
  }

  initScale() {
    const { scale, barSize: { height: barHeight } } = this
    let { gap, size } = scale
    const len = Math.floor((barHeight - gap) / (size + gap))
    gap = +((barHeight - size * len) / (len + 1)).toFixed(2)
    while (gap > 3) {
      size += 1
      gap = +((barHeight - size * len) / (len + 1)).toFixed(2)
    }
    Object.assign(this.scale, { gap, size, length: len })
  }

  initEvent() {
    const hm = new Hammer(this.canvas)
    hm.get('pan').set({ threshold: 0, direction: Hammer.DIRECTION_ALL })
    // hm.get('press').set({ time: 200 }).requireFailure(hm.get('pan'))

    const { height, barSize: { height: barHeight } } = this
    const rect = this.canvas.getBoundingClientRect()
    const setProgress = (e: HammerInput) => {
      if ([BilliardsStatus.Idle, BilliardsStatus.Staging].includes(context.status)) {
        this.progress = (e.center.y - rect.top - (height - barHeight) / 2) / barHeight
        setContext('status', BilliardsStatus.Staging)
      }
    }
    // hm.on('press', (e) => {
    //   setProgress(e)
    //   console.log(this.currentForce)
    //   if (this.currentForce < 100) {
    //     // @todo - 进入高级控制模式
    //     // return
    //   }
    //   setContext('status', BilliardsStatus.Release)
    // })

    hm.on('panstart', () => {
      this.draw()
    })
    hm.on('panmove', setProgress)
    hm.on('panend', (e) => {
      setProgress(e)
      if (this.currentForce < 100) {
        // @todo - 进入高级控制模式
        // return
      }
      if (context.status === BilliardsStatus.Staging) {
        setContext('status', BilliardsStatus.Release)
      }
    })
  }

  setFont(fontSize = this.fontSize) {
    const { ctx } = this
    ctx.font = `Bold ${fontSize}px 'Helvetica Neue', Arial, 'Noto Sans', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.letterSpacing = `${fontSize / 10}`
  }

  draw() {
    this.clear()
    this.drawForceText()

    this.drawScale()
    this.drawProgressMask()
    this.drawBarBody()
    this.drawEffect()
  }

  clear() {
    const { width, height, ctx } = this
    // ctx.fillStyle = bgGradient
    // ctx.fillRect(0, 0, width, height)
    ctx.clearRect(0, 0, width, height)
  }

  drawForceText() {
    const { ctx, width, componentGap, progress, gradientColors, fontSize } = this

    const fontColor = gradientColors[Math.floor((gradientColors.length - 1) * progress)]

    ctx.save()
    ctx.translate(width / 2, componentGap + fontSize / 2)

    ctx.fillStyle = '#fff'
    this.setFont(fontSize)

    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.shadowBlur = 1
      ctx.shadowColor = fontColor
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = i + 1
      ctx.fillText(this.currentForce.toString(), 0, 0)
    }

    ctx.restore()
  }

  drawButton() {
    const { width, barSize, btnRadius, componentGap } = this

    const size = (btnRadius + componentGap) * 2 / devicePixelRatio
    for (let i = 0; i < 2; i++) {
      const particleSystem = new FireButton(i === 0 ? 'ice' : 'fire', size, size, btnRadius / devicePixelRatio)

      this.canvas.parentElement!.appendChild(particleSystem.canvas)
      particleSystem.canvas.style.cssText = `
        position: absolute;
        left: ${width / 2 - btnRadius - componentGap}px;
        top: ${(i === 0 ? barSize.start - (componentGap + btnRadius) * 2 : barSize.end)}px;
      `
    }
  }

  drawBarBody() {
    const { ctx, width, barSize, bodyRadius } = this

    ctx.save()

    ctx.translate((width - barSize.width) / 2, barSize.start)

    ctx.shadowBlur = 10
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.strokeStyle = '#666'
    ctx.beginPath()
    ctx.roundRect(
      0,
      0,
      barSize.width,
      barSize.height,
      bodyRadius,
    )
    ctx.stroke()

    ctx.restore()
  }

  drawScale() {
    const {
      ctx,
      width,
      scale: { gap, size, length, radius },
      barSize: { width: barWidth, start },
      gradient,
    } = this

    ctx.save()
    ctx.translate(width / 2, start)

    for (let i = 0; i < length; i++) {
      ctx.save()
      ctx.beginPath()

      ctx.fillStyle = gradient
      ctx.roundRect(-barWidth / 2 + gap, size * i + gap * (i + 1), barWidth - gap * 2, size, radius)
      ctx.fill()

      ctx.restore()
    }

    ctx.restore()
  }

  drawProgressMask() {
    const { ctx, width, barSize, progress, bodyRadius, bgGradient } = this

    ctx.save()
    ctx.globalCompositeOperation = 'xor'

    ctx.fillStyle = bgGradient
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.roundRect(
      (width - barSize.width) / 2,
      barSize.start + barSize.height * progress,
      barSize.width,
      barSize.height * (1 - progress),
      bodyRadius,
    )
    ctx.fill()

    ctx.restore()
  }

  drawEffect() {
    const {
      ctx,
      width,
      barSize: { height: barHeight, start },
      progress,
      flameColors,
    } = this

    // 添加火焰粒子效果(顶部)
    if (progress > 0.3) {
      const flameHeight = Math.min(30, barHeight * 0.3)
      const flameY = barHeight * progress - flameHeight

      ctx.save()
      ctx.translate(0, start)
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 15; i++) {
        const size = 2 + Math.random() * 4
        const offset = (Math.random() - 0.5) * 20
        const alpha = 0.3 + Math.random() * 0.7

        ctx.beginPath()
        ctx.arc(
          width / 2 + offset,
          flameY + Math.random() * flameHeight,
          size,
          0,
          Math.PI * 2,
        )

        // 随机选择火焰颜色
        ctx.fillStyle = flameColors[Math.floor(Math.random() * flameColors.length)]
        ctx.globalAlpha = alpha
        ctx.fill()
      }
      ctx.restore()
    }
  }

  reset() {
    this.progress = 0
  }

  updateMaxForce(force: number) {
    this.maxForce = force
  }
}
