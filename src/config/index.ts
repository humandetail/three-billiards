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

  bodyDepth: 15,

  // 桌脚
  legWidth: 10,
  legHeight: 75,
  legDepth: 10,

  cue: {
    // 皮头（Tip）
    tipRadius: 0.5,
    tipHeadLength: 0.15,
    tipBodyLength: 1.05,
    // 先角（Ferrule）：连接前节与皮头的白色环状部件。
    ferruleLength: 2,

    // 前节（Shaft）105CM包含先角（2 cm）和皮头（1.2 cm）
    shaftLength: 105 - 2 - 1.2,
    // 接牙（Joint）
    jointLength: 2,
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
    buttLength: 45,
    // 球杆末端半径
    endRadius: 1.4,

    // 杆子（Pole）= 皮头 + 前节 + 接牙、和后节 + 接牙(0CM)
    get poleLength() {
      return this.tipHeadLength + this.tipBodyLength + this.ferruleLength + this.shaftLength + this.buttLength
    },
  },
}
