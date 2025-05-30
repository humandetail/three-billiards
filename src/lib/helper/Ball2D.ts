export interface Ball2DSetting {
  radius: number
  bgColor: string
  bgColorDark: string
  guideLineColor: string
}

export default class Ball2D {
  center = {
    x: 0,
    y: 0,
  }

  setting: Ball2DSetting = {
    radius: 1,
    bgColor: '#F1F1F1',
    bgColorDark: '#DDD',
    guideLineColor: '#CCC',
  }

  constructor(options: Partial<Ball2DSetting> = {}) {
    this.setting = Object.assign({}, this.setting, options)
  }

  setRadius(radius: number) {
    this.setting.radius = radius
  }

  getRadius() {
    return this.setting.radius
  }

  setCenter(x: number, y: number) {
    this.center.x = x
    this.center.y = y
  }

  getCenter() {
    return this.center
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.drawBall(ctx)
    this.drawLightEffect(ctx)
    this.drawGuideLine(ctx)
  }

  drawBall(ctx: CanvasRenderingContext2D) {
    const { center, setting: { radius, bgColor, bgColorDark } } = this
    ctx.save()

    ctx.beginPath()

    ctx.shadowBlur = 15
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowOffsetX = 5
    ctx.shadowOffsetY = 5

    // 创建径向渐变（高光到阴影）
    const gradient = ctx.createRadialGradient(
      center.x - radius / 3,
      center.y - radius / 3,
      radius / 10, // 光源偏左上方，半径小（高光）
      center.x,
      center.y,
      radius, // 球中心，半径大（边缘阴影）
    )
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)') // 高光白色
    gradient.addColorStop(0.5, bgColor) // 球体主色（蓝色）
    gradient.addColorStop(1, bgColorDark) // 阴影深蓝色

    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.restore()
  }

  drawLightEffect(ctx: CanvasRenderingContext2D) {
    const { center, setting: { radius } } = this

    // 左上角高光
    ctx.save()

    const p1 = {
      x: center.x - radius * 0.5 * Math.cos(Math.PI / 4),
      y: center.y - radius * 0.5 * Math.sin(Math.PI / 4),
    }

    const cp = {
      x: center.x - radius * 0.75 * Math.cos(Math.PI / 4),
      y: center.y - radius * 0.75 * Math.sin(Math.PI / 4),
    }

    const p2 = {
      x: center.x - radius * 0.9 * Math.cos(Math.PI / 4 - Math.PI / 8),
      y: center.y - radius * 0.9 * Math.sin(Math.PI / 4 - Math.PI / 8),
    }

    const p3 = {
      x: center.x - radius * 0.9 * Math.cos(Math.PI / 4 + Math.PI / 8),
      y: center.y - radius * 0.9 * Math.sin(Math.PI / 4 + Math.PI / 8),
    }

    ctx.beginPath()
    ctx.lineCap = 'round'
    ctx.moveTo(p1.x, p1.y)
    ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y)
    ctx.quadraticCurveTo(
      center.x - radius * Math.cos(Math.PI / 4),
      center.y - radius * Math.cos(Math.PI / 4),
      p3.x,
      p3.y,
    )
    ctx.quadraticCurveTo(cp.x, cp.y, p1.x, p1.y)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fill()

    ctx.restore()

    // // 下面来个半月牙
    // {
    //   ctx.save()

    //   const p1 = {
    //     x: center.x - radius * 0.8 * Math.cos(Math.PI / 4),
    //     y: center.y + radius * 0.75 * Math.cos(Math.PI / 4),
    //   }

    //   const p2 = {
    //     x: center.x + radius * 0.8 * Math.cos(Math.PI / 4),
    //     y: center.y + radius * 0.75 * Math.cos(Math.PI / 4),
    //   }

    //   ctx.beginPath()
    //   ctx.lineCap = 'round'
    //   ctx.moveTo(p1.x, p1.y)
    //   ctx.quadraticCurveTo(center.x, center.y + radius * 1.1, p2.x, p2.y)
    //   ctx.quadraticCurveTo(center.x, center.y + radius * 0.75, p1.x, p1.y)
    //   ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
    //   ctx.fill()
    //   // ctx.stroke()

    //   ctx.restore()
    // }

    // // 右边再来个小曲线
    // {
    //   ctx.save()

    //   const p1 = {
    //     x: center.x + radius * 0.9 * Math.cos(Math.PI / 4),
    //     y: center.y - radius * 0.6 * Math.cos(Math.PI / 4),
    //   }

    //   const cp = {
    //     x: center.x + radius * Math.cos(Math.PI / 4 - Math.PI / 8),
    //     y: center.y - radius * Math.cos(Math.PI / 4 + Math.PI / 6),
    //   }

    //   const p2 = {
    //     x: center.x + radius * 0.9,
    //     y: center.y,
    //   }

    //   ctx.beginPath()
    //   ctx.moveTo(p1.x, p1.y)
    //   ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y)
    //   // ctx.lineTo(p2.x, p2.y)
    //   ctx.lineWidth = 2
    //   ctx.lineCap = 'round'
    //   ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    //   ctx.stroke()

    //   ctx.restore()
    // }
  }

  drawGuideLine(ctx: CanvasRenderingContext2D) {
    const { center, setting: { radius } } = this
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(center.x, center.y - radius)
    ctx.lineTo(center.x, center.y + radius)
    ctx.moveTo(center.x - radius, center.y)
    ctx.lineTo(center.x + radius, center.y)
    ctx.strokeStyle = this.setting.guideLineColor
    ctx.setLineDash([radius / 10])
    ctx.stroke()
    ctx.restore()
  }
}
