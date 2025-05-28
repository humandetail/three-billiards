import type { Point } from '../utils'
import * as THREE from 'three'

export const PARAMETERS = {
  /** 台球桌相关参数 */
  table: {
    /** x轴 */
    width: 2.54,
    /** y轴 */
    height: 0.05,
    /** z轴 */
    depth: 1.27,
  },
  /** 库边，包含木质层 */
  cushion: {
    /** * 木质框架宽度（从台面到外侧） */
    woodWidth: 0.08,
    rubberWidth: 0.05, // 橡胶宽度
    rubberProtrusion: 0.045, // 橡胶凸起
    /** 台面到库边顶部高度 */
    height: 0.043,
    /** 库边总厚度 */
    totalThickness: 0.038,
    /** 库边与球接触面高度 */
    contactHeight: 0.015,

    slope: {
      corner: 45,
      middle: 60,
    },
    cornerEdgeInset: 0.025,
    middleEdgeInset: 0.01,
  },
  pocket: {
    cornerWidth: 0.085,
    middleWidth: 0.088,
    cornerDegrees: 145,
    middleDegrees: 165,
    depth: 0.15,
  },

  /** 台球参数 */
  ball: {
    /** 球的半径（单位：米），标准为直径 57.15mm / 2 */
    radius: 0.028575,
    /** 球的质量（单位：kg），标准为约 170g */
    mass: 0.17,
  },

  /** 离地高度 */
  offGroundHeight: 0.75,
  bodyDepth: 0.15,
  // 桌脚
  legWidth: 0.1,
  legHeight: 0.75,
  legDepth: 0.1,
}

export function getScaleValue(v: number, scale = 1) {
  return v * scale
}

export function toRadians(degrees: number) {
  return degrees * Math.PI / 180
}

/**
 * 获取袋口参数
 * @params L - 角袋开口宽度，弦长
 * @params degrees - 袋口角度
 * @params isMiddle - 是否为中袋
 */
export function getPocketParams(L: number, degrees: number, isMiddle = false) {
  const side = isMiddle ? L / 2 : L / Math.sqrt(2)
  const angle = toRadians((isMiddle ? (180 - degrees) : (degrees - 90)) / 2)

  const r = side / Math.cos(angle)

  const offset = side * Math.tan(angle)

  return {
    r,
    /** 袋口在台面的端点距离圆心的距离 */
    side,
    offset,
    isMiddle,
  }
}
// 向量 BA 和 BC
function vector(p1: Point, p2: Point) {
  return { x: p2.x - p1.x, y: p2.y - p1.y }
}

function normalize(v: Point) {
  const len = Math.hypot(v.x, v.y)
  return { x: v.x / len, y: v.y / len }
}

function doScale(v: Point, s: number) {
  return { x: v.x * s, y: v.y * s }
}

function add(p: Point, v: Point) {
  return { x: p.x + v.x, y: p.y + v.y }
}

export function getTangent(A: Point, B: Point, C: Point, r: number): [Point, Point] {
  // 单位向量
  const u1 = normalize(vector(B, A))
  const u2 = normalize(vector(B, C))

  // 角平分线方向单位向量
  const bisector = normalize({ x: u1.x + u2.x, y: u1.y + u2.y })

  // 圆心位置 = B 点 + 角平分线方向 × 半径 / sin(θ / 2)
  const angleBA = Math.atan2(u1.y, u1.x)
  const angleBC = Math.atan2(u2.y, u2.x)
  let angleDiff = angleBC - angleBA
  if (angleDiff <= -Math.PI)
    angleDiff += 2 * Math.PI
  if (angleDiff > Math.PI)
    angleDiff -= 2 * Math.PI
  const halfAngle = angleDiff / 2
  const sinHalfAngle = Math.sin(Math.abs(halfAngle))

  // 圆心
  const distanceToCenter = r / sinHalfAngle
  const center = add(B, doScale(bisector, distanceToCenter))

  // 切点（圆心到两边的垂线方向，距离为 r）
  const normal1 = { x: -u1.y, y: u1.x } // 向量 AB 的左法线
  const normal2 = { x: u2.y, y: -u2.x } // 向量 BC 的左法线

  const tangent1 = add(center, doScale(normal1, -r)) // 对 AB 切点
  const tangent2 = add(center, doScale(normal2, -r)) // 对 BC 切点

  return [tangent1, tangent2]
}

