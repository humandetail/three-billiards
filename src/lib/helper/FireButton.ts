import { createCanvas } from '../../utils'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  color: string
  alpha: number
}

export default class FireButton {
  public canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  particles: Particle[] = []
  isHovered = false
  mouse = { x: Number.NaN, y: Number.NaN }
  animationId = null
  resizeObserver = null
  pulsePhase = 0

  reqId = 0

  // 颜色配置
  colorSchemes = {
    fire: {
      gradients: [
        { color: '#ffef00', pos: 0 }, // 亮黄
        { color: '#ff7300', pos: 0.5 }, // 橙红
        { color: '#ff0000', pos: 1 }, // 深红
      ],
      particles: [
        '#FFD700', // 亮黄
        '#FFA500', // 橙色
        '#FF4500', // 红橙
      ],
      shadows: ['#ff6600', '#ff3300'],
      textGlow: 'rgba(255, 165, 0, 1)',
    },
    ice: {
      gradients: [
        { color: '#00f2ff', pos: 0 }, // 亮蓝
        { color: '#0066ff', pos: 0.5 }, // 道奇蓝
        { color: '#0033aa', pos: 1 }, // 深蓝
      ],
      particles: [
        '#00FFFF', // 亮蓝
        '#40E0D0', // 绿松石
        '#1E90FF', // 道奇蓝
      ],
      shadows: ['#0066ff', '#0033cc'],
      textGlow: 'rgba(30, 144, 255, 1)',
    },
  }

  get center() {
    return {
      x: this.width / 2,
      y: this.height / 2,
    }
  }

  constructor(private type: 'fire' | 'ice' = 'fire', private width = 64, private height: number = 32, private radius = 16) {
    this.canvas = createCanvas(width, height)
    this.ctx = this.canvas.getContext('2d')!

    this.initEvents()
    this.animate()
  }

  initEvents() {
    const getScaledPosition = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
        y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
      }
    }

    this.canvas.addEventListener('mousemove', (e) => {
      const pos = getScaledPosition(e)
      this.mouse = pos
    })

    this.canvas.addEventListener('mouseenter', () => {
      this.isHovered = true
    })
    this.canvas.addEventListener('mouseleave', () => {
      this.isHovered = false
      this.mouse = { x: Number.NaN, y: Number.NaN }
    })
  }

  createParticle() {
    const scheme = this.colorSchemes[this.type]
    return {
      x: this.center.x,
      y: this.center.y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 2,
      life: 100,
      color: scheme.particles[Math.floor(Math.random() * scheme.particles.length)],
      alpha: 1,
    } as Particle
  }

  updateParticles() {
    if (this.isHovered) {
      this.particles.push(this.createParticle())
    }

    this.particles = this.particles.filter((p) => {
      p.x += p.vx
      p.y += p.vy
      p.alpha -= 0.01
      p.size *= 0.98
      return p.alpha > 0
    })
  }

  drawButton() {
    const ctx = this.ctx
    const scheme = this.colorSchemes[this.type]

    // 清除画布
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // 呼吸效果参数
    this.pulsePhase = (this.pulsePhase + 0.03) % (Math.PI * 2)
    const pulse = Math.sin(this.pulsePhase) * 0.15 + 1

    // 按钮主体渐变
    const gradient = ctx.createLinearGradient(
      0,
      (this.height - this.radius * 2) / 2,
      0,
      this.radius * 2,
    )
    scheme.gradients.forEach(g => gradient.addColorStop(g.pos, g.color))

    // 绘制按钮形状
    ctx.beginPath()
    ctx.shadowBlur = this.radius * 0.8 * pulse
    ctx.shadowColor = pulse > 0.8 ? scheme.shadows[0] : scheme.shadows[1]
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.arc(
      this.center.x,
      this.center.y,
      this.radius,
      0,
      Math.PI * 2,
    )

    ctx.fillStyle = gradient
    ctx.fill()
    ctx.fill()
    ctx.fill()
    ctx.fill()
    ctx.fill()

    // 按钮文字
    ctx.font = `${this.radius * 2}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'

    // 文字发光呼吸效果
    if (this.isHovered) {
      ctx.shadowColor = scheme.textGlow
      ctx.shadowBlur = this.radius + Math.sin(this.pulsePhase * 2) * 5
    }

    ctx.fillText(
      this.type === 'fire' ? '+' : '-',
      this.center.x,
      this.center.y,
    )

    // 重置阴影
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
  }

  drawParticles() {
    this.ctx.globalCompositeOperation = 'lighter'
    this.particles.forEach((p) => {
      this.ctx.beginPath()
      const gradient = this.ctx.createRadialGradient(
        p.x,
        p.y,
        0,
        p.x,
        p.y,
        p.size,
      )
      gradient.addColorStop(0, `${p.color}ff`)
      gradient.addColorStop(1, `${p.color}00`)

      this.ctx.fillStyle = gradient
      this.ctx.arc(p.x, p.y, p.size * Math.random(), 0, Math.PI * 2)
      this.ctx.fill()
    })
    this.ctx.globalCompositeOperation = 'source-over'
  }

  animate() {
    this.updateParticles()
    this.drawButton()
    this.drawParticles()

    this.reqId = requestAnimationFrame(() => this.animate())
  }

  destroy() {
    cancelAnimationFrame(this.reqId)
  }
}
