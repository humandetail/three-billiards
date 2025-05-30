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

  plusButton: ArrowButton
  minusButton: ArrowButton

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

    this.setCenter(padding, height - padding)
    this.angle = 0

    this.plusButton = new ArrowButton('#btn-angle-demodulator-plus', 0, () => {
      this.angle += 1
    })
    this.minusButton = new ArrowButton('#btn-angle-demodulator-minus', 0, () => {
      this.angle -= 1
    })
    this.plusButton.canvas.style.cssText = `
      position: absolute;
      left: ${padding / 2}px;
      top: ${padding / 2}px;
      transform: rotate(135deg);
    `
    this.minusButton.canvas.style.cssText = `
      position: absolute;
      right: ${padding / 2}px;
      bottom: ${padding / 2}px;
      transform: rotate(-45deg);
    `
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
    const { ctx, arcRadius, center } = this

    const startAngle = 0
    const endAngle = Math.PI * 1.5

    // 背景圆弧
    ctx.beginPath()
    ctx.arc(center.x, center.y, arcRadius, startAngle, endAngle, true)
    ctx.lineTo(center.x, center.y)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.fill()

    // 绘制刻度
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 2
    ctx.font = `bold ${arcRadius * 0.1}px Arial`

    for (let i = 0; i <= 90; i += 15) {
      const angle = (i / 90) * (Math.PI / 2)
      const startX = center.x + (arcRadius * 0.9) * Math.cos(angle)
      const startY = center.y - (arcRadius * 0.9) * Math.sin(angle)
      const endX = center.x + arcRadius * Math.cos(angle)
      const endY = center.y - arcRadius * Math.sin(angle)

      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
      ctx.stroke()

      // 绘制刻度值
      if (i % 15 === 0 && i !== 0 && i !== 90) {
        const textX = center.x + (arcRadius * 1.1) * Math.cos(angle)
        const textY = center.y - (arcRadius * 1.1) * Math.sin(angle) + 5
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${i}°`, textX, textY)
      }
    }
  }

  drawCue() {
    const { ctx, center, ballRadius, arcRadius, angle } = this

    const minR = ballRadius * 1.1
    const maxR = arcRadius * 0.88

    const A = {
      x: center.x + Math.cos(toRadians(angle + 2)) * minR,
      y: center.y - Math.sin(toRadians(angle + 2)) * minR,
    }
    const B = {
      x: center.x + Math.cos(toRadians(angle + 1)) * maxR,
      y: center.y - Math.sin(toRadians(angle + 1)) * maxR,
    }
    const C = {
      x: center.x + Math.cos(toRadians(angle - 1)) * maxR,
      y: center.y - Math.sin(toRadians(angle - 1)) * maxR,
    }
    const D = {
      x: center.x + Math.cos(toRadians(angle - 2)) * minR,
      y: center.y - Math.sin(toRadians(angle - 2)) * minR,
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
    // gradient.addColorStop(0, '#0088FF');
    // gradient.addColorStop(0.03, '#0088FF');
    // gradient.addColorStop(0.031, '#FFFEFA');
    // gradient.addColorStop(0.12, '#FFFEFA');
    // gradient.addColorStop(0.121, '#FBCB79');
    // gradient.addColorStop(0.4, '#FBCB79');
    // gradient.addColorStop(0.6, '#FBCB79');
    // gradient.addColorStop(0.61, '#282C38');
    // gradient.addColorStop(1, '#282C38');

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

    // // 绘制指针
    // const pointerX = center.x + arcRadius * Math.cos(angleRadian)
    // const pointerY = center.y - arcRadius * Math.sin(angleRadian)

    // // 绘制指针线
    // ctx.beginPath()
    // ctx.moveTo(center.x, center.y)
    // ctx.lineTo(pointerX, pointerY)
    // ctx.strokeStyle = '#FFD700'
    // ctx.lineWidth = 2
    // ctx.stroke()

    // // 绘制指针头
    // ctx.beginPath()
    // ctx.arc(pointerX, pointerY, 8, 0, Math.PI * 2)
    // const gradient = ctx.createRadialGradient(
    //   pointerX,
    //   pointerY,
    //   5,
    //   pointerX,
    //   pointerY,
    //   20,
    // )
    // gradient.addColorStop(0, '#FFD700')
    // gradient.addColorStop(1, '#FFA500')
    // ctx.fillStyle = gradient
    // ctx.fill()

    // ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
    // ctx.lineWidth = 2
    // ctx.stroke()
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

// // 设置圆心在左下角（离边缘有一定距离）
// const padding = 50
// const centerX = padding
// const centerY = canvas.height - padding
// const radius = Math.min(canvas.width, canvas.height) * 0.8 - padding

// // 绘制角度调节器
// function drawAngleController() {
//   // 清除Canvas
//   ctx.clearRect(0, 0, canvas.width, canvas.height)

//   // 绘制背景网格
//   drawGridBackground()

//   // 绘制1/4圆弧
//   const startAngle = 0
//   const endAngle = Math.PI / 2

//   // 背景圆弧
//   ctx.beginPath()
//   ctx.arc(centerX, centerY, radius, startAngle, endAngle)
//   ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
//   ctx.lineWidth = 22
//   ctx.lineCap = 'round'
//   ctx.stroke()

//   // 当前角度圆弧
//   const currentAngleRad = (currentAngle / 90) * (Math.PI / 2)

//   ctx.beginPath()
//   ctx.arc(centerX, centerY, radius, startAngle, currentAngleRad)
//   ctx.strokeStyle = '#4ecca3'
//   ctx.lineWidth = 22
//   ctx.lineCap = 'round'
//   ctx.stroke()

//   // 绘制刻度
//   ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
//   ctx.lineWidth = 2
//   ctx.font = 'bold 18px Arial'

//   for (let i = 0; i <= 90; i += 10) {
//     const angle = (i / 90) * (Math.PI / 2)
//     const startX = centerX + (radius - 25) * Math.cos(angle)
//     const startY = centerY - (radius - 25) * Math.sin(angle)
//     const endX = centerX + radius * Math.cos(angle)
//     const endY = centerY - radius * Math.sin(angle)

//     ctx.beginPath()
//     ctx.moveTo(startX, startY)
//     ctx.lineTo(endX, endY)
//     ctx.stroke()

//     // 绘制刻度值
//     if (i % 30 === 0 || i === 0 || i === 90) {
//       const textX = centerX + (radius - 45) * Math.cos(angle)
//       const textY = centerY - (radius - 45) * Math.sin(angle) + 5
//       ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
//       ctx.textAlign = 'center'
//       ctx.textBaseline = 'middle'
//       ctx.fillText(`${i}°`, textX, textY)
//     }
//   }

//   // 绘制指针
//   const pointerX = centerX + radius * Math.cos(currentAngleRad)
//   const pointerY = centerY - radius * Math.sin(currentAngleRad)

//   // 绘制指针线
//   ctx.beginPath()
//   ctx.moveTo(centerX, centerY)
//   ctx.lineTo(pointerX, pointerY)
//   ctx.strokeStyle = '#FFD700'
//   ctx.lineWidth = 4
//   ctx.stroke()

//   // 绘制指针头
//   ctx.beginPath()
//   ctx.arc(pointerX, pointerY, 20, 0, Math.PI * 2)
//   const gradient = ctx.createRadialGradient(
//     pointerX,
//     pointerY,
//     5,
//     pointerX,
//     pointerY,
//     20,
//   )
//   gradient.addColorStop(0, '#FFD700')
//   gradient.addColorStop(1, '#FFA500')
//   ctx.fillStyle = gradient
//   ctx.fill()

//   ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
//   ctx.lineWidth = 2
//   ctx.stroke()

//   // 绘制中心点
//   ctx.beginPath()
//   ctx.arc(centerX, centerY, 12, 0, Math.PI * 2)
//   ctx.fillStyle = '#FFD700'
//   ctx.fill()
//   ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
//   ctx.lineWidth = 2
//   ctx.stroke()

//   // 绘制角度值
//   ctx.font = 'bold 28px Arial'
//   ctx.fillStyle = '#4ecca3'
//   ctx.textAlign = 'center'
//   ctx.fillText(`当前角度: ${currentAngle}°`, canvas.width / 2, canvas.height - 40)

//   // 绘制0°和90°标记
//   ctx.font = 'bold 22px Arial'
//   ctx.fillStyle = '#FFD700'
//   ctx.fillText('0° →', centerX + radius + 20, centerY - 10)
//   ctx.fillText('90° ↑', centerX - 10, centerY - radius - 25)
// }

// // 绘制网格背景
// function drawGridBackground() {
//   ctx.strokeStyle = 'rgba(100, 150, 200, 0.1)'
//   ctx.lineWidth = 1

//   // 水平线
//   for (let y = 0; y <= canvas.height; y += 20) {
//     ctx.beginPath()
//     ctx.moveTo(0, y)
//     ctx.lineTo(canvas.width, y)
//     ctx.stroke()
//   }

//   // 垂直线
//   for (let x = 0; x <= canvas.width; x += 20) {
//     ctx.beginPath()
//     ctx.moveTo(x, 0)
//     ctx.lineTo(x, canvas.height)
//     ctx.stroke()
//   }

//   // 绘制中心点标记
//   ctx.beginPath()
//   ctx.arc(centerX, centerY, 5, 0, Math.PI * 2)
//   ctx.fillStyle = '#FF0000'
//   ctx.fill()
// }

// // 更新角度显示
// function updateAngleDisplay() {
//   angleValue.textContent = currentAngle
// }

// // 计算鼠标位置对应的角度
// function getAngleFromMouse(event) {
//   const rect = canvas.getBoundingClientRect()
//   const mouseX = event.clientX - rect.left
//   const mouseY = event.clientY - rect.top

//   // 计算相对于圆心的角度
//   const deltaX = mouseX - centerX
//   const deltaY = centerY - mouseY // 反转Y轴
//   let angle = Math.atan2(deltaY, deltaX)

//   // 将角度限制在0到π/2范围内
//   if (angle < 0)
//     angle += Math.PI * 2
//   if (angle > Math.PI / 2) {
//     if (angle < Math.PI) {
//       angle = Math.PI / 2
//     }
//     else {
//       angle = 0
//     }
//   }

//   // 转换为0-90度
//   const degrees = Math.round(angle * 180 / Math.PI)
//   return Math.min(90, Math.max(0, degrees))
// }

// // 鼠标事件处理
// canvas.addEventListener('mousedown', (e) => {
//   isDragging = true
//   currentAngle = getAngleFromMouse(e)
//   updateAngleDisplay()
//   drawAngleController()
// })

// canvas.addEventListener('mousemove', (e) => {
//   if (isDragging) {
//     currentAngle = getAngleFromMouse(e)
//     updateAngleDisplay()
//     drawAngleController()
//   }
// })

// canvas.addEventListener('mouseup', () => {
//   isDragging = false
// })

// canvas.addEventListener('mouseleave', () => {
//   isDragging = false
// })

// // 触摸事件处理
// canvas.addEventListener('touchstart', (e) => {
//   e.preventDefault()
//   isDragging = true
//   currentAngle = getAngleFromMouse(e.touches[0])
//   updateAngleDisplay()
//   drawAngleController()
// })

// canvas.addEventListener('touchmove', (e) => {
//   e.preventDefault()
//   if (isDragging) {
//     currentAngle = getAngleFromMouse(e.touches[0])
//     updateAngleDisplay()
//     drawAngleController()
//   }
// })

// canvas.addEventListener('touchend', () => {
//   isDragging = false
// })

// // 按钮事件处理
// decreaseBtn.addEventListener('click', () => {
//   if (currentAngle > 0) {
//     currentAngle--
//     updateAngleDisplay()
//     drawAngleController()
//   }
// })

// increaseBtn.addEventListener('click', () => {
//   if (currentAngle < 90) {
//     currentAngle++
//     updateAngleDisplay()
//     drawAngleController()
//   }
// })

// // 键盘事件处理
// document.addEventListener('keydown', (e) => {
//   if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
//     if (currentAngle > 0) {
//       currentAngle--
//       updateAngleDisplay()
//       drawAngleController()
//     }
//     e.preventDefault()
//   }
//   else if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
//     if (currentAngle < 90) {
//       currentAngle++
//       updateAngleDisplay()
//       drawAngleController()
//     }
//     e.preventDefault()
//   }
// })

// // 初始化
// drawAngleController()