export function getConfig(scale = 1) {
  const tableWidth = getScaleValue(PARAMETERS.table.width, scale)
  const tableHeight = getScaleValue(PARAMETERS.table.depth, scale)

  // 橡胶层总宽度
  const rubberTotalWidth = getScaleValue(PARAMETERS.cushion.rubberWidth, scale)
  // 角袋斜坡偏移量
  const cornerEdgeInset = getScaleValue(PARAMETERS.cushion.cornerEdgeInset, scale)
  // 中袋斜坡偏移量
  const middleEdgeInset = getScaleValue(PARAMETERS.cushion.middleEdgeInset, scale)
  // 中袋橡胶偏移量
  const middleRubberOffset = rubberTotalWidth / Math.tan(toRadians(PARAMETERS.cushion.slope.middle))

  const cornerParams = getPocketParams(getScaleValue(PARAMETERS.pocket.cornerWidth, scale), PARAMETERS.pocket.cornerDegrees, false)
  const middleParams = getPocketParams(getScaleValue(PARAMETERS.pocket.middleWidth, scale), PARAMETERS.pocket.middleDegrees, true)

  const woodWidth = getScaleValue(PARAMETERS.cushion.woodWidth, scale)
  const halfWoodWidth = woodWidth / 2

  const cornerPositions = [
    { x: -tableWidth / 2, y: -tableHeight / 2 }, // 上
    { x: tableWidth / 2, y: -tableHeight / 2 }, // 右
    { x: tableWidth / 2, y: tableHeight / 2 }, // 下
    { x: -tableWidth / 2, y: tableHeight / 2 }, // 左
  ]
  const middlePositions = [
    { x: 0, y: -tableHeight / 2 },
    { x: 0, y: tableHeight / 2 },
  ]

  const cornerProtrusion = halfWoodWidth / Math.tan(toRadians(PARAMETERS.cushion.slope.corner)) - cornerEdgeInset // 45度斜坡
  const middleProtrusion = halfWoodWidth / Math.tan(toRadians(PARAMETERS.cushion.slope.middle)) - middleEdgeInset // 60度斜坡

  // 木质层
  // ┌-----┐
  // \-----/
  // F     E
  // A     D
  //  B   C
  const woodEndPoints = [
    // 左上
    [
      { x: -tableWidth / 2 + cornerParams.r - cornerProtrusion, y: -tableHeight / 2 - cornerProtrusion - cornerProtrusion }, // A
      { x: -tableWidth / 2 + cornerParams.r + cornerProtrusion, y: -tableHeight / 2 }, // B
      { x: -middleParams.side - middleProtrusion, y: -tableHeight / 2 }, // C
      { x: -middleParams.side + middleProtrusion, y: -tableHeight / 2 - halfWoodWidth }, // D
      { x: -middleParams.side + middleProtrusion, y: -tableHeight / 2 - woodWidth }, // E
      { x: -tableWidth / 2 + cornerParams.r - cornerProtrusion, y: -tableHeight / 2 - woodWidth }, // F
    ],
    // 右上
    [
      { x: tableWidth / 2 - cornerParams.r + cornerProtrusion, y: -tableHeight / 2 - cornerProtrusion - cornerProtrusion }, // A
      { x: tableWidth / 2 - cornerParams.r - cornerProtrusion, y: -tableHeight / 2 }, // B
      { x: middleParams.side + middleProtrusion, y: -tableHeight / 2 }, // C
      { x: middleParams.side - middleProtrusion, y: -tableHeight / 2 - halfWoodWidth }, // D
      { x: middleParams.side - middleProtrusion, y: -tableHeight / 2 - woodWidth }, // E
      { x: tableWidth / 2 - cornerParams.r + cornerProtrusion, y: -tableHeight / 2 - woodWidth }, // F
    ],
    // 左下
    [
      { x: -tableWidth / 2 + cornerParams.r - cornerProtrusion, y: tableHeight / 2 + cornerProtrusion + cornerProtrusion }, // A
      { x: -tableWidth / 2 + cornerParams.r + cornerProtrusion, y: tableHeight / 2 }, // B
      { x: -middleParams.side - middleProtrusion, y: tableHeight / 2 }, // C
      { x: -middleParams.side + middleProtrusion, y: tableHeight / 2 + halfWoodWidth }, // D
      { x: -middleParams.side + middleProtrusion, y: tableHeight / 2 + woodWidth }, // E
      { x: -tableWidth / 2 + cornerParams.r - cornerProtrusion, y: tableHeight / 2 + woodWidth }, // F
    ],
    // 右下
    [
      { x: tableWidth / 2 - cornerParams.r + cornerProtrusion, y: tableHeight / 2 + cornerProtrusion + cornerProtrusion }, // A
      { x: tableWidth / 2 - cornerParams.r - cornerProtrusion, y: tableHeight / 2 }, // B
      { x: middleParams.side + middleProtrusion, y: tableHeight / 2 }, // C
      { x: middleParams.side - middleProtrusion, y: tableHeight / 2 + halfWoodWidth }, // D
      { x: middleParams.side - middleProtrusion, y: tableHeight / 2 + woodWidth }, // E
      { x: tableWidth / 2 - cornerParams.r + cornerProtrusion, y: tableHeight / 2 + woodWidth }, // F
    ],
    // 左
    [
      { x: -tableWidth / 2 - cornerProtrusion - cornerProtrusion, y: -tableHeight / 2 + cornerParams.r - cornerProtrusion }, // A
      { x: -tableWidth / 2, y: -tableHeight / 2 + cornerParams.r + cornerProtrusion }, // B
      { x: -tableWidth / 2, y: tableHeight / 2 - cornerParams.r - cornerProtrusion }, // C
      { x: -tableWidth / 2 - cornerProtrusion - cornerProtrusion, y: tableHeight / 2 - cornerParams.r + cornerProtrusion }, // D
      { x: -tableWidth / 2 - woodWidth, y: tableHeight / 2 - cornerParams.r + cornerProtrusion }, // E
      { x: -tableWidth / 2 - woodWidth, y: -tableHeight / 2 + cornerParams.r - cornerProtrusion }, // F
    ],
    // 右
    [
      { x: tableWidth / 2 + cornerProtrusion + cornerProtrusion, y: -tableHeight / 2 + cornerParams.r - cornerProtrusion }, // A
      { x: tableWidth / 2, y: -tableHeight / 2 + cornerParams.r + cornerProtrusion }, // B
      { x: tableWidth / 2, y: tableHeight / 2 - cornerParams.r - cornerProtrusion }, // C
      { x: tableWidth / 2 + cornerProtrusion + cornerProtrusion, y: tableHeight / 2 - cornerParams.r + cornerProtrusion }, // D
      { x: tableWidth / 2 + woodWidth, y: tableHeight / 2 - cornerParams.r + cornerProtrusion }, // E
      { x: tableWidth / 2 + woodWidth, y: -tableHeight / 2 + cornerParams.r - cornerProtrusion }, // F
    ],
  ]

  // 橡胶层
  const rubberEndPoints = [
    // 左上
    [
      { x: woodEndPoints[0][0].x, y: woodEndPoints[0][0].y + cornerProtrusion },
      { x: -tableWidth / 2 + cornerParams.r + rubberTotalWidth, y: -tableHeight / 2 + rubberTotalWidth },
      { x: woodEndPoints[0][2].x - middleRubberOffset, y: woodEndPoints[0][2].y + rubberTotalWidth },
      { x: -middleParams.r, y: -tableHeight / 2 },
      { x: woodEndPoints[0][3].x, y: woodEndPoints[0][3].y },
      { x: woodEndPoints[0][2].x, y: woodEndPoints[0][2].y },
      { x: woodEndPoints[0][1].x, y: woodEndPoints[0][1].y },
      { x: woodEndPoints[0][0].x, y: woodEndPoints[0][0].y },
    ],
    // 右上
    [
      { x: woodEndPoints[1][0].x, y: woodEndPoints[1][0].y + cornerProtrusion },
      { x: tableWidth / 2 - cornerParams.r - rubberTotalWidth, y: -tableHeight / 2 + rubberTotalWidth },
      { x: woodEndPoints[1][2].x + middleRubberOffset, y: woodEndPoints[1][2].y + rubberTotalWidth },
      { x: middleParams.r, y: -tableHeight / 2 },
      { x: woodEndPoints[1][3].x, y: woodEndPoints[1][3].y },
      { x: woodEndPoints[1][2].x, y: woodEndPoints[1][2].y },
      { x: woodEndPoints[1][1].x, y: woodEndPoints[1][1].y },
      { x: woodEndPoints[1][0].x, y: woodEndPoints[1][0].y },
    ],
    // 左下
    [
      { x: woodEndPoints[2][0].x, y: woodEndPoints[2][0].y - cornerProtrusion },
      { x: -tableWidth / 2 + cornerParams.r + rubberTotalWidth, y: tableHeight / 2 - rubberTotalWidth },
      { x: woodEndPoints[2][2].x - middleRubberOffset, y: woodEndPoints[2][2].y - rubberTotalWidth },
      { x: -middleParams.r, y: tableHeight / 2 },
      { x: woodEndPoints[2][3].x, y: woodEndPoints[2][3].y },
      { x: woodEndPoints[2][2].x, y: woodEndPoints[2][2].y },
      { x: woodEndPoints[2][1].x, y: woodEndPoints[2][1].y },
      { x: woodEndPoints[2][0].x, y: woodEndPoints[2][0].y },
    ],
    // 右下
    [
      { x: woodEndPoints[3][0].x, y: woodEndPoints[3][0].y - cornerProtrusion },
      { x: tableWidth / 2 - cornerParams.r - rubberTotalWidth, y: tableHeight / 2 - rubberTotalWidth },
      { x: woodEndPoints[3][2].x + middleRubberOffset, y: woodEndPoints[3][2].y - rubberTotalWidth },
      { x: middleParams.r, y: tableHeight / 2 },
      { x: woodEndPoints[3][3].x, y: woodEndPoints[3][3].y },
      { x: woodEndPoints[3][2].x, y: woodEndPoints[3][2].y },
      { x: woodEndPoints[3][1].x, y: woodEndPoints[3][1].y },
      { x: woodEndPoints[3][0].x, y: woodEndPoints[3][0].y },
    ],
    // 左
    [
      { x: woodEndPoints[4][0].x + cornerProtrusion, y: woodEndPoints[4][0].y },
      { x: -tableWidth / 2 + rubberTotalWidth, y: -tableHeight / 2 + cornerParams.r + rubberTotalWidth },
      { x: woodEndPoints[4][2].x + rubberTotalWidth, y: woodEndPoints[4][2].y - rubberTotalWidth },
      { x: woodEndPoints[4][3].x + cornerProtrusion, y: woodEndPoints[4][3].y },
      { x: woodEndPoints[4][3].x, y: woodEndPoints[4][3].y },
      { x: woodEndPoints[4][2].x, y: woodEndPoints[4][2].y },
      { x: woodEndPoints[4][1].x, y: woodEndPoints[4][1].y },
      { x: woodEndPoints[4][0].x, y: woodEndPoints[4][0].y },
    ],
    // 右
    [
      { x: woodEndPoints[5][0].x - cornerProtrusion, y: woodEndPoints[5][0].y },
      { x: tableWidth / 2 - rubberTotalWidth, y: -tableHeight / 2 + cornerParams.r + rubberTotalWidth },
      { x: woodEndPoints[5][2].x - rubberTotalWidth, y: woodEndPoints[5][2].y - rubberTotalWidth },
      { x: woodEndPoints[5][3].x - cornerProtrusion, y: woodEndPoints[5][3].y },
      { x: woodEndPoints[5][3].x, y: woodEndPoints[5][3].y },
      { x: woodEndPoints[5][2].x, y: woodEndPoints[5][2].y },
      { x: woodEndPoints[5][1].x, y: woodEndPoints[5][1].y },
      { x: woodEndPoints[5][0].x, y: woodEndPoints[5][0].y },
    ],
  ]

  const tableWithWoodPoints = [
    // 左上
    { x: -tableWidth / 2 - woodWidth, y: -tableHeight / 2 - woodWidth },
    // 中上
    { x: 0, y: -tableHeight / 2 - woodWidth },
    // 右上
    { x: tableWidth / 2 + woodWidth, y: -tableHeight / 2 - woodWidth },
    // 左下
    { x: -tableWidth / 2 - woodWidth, y: tableHeight / 2 + woodWidth },
    // 中下
    { x: 0, y: tableHeight / 2 + woodWidth },
    // 右下
    { x: tableWidth / 2 + woodWidth, y: tableHeight / 2 + woodWidth },
  ]

  const sealPoints = [
    // 左上
    [
      { x: woodEndPoints[0][0].x, y: woodEndPoints[0][0].y },
      { x: woodEndPoints[4][0].x, y: woodEndPoints[4][0].y },

      { x: woodEndPoints[4][5].x, y: woodEndPoints[4][5].y },
      { x: woodEndPoints[0][5].x, y: woodEndPoints[0][5].y },
    ],
    // 中上
    [
      { x: woodEndPoints[0][3].x, y: woodEndPoints[0][3].y },
      { x: woodEndPoints[1][3].x, y: woodEndPoints[1][3].y },

      { x: woodEndPoints[1][4].x, y: woodEndPoints[1][4].y },
      { x: woodEndPoints[0][4].x, y: woodEndPoints[0][4].y },
    ],
    // 右上
    [
      { x: woodEndPoints[1][0].x, y: woodEndPoints[1][0].y },
      { x: woodEndPoints[5][0].x, y: woodEndPoints[5][0].y },

      { x: woodEndPoints[5][5].x, y: woodEndPoints[5][5].y },
      { x: woodEndPoints[1][5].x, y: woodEndPoints[1][5].y },
    ],
    // 左下
    [
      { x: woodEndPoints[2][0].x, y: woodEndPoints[2][0].y },
      { x: woodEndPoints[4][3].x, y: woodEndPoints[4][3].y },

      { x: woodEndPoints[4][4].x, y: woodEndPoints[4][4].y },
      { x: woodEndPoints[2][5].x, y: woodEndPoints[2][5].y },
    ],
    // 中下
    [
      { x: woodEndPoints[2][3].x, y: woodEndPoints[2][3].y },
      { x: woodEndPoints[3][3].x, y: woodEndPoints[3][3].y },

      { x: woodEndPoints[3][4].x, y: woodEndPoints[3][4].y },
      { x: woodEndPoints[2][4].x, y: woodEndPoints[2][4].y },
    ],
    // 右下
    [
      { x: woodEndPoints[3][0].x, y: woodEndPoints[3][0].y },
      { x: woodEndPoints[5][3].x, y: woodEndPoints[5][3].y },

      { x: woodEndPoints[5][4].x, y: woodEndPoints[5][4].y },
      { x: woodEndPoints[3][5].x, y: woodEndPoints[3][5].y },
    ],
  ]

  return {
    tableWithWoodPoints,
    sealPoints,
    cornerPositions,
    middlePositions,
    cornerParams,
    middleParams,
    table: {
      /** x轴 */
      width: tableWidth,
      /** y轴 */
      height: getScaleValue(PARAMETERS.table.height, scale),
      /** z轴 */
      depth: tableHeight,

      leg: {
        width: getScaleValue(PARAMETERS.legWidth, scale),
        depth: getScaleValue(PARAMETERS.legDepth, scale),
        height: getScaleValue(PARAMETERS.legHeight, scale),
      },

      body: {
        depth: getScaleValue(PARAMETERS.bodyDepth, scale),
      },
    },
    cushion: {
      rubberTotalWidth,
      rubberEndPoints,
      woodWidth,
      woodEndPoints,

      height: getScaleValue(PARAMETERS.cushion.height, scale),
      contactHeight: getScaleValue(PARAMETERS.cushion.contactHeight, scale),
      totalThickness: getScaleValue(PARAMETERS.cushion.totalThickness, scale),

      slope: {
        corner: toRadians(PARAMETERS.cushion.slope.corner),
        middle: toRadians(PARAMETERS.cushion.slope.middle),
      },
    },

    ball: {
      radius: getScaleValue(PARAMETERS.ball.radius, scale),
      mass: getScaleValue(PARAMETERS.ball.mass, scale),
    },

    cue: {
      // 皮头（Tip）
      tipRadius: getScaleValue(0.005, scale),
      tipHeadLength: getScaleValue(0.0015, scale),
      tipBodyLength: getScaleValue(0.0105, scale),
      // 先角（Ferrule）：连接前节与皮头的白色环状部件。
      ferruleLength: getScaleValue(0.02, scale),

      // 前节（Shaft）105CM包含先角（2 cm）和皮头（1.2 cm）
      shaftLength: getScaleValue(1.05 - 0.02 - 0.012, scale),
      // 接牙（Joint）
      jointLength: getScaleValue(0.02, scale),
      get jointRadius() {
        const {
          tipRadius: a,
          shaftLength: b,
          buttLength: e,
          endRadius: d,
        } = this
        const x = e * (d - a) / (b + e)
        return d - x
      },
      // 后节（Butt）45CM含橡胶防滑垫（1–2 cm）
      buttLength: getScaleValue(0.45, scale),
      // 球杆末端半径
      endRadius: getScaleValue(0.014, scale),

      // 杆子（Pole）= 皮头 + 前节 + 接牙、和后节 + 接牙(0CM)
      get poleLength() {
        return this.tipHeadLength + this.tipBodyLength + this.ferruleLength + this.shaftLength + this.buttLength
      },
    },

    colors: {
      cloth: new THREE.Color(0x00AA00),
      wood: new THREE.Color(0x8B4513),
      body: new THREE.Color(0xCD5C20),
      leg: new THREE.Color(0xCD5C20),
      seals: new THREE.Color(0xF1F2F3),
    },

    /** 材质摩擦力与弹性配置 */
    material: {
      /** 球的材质属性（主要用于球与其他表面之间的交互） */
      ball: {
        /**
         * 滑动摩擦系数
         * 球体与布面或库边的滑动摩擦力，建议较低以保持滚动
         * - 低值（0.02）使球体滚动更持久
         * - 高值会快速消耗动能
         */
        friction: 0.02,
        /**
         * 弹性恢复系数（COR）
         * 球体与库边/其他物体的反弹系数，越高表示越弹
         * - 0.95 表示碰撞后保留 95% 速度（高弹性）
         * - 影响碰撞后的反弹力度
         */
        restitution: 0.95,
        /**
         * 线性/角速度缓慢衰减（空气+桌面阻力）
         */
        damping: {
          linear: 0.5,
          angular: 0.2,
        },
        /**
         * 连续碰撞检测（CCD）阈值
         * 用于确定何时启用连续碰撞检测
         * 较低的值会更快地启用 CCD
         * 较高的值会减少 CCD 的使用
         */
        ccdThreshold: 0.001,
        /**
         * 连续碰撞检测（CCD）球体半径
         * 用于确定连续碰撞检测的球体半径
         * 较低的值会更快地启用 CCD
         * 较高的值会减少 CCD 的使用
         */
        ccdSweptSphereRadiusScale: 0.2,
      },
      /** 库边材质（库边与球的碰撞行为） */
      cushion: {
        friction: 0.05, // 球撞上后应该滑而不是刹车
        restitution: 0.92, // 更真实的弹跳反应
      },
      /** 台面布料（球在台面上滚动时的交互） */
      cloth: {
        /** 球与布面之间的摩擦，通常设置低值以保持运动距离 */
        friction: 0.1,
        /** 球在布面上弹跳的弹性（几乎为 0） */
        restitution: 0,
      },
    },
  }
}

export default getConfig(1)
