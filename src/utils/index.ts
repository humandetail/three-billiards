import * as THREE from 'three'

export function getTexturePath(name: string): string {
  const PATHNAME = import.meta.env.VITE_APP_PATHNAME || '/'
  return `${PATHNAME.replace(/\/$/, '')}/textures/${name}`
}

export interface Point {
  x: number
  y: number
}

export function getPoints(x: number, y: number, r: number, startAngle: number, endAngle: number, antiClockwise: boolean, quantity: number): Point[] {
  const points: Point[] = []
  const PI2 = Math.PI * 2

  if (antiClockwise) {
    [startAngle, endAngle] = [endAngle, startAngle]
  }

  if (endAngle - startAngle >= PI2) {
    endAngle = startAngle + PI2
  }
  else {
    if (startAngle !== endAngle) {
      if ((startAngle - endAngle) % PI2 === 0) {
        endAngle = startAngle
      }
      else {
        startAngle = startAngle % PI2
        while (endAngle > startAngle + PI2) {
          endAngle -= PI2
        }
      }
    }
  }

  // 弧的总角度值
  const angleCount = startAngle > endAngle
    ? PI2 - startAngle + endAngle
    : endAngle - startAngle

  function getPoint(t: number): Point {
    if (antiClockwise) {
      t = 1 - t
    }
    const degree = angleCount * t + startAngle
    return {
      x: x + Math.cos(degree) * r,
      y: y + Math.sin(degree) * r,
    }
  }

  for (let i = 0; i < quantity; i++) {
    points.push(getPoint(i / (quantity - 1)))
  }
  return points
}

/**
 * 获取角袋的半径
 * @param width 角袋最小开口宽度
 * @param rubberWidth 橡胶条宽度
 */
export function getConnerPocketRadius(width: number, rubberWidth: number) {
  // 斜边
  const c = width + rubberWidth * 2
  const side = Math.sqrt(c ** 2 / 2)
  return side - rubberWidth
}
