// export const PARAMETERS = {
//   /** 球台宽度(长度) */
//   tableWidth: 25.4,
//   /** 球台高度(宽度) */
//   tableHeight: 12.7,
//   /** 球台厚度(高度) */
//   tableThickness: 0.6,

// import { getConnerPocketRadius } from '../utils'

//   /** 离地高度 */
//   offGroundHeight: 7.5,

//   /** 库边的高度（宽度） */
//   bankHeight: 0.6,
//   /** 库边的厚度（高度） */
//   bankThickness: 0.35,
//   /** 库边的反弹系数 */
//   bankRestitution: 0.8,
//   /** 球台的球袋半径（角袋） */
//   cornerPocketRadius: 0.43,
//   /** 球台的球袋半径（中袋） */
//   middlePocketRadius: 0.45,
//   /** 球袋的高度 */
//   pocketHeight: 1.2,

//   /** 开球线位置（白球） */
//   breakLinePosition: 1 / 4,
//   /** 置球点位置（第一个球） */
//   cueBallPosition: 3 / 4,

//   /** 球的半径 */
//   ballRadius: 0.286,
//   /** 球的质量 */
//   ballMass: 1,
//   /** 球的反弹系数 */
//   ballRestitution: 0.95,
//   /** 台球与台布的摩擦系数 */
//   ballFriction: 0.15,
//   /** 台球与库边的摩擦系数 */
//   ballFrictionWithBank: 0.1,

//   // 要让库边开口是角袋的直径，也就是尾袋圆心在将尾袋往前移动
//   get cornerPocketTranslate() {
//     return Math.sin(Math.PI / 4) * this.cornerPocketRadius * 2 / 2.5
//   },
// }

export const PARAMETERS = {
  /** 台面内尺寸 */
  tableWidth: 254,
  /** 台面高度 */
  tableHeight: 127,

  /** 台面厚度 30mm */
  tableThickness: 3,

  /** 木质支撑层尺寸 */
  woodWidth: 4,
  /** 外包台呢尺寸 */
  sideWidth: 1.5,
  /** 橡胶条尺寸 */
  rubberWidth: 7,
  /** 中袋半径 */
  middlePocketRadius: 4.5,
  /** 角袋半径 */
  // cornerPocketRadius: Number.parseFloat(getConnerPocketRadius(8.5, 7).toFixed(1)),
  cornerPocketRadius: 6.5,
  /** 球半径 */
  ballRadius: 2.86,
  /** 台面外框宽度 */
  get withWoodWidth() {
    return this.tableWidth + this.woodWidth * 2
  },
  get withWoodHeight() {
    return this.tableHeight + this.woodWidth * 2
  },
  get outerWidth() {
    return this.tableWidth + this.woodWidth * 2 + this.sideWidth * 2
  },
  get outerHeight() {
    return this.tableHeight + this.woodWidth * 2 + this.sideWidth * 2
  },

  /** 离地高度 */
  offGroundHeight: 75,
  /** 库边总厚度 */
  bankTotalThickness: 3.8,
  /** 库边与球接触面高度 */
  bankContactHeight: 1.5,

  // 桌脚
  legWidth: 10,
  legHeight: 75,
  legDepth: 10,
}
