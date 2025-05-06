// export const PARAMETERS = {
//   /** 球台宽度(长度) */
//   tableWidth: 25.4,
//   /** 球台高度(宽度) */
//   tableHeight: 12.7,
//   /** 球台厚度(高度) */
//   tableThickness: 0.6,

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

  cue: {
    // 皮头（Tip） 中式八球常用10–12毫米直径，与球杆尖端匹配
    tip: {
      radius: 0.5,
      length: 1.2,
    },
    // 铜箍（Ferrule）：也叫先角，连接前节与皮头的白色环状部件，多为尼龙或ABS材质，防止木质前节开裂。
    ferruleLength: 2,
    // 杆子（Pole） = 前节（Shaft）105CM包含先角（2 cm）和皮头（1.2 cm）、接牙（Joint）和后节（Butt）45CM含橡胶防滑垫（1–2 cm）
    get shaftLength () {
      return 105 - this.ferruleLength - this.tip.length
    },
    joinLength: 2,
    buttLength: 45,
    // 球杆末端半径
    endRadius: 1.4,
  }
}
