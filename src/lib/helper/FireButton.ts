// import { createNoise2D } from 'simplex-noise'
// import { createCanvas } from '../utils'
// import Vector from '../utils/Vector'

import { createCanvas } from '../../utils'

// interface Settings {
//   x: number
//   y: number
//   iterations: number
//   zoom: number
//   strength: number
//   alpha: number
//   numberOfParticles: number
//   size: number
// }

// const noise2D = createNoise2D()

// class Particle {
//   pos: Vector
//   vel: Vector
//   color: string

//   constructor(x: number, y: number, settings: Settings) {
//     this.pos = new Vector(x, y)

//     const noise = noise2D(x / settings.zoom, y / settings.zoom)
//     const angle = noise * Math.PI * 2
//     const vx = Math.cos(angle)
//     const vy = Math.sin(angle)

//     this.vel = new Vector(vx, vy)
//     const hue = Math.random() * 50 - 20
//     this.color = `hsla(${hue}, 100%, 50%, ${settings.alpha})`
//   }

//   move(acc: Vector, gravity: Vector): void {
//     this.vel.addTo(acc)
//     this.vel.addTo(gravity)
//     this.pos.addTo(this.vel)

//     if (this.vel.getLength() > 2) {
//       this.vel.setLength(2)
//     }
//   }

//   draw(ctx: CanvasRenderingContext2D, size: number): void {
//     ctx.fillStyle = this.color
//     ctx.fillRect(this.pos.x, this.pos.y, size, size)
//   }
// }

// export default class ParticleSystem {
//   public canvas!: HTMLCanvasElement
//   private ctx!: CanvasRenderingContext2D
//   private particles: Particle[] = []
//   private settings: Settings = {
//     x: 0,
//     y: -0.05,
//     iterations: 10,
//     zoom: 1,
//     strength: 2000,
//     alpha: 0.09,
//     numberOfParticles: 3000,
//     size: 1,
//   }

//   private requestId = 0
//   private lastTime = 0
//   private duration = 5 * 1000

//   constructor(private width: number, private height: number, private radius: number) {
//     this.setup()
//   }

//   private setup() {
//     this.settings.numberOfParticles = Math.min(Math.ceil(this.width * this.height * 200), 5000)

//     this.canvas = createCanvas(this.width, this.height)
//     this.ctx = this.canvas.getContext('2d')!
//   }

//   private setupParticles(): void {
//     this.particles = []
//     const r = this.radius / 2
//     const deltaAngle = Math.PI * 2 / this.settings.numberOfParticles

//     for (let i = 0; i < this.settings.numberOfParticles; i++) {
//       const angle = i * deltaAngle
//       const x = Math.cos(angle) * r + this.width / 2
//       const y = Math.sin(angle) * r + this.height / 2
//       this.particles.push(new Particle(x, y, this.settings))
//     }
//   }

//   private clear(): void {
//     // this.ctx.globalCompositeOperation = 'source-over'
//     // this.ctx.fillStyle = '#000'
//     // this.ctx.fillRect(0, 0, this.width, this.height)
//     this.ctx.clearRect(0, 0, this.width, this.height)
//     this.ctx.globalCompositeOperation = 'lighter'
//   }

//   private animateParticles(): void {
//     this.requestId = requestAnimationFrame(() => this.animateParticles())

//     const currentTime = performance.now()
//     if (currentTime - this.lastTime > this.duration) {
//       this.init()
//       return
//     }

//     const gravity = new Vector(this.settings.x, this.settings.y)
//     const zoom = this.settings.zoom
//     const offset = 8000
//     const noise = new Vector(0, 0)

//     for (let i = 0; i < this.settings.iterations; i++) {
//       this.particles.forEach(p => {
//         p.draw(this.ctx, this.settings.size)

//         const strength = noise2D(
//           p.pos.x / zoom + offset,
//           p.pos.y / zoom + offset,
//         ) * this.settings.strength + 0.01

//         const angle = noise2D(
//           p.pos.x / zoom,
//           p.pos.y / zoom,
//         ) * Math.PI * 2

//         noise.x = Math.cos(angle) * strength
//         noise.y = Math.sin(angle) * strength

//         p.move(noise, gravity)
//       })
//     }
//   }

//   public init(): void {
//     cancelAnimationFrame(this.requestId)
//     this.lastTime = performance.now()

//     this.clear()

//     this.setupParticles()
//     this.animateParticles()
//   }
// }

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
