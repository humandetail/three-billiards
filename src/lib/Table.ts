import type MainScene from '../central-control/MainScene'

import type { Point } from '../utils'
import { ExtendedMesh } from 'enable3d'
import * as THREE from 'three'

import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'

import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'
import UnitPath from 'unit-path'
import config, { getTangent } from '../config'
import { arcToPoints, setGeometryColor } from '../utils'

export default class Table {
  #quantity = 32 // 弧形分段数

  boardTopY = config.table.leg.height + config.table.height
  boardBottomY = config.table.leg.height

  constructor(public mainScene: MainScene) {}

  init() {
    this.createTableBoard()
    this.createCushionRubbers()
    this.createCushionWood()
    this.createPocketSeals()
    this.createTableBody()
    this.createTableLegs()
    this.createPockets()

    // 触发器
    this.createTrigger()
  }

  createTrigger() {
    const {
      cornerPositions,
      middlePositions,
      cornerParams,
      middleParams,
    } = config

    const names = ['top', 'right', 'bottom', 'left', 'middle-top', 'middle-bottom']

    ;[
      ...cornerPositions,
      ...middlePositions,
    ].forEach((position, index) => {
      const r = (index < 4 ? cornerParams.r : middleParams.side) - 0.01
      const trigger = new ExtendedMesh(new THREE.CylinderGeometry(r, r, config.table.height, 32), new THREE.MeshBasicMaterial({ color: 0x00FF00 }))
      trigger.position.set(position.x, this.boardTopY - config.table.height / 2, position.y)
      // this.mainScene.add.existing(trigger)
      this.mainScene.physics.add.existing(trigger as any, { shape: 'convex', mass: 0 })
      trigger.body.setCollisionFlags(4)
      trigger.name = `trigger-${names[index]}`

      this.mainScene.setPocket(trigger)
    })
  }

  createTableBoard() {
    // const tableBoardGeometry = new THREE.BoxGeometry(config.table.width, config.table.height, config.table.depth)
    const tableBoardGeometry = this.#generateTableBoardGeometry()
    tableBoardGeometry.rotateX(Math.PI / 2)
    const tableBoard = new ExtendedMesh(tableBoardGeometry, new THREE.MeshPhysicalMaterial({ color: config.colors.cloth, clearcoat: 0.92, clearcoatRoughness: 0.35 }))
    tableBoard.position.set(0, this.boardTopY - config.table.height / 2, 0)
    this.mainScene.add.existing(tableBoard)
    this.mainScene.physics.add.existing(tableBoard as any, { shape: 'convex', mass: 0 })
    tableBoard.body.setFriction(config.material.cloth.friction)
    tableBoard.body.setRestitution(config.material.cloth.restitution)
    tableBoard.body.ammo.setRollingFriction(config.material.cloth.friction)

    tableBoard.castShadow = true
    tableBoard.receiveShadow = true

    tableBoard.name = 'tableBoard'
  }

  createCushionRubbers() {
    const cushionRubbers = this.#generateCushionGeometries()
    cushionRubbers.forEach((geometry, index) => {
      const mesh = new ExtendedMesh(geometry, new THREE.MeshPhysicalMaterial({ color: config.colors.cloth, clearcoat: 0.92, clearcoatRoughness: 0.35 }))
      mesh.rotateX(Math.PI / 2)
      mesh.position.set(0, this.boardTopY + config.cushion.height - config.cushion.contactHeight / 2, 0)
      this.mainScene.add.existing(mesh)
      this.mainScene.physics.add.existing(mesh as any, { shape: 'convex', mass: 0 })
      mesh.body.setFriction(config.material.cushion.friction)
      mesh.body.setRestitution(config.material.cushion.restitution)
      mesh.body.ammo.setRollingFriction(config.material.cushion.friction)

      mesh.body.setCollisionFlags(1)
      mesh.body.checkCollisions = true
      mesh.castShadow = true
      mesh.receiveShadow = true

      mesh.name = `cushionRubber-${index}`
    })
  }

  createCushionWood() {
    const cushionWood = this.#generateCushionWoodGeometries()
    cushionWood.forEach((geometry, index) => {
      const mesh = new ExtendedMesh(geometry, new THREE.MeshPhysicalMaterial({ color: config.colors.wood, clearcoat: 0.92, clearcoatRoughness: 0.35 }))
      mesh.rotateX(Math.PI / 2)
      mesh.position.set(0, this.boardBottomY + (config.table.height + config.cushion.height) / 2, 0)
      this.mainScene.add.existing(mesh)
      mesh.name = `cushionWood-${index}`
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
  }

  createPocketSeals() {
    const pocketSeals = this.#generatePocketSealGeometries()
    pocketSeals.forEach((geometry, index) => {
      const mesh = new ExtendedMesh(geometry, new THREE.MeshPhysicalMaterial({ color: config.colors.seals, clearcoat: 0.92, clearcoatRoughness: 0.35 }))
      mesh.rotateX(Math.PI / 2)
      mesh.position.set(0, this.boardTopY + config.cushion.height / 2, 0)
      this.mainScene.add.existing(mesh)
      // this.mainScene.physics.add.existing(mesh as any, { shape: 'convex', mass: 0 })
      // mesh.body.setFriction(config.material.cushion.friction)
      // mesh.body.setRestitution(config.material.cushion.restitution)
      mesh.name = `pocketSeal-${index}`
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
  }

  createTableBody() {
    const tableBody = this.#generateTableBodyGeometries()
    const mesh = new ExtendedMesh(tableBody, new THREE.MeshPhysicalMaterial({ color: config.colors.body, clearcoat: 0.92, clearcoatRoughness: 0.35 }))
    mesh.position.set(0, this.boardBottomY - config.table.body.depth / 2, 0)
    this.mainScene.add.existing(mesh)
    mesh.name = 'tableBody'
    mesh.castShadow = true
    mesh.receiveShadow = true
  }

  createTableLegs() {
    const tableLegs = this.#generateTableLegsGeometries()
    const mesh = new ExtendedMesh(tableLegs, new THREE.MeshPhongMaterial({ color: config.colors.leg }))
    mesh.position.set(0, 0, 0)
    this.mainScene.add.existing(mesh)
    mesh.name = 'tableLegs'
    mesh.castShadow = true
    mesh.receiveShadow = true
  }

  createPockets() {
    const {
      // table: {
      //   height: tableHeight,
      // },
      cornerPositions,
      middlePositions,
    } = config

      ;[
      ...cornerPositions,
      ...middlePositions,
    ].forEach((position, index) => {
      const mesh = new Funnel(this.mainScene).setup({
        position: new THREE.Vector3(position.x, -0.0015, position.y),
        isRotate: [0, 3].includes(index),
      })
      mesh.name = `pocket-${index}`
      this.mainScene.add.existing(mesh)
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
  }

  #generateCushionWoodGeometries() {
    const {
      cushion: {
        woodEndPoints,
        height,
      },
      table,
    } = config

    const woodHeight = height + table.height

    return woodEndPoints.map(([A, ...points]) => {
      const shape = new THREE.Shape()
      shape.moveTo(A.x, A.y)
      points.forEach(p => shape.lineTo(p.x, p.y))
      shape.lineTo(A.x, A.y)

      const extrudeSettings = {
        depth: woodHeight, // 厚度
        bevelEnabled: false,
      }
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
      geometry.translate(0, 0, -woodHeight / 2)
      return geometry
    })
  }

  #generateTableBodyGeometries() {
    const {
      table: {
        width: tableWidth,
        depth: tableDepth,
        leg: {
          width: legWidth,
        },
        body: {
          depth: bodyDepth,
        },
      },
      colors: {
        body: bodyColor,
      },
      cornerParams,
      middleParams,
    } = config
    const boardWidth = tableWidth - cornerParams.r * 2
    const boardHeight = tableDepth - middleParams.side * 2

    const geometries: THREE.BufferGeometry[] = []

    const width = boardWidth - legWidth * 2
    const height = boardHeight - legWidth * 2

    const bodyGeo = new THREE.BoxGeometry(width, bodyDepth, height)
    setGeometryColor(bodyGeo, bodyColor)
    geometries.push(bodyGeo)

    for (let i = 0; i < 4; i++) {
      const w = (width - legWidth) / 2
      const h = legWidth
      const geo = new THREE.BoxGeometry(w, bodyDepth, h)
      setGeometryColor(geo, bodyColor)
      const matrix = new THREE.Matrix4()
      matrix.makeTranslation(new THREE.Vector3(
        (i < 2 ? -1 : 1) * (w / 2 + legWidth / 2),
        0,
        (i % 2 === 0 ? -1 : 1) * (height + legWidth) / 2,
      ))
      geo.applyMatrix4(matrix)
      geometries.push(geo)
    }

    for (let i = 0; i < 2; i++) {
      const w = legWidth
      const h = height
      const geo = new THREE.BoxGeometry(w, bodyDepth, h)
      setGeometryColor(geo, bodyColor)
      const matrix = new THREE.Matrix4()
      matrix.makeTranslation(new THREE.Vector3(
        (i === 0 ? -1 : 1) * (width / 2 + legWidth / 2),
        0,
        0,
      ))
      geo.applyMatrix4(matrix)
      geometries.push(geo)
    }

    return BufferGeometryUtils.mergeGeometries(geometries, false)
  }

  #generateTableLegsGeometries() {
    const {
      table: {
        width: tableWidth,
        depth: tableDepth,
        leg: {
          width: legWidth,
          depth: legDepth,
          height: legHeight,
        },
      },
      colors: {
        leg: legColor,
      },
      cornerParams,
      middleParams,
    } = config
    const boardWidth = tableWidth - cornerParams.r * 2
    const boardHeight = tableDepth - middleParams.side * 2

    const positions = [
      [boardWidth / 2 - legWidth / 2, boardHeight / 2 - legDepth / 2],
      [boardWidth / 2 - legWidth / 2, -boardHeight / 2 + legDepth / 2],
      [0, boardHeight / 2 - legDepth / 2],
      [0, -boardHeight / 2 + legDepth / 2],
      [-boardWidth / 2 + legWidth / 2, boardHeight / 2 - legDepth / 2],
      [-boardWidth / 2 + legWidth / 2, -boardHeight / 2 + legDepth / 2],
    ]

    const geometries = positions.map((position) => {
      const geometry = this.#createTableLeg()
      setGeometryColor(geometry, legColor)
      const matrix = new THREE.Matrix4()
      matrix.makeTranslation(new THREE.Vector3(
        position[0],
        legHeight / 2,
        position[1],
      ))
      geometry.applyMatrix4(matrix)

      return geometry
    })

    return BufferGeometryUtils.mergeGeometries(geometries, false)
  }

  #createTableLeg() {
    const {
      table: {
        leg: {
          width: legWidth,
          depth: legDepth,
          height: legHeight,
        },
      },
      colors: {
        leg: legColor,
      },
    } = config

    // 分成8段，从上到下
    const h1 = legHeight * 0.5 // 长方体
    const h2 = legHeight * 0.03 // 圆柱
    const h3 = legHeight * 0.04 // 环柱
    const h4 = legHeight * 0.03 // 圆柱
    const h5 = legHeight * 0.3 // 长环柱
    const h6 = legHeight * 0.01 // 圆柱
    const h7 = legHeight * 0.04 // 环柱
    const h8 = legHeight * 0.05 // 圆柱
    const fatRadius = legWidth / 2
    const fitRadius = legWidth * 0.8 / 2
    const arr: any[] = [
      { h: h1, type: 'box', attr: [legWidth, h1, legDepth] },
      { h: h2, type: 'cylinder', attr: [fitRadius, fitRadius, h2, 32] },
      { h: h3, type: 'barrel-shaped', attr: [[fitRadius, fatRadius, h3 * 0.4, 8], [fatRadius, fatRadius, h3 * 0.2, 8], [fatRadius, fitRadius, h3 * 0.4, 8]] },
      { h: h4, type: 'cylinder', attr: [fitRadius, fitRadius, h4, 32] },
      { h: h5, type: 'barrel-shaped', attr: [[fitRadius, fatRadius, h5 * 0.05, 8], [fatRadius, fitRadius, h5 * 0.95, 8]] },
      { h: h6, type: 'cylinder', attr: [fitRadius, fitRadius, h6, 32] },
      { h: h7, type: 'barrel-shaped', attr: [[fitRadius, fatRadius, h7 / 3, 8], [fatRadius, fatRadius, h7 / 3, 8], [fatRadius, fitRadius, h7 / 3, 8]] },
      { h: h8, type: 'cylinder', attr: [fitRadius, fitRadius, h8, 32] },
    ]

    let y = (h1 + h2 + h3 + h4 + h5 + h6 + h7 + h8) / 2
    const geometries = arr.map(({ h, type, attr }) => {
      let geo!: THREE.BufferGeometry
      if (type === 'barrel-shaped') {
        geo = this.#createBarrelShaped(attr)
      }
      else if (type === 'cylinder') {
        geo = new THREE.CylinderGeometry(...attr)
      }
      else {
        geo = new THREE.BoxGeometry(...attr)
      }
      setGeometryColor(geo, legColor)
      const m = new THREE.Matrix4()
      y -= h / 2
      m.makeTranslation(new THREE.Vector3(0, y, 0))
      geo.applyMatrix4(m)
      y -= h / 2
      return geo
    })

    return BufferGeometryUtils.mergeGeometries(geometries, false)
  }

  #createBarrelShaped(attrs: [number, number, number, number][]) {
    const geometries: THREE.BufferGeometry[] = []
    let y = attrs.reduce((acc, [_1, _2, h]) => acc + h, 0) / 2
    attrs.forEach(([r1, r2, h, s]) => {
      const geo = new THREE.CylinderGeometry(r1, r2, h, s)
      setGeometryColor(geo, new THREE.Color(0x3170A6))
      const matrix = new THREE.Matrix4()
      y -= h / 2
      matrix.makeTranslation(new THREE.Vector3(0, y, 0))
      geo.applyMatrix4(matrix)
      geometries.push(geo)
      y -= h / 2
    })
    return BufferGeometryUtils.mergeGeometries(geometries, false)
  }

  /** 生成库边橡胶条的几何形状 */
  #generateCushionGeometries() {
    const {
      cushion: {
        rubberTotalWidth,
        rubberEndPoints,
        contactHeight,
      },
    } = config
    const r = rubberTotalWidth
    return rubberEndPoints.map((points, index) => {
      const [A, B, C, D, E, F, G, H] = points

      let tangent1: Point
      let tangent2: Point
      let tangent3: Point
      let tangent4: Point

      if ([0, 3, 5].includes(index)) {
        ;[tangent1, tangent2] = getTangent(A, B, C, r)
        ;[tangent3, tangent4] = getTangent(B, C, D, r)
      }
      else {
        ;[tangent2, tangent1] = getTangent(C, B, A, r)
        ;[tangent4, tangent3] = getTangent(D, C, B, r)
      }

      const shape = new THREE.Shape()
      shape.moveTo(A.x, A.y)
      shape.lineTo(tangent1.x, tangent1.y)

      // 替代 arcTo(B, tangent2, r)
      const arcPoints1 = arcToPoints(tangent1, B, tangent2, r, 32, index === 5)
      arcPoints1.forEach(p => shape.lineTo(p.x, p.y))

      shape.lineTo(tangent3.x, tangent3.y)

      // 替代 arcTo(C, tangent4, r)
      const arcPoints3 = arcToPoints(tangent3, C, tangent4, r)
      arcPoints3.forEach(p => shape.lineTo(p.x, p.y))

      // 剩下直线连接
      shape.lineTo(D.x, D.y)
      shape.lineTo(E.x, E.y)
      shape.lineTo(F.x, F.y)
      shape.lineTo(G.x, G.y)
      shape.lineTo(H.x, H.y)
      shape.lineTo(A.x, A.y) // 闭合

      const extrudeSettings = {
        depth: contactHeight, // 厚度
        bevelEnabled: false,
      }

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
      geometry.translate(0, 0, -contactHeight / 2)
      return geometry
    })
  }

  #generatePocketSealGeometries() {
    const {
      sealPoints,
      cushion: {
        height: cushionHeight,
      },
    } = config
    const quantity = this.#quantity
    const un = new UnitPath()

    const height = cushionHeight

    return sealPoints.map(([A, B, C, D], index) => {
      const shape = new THREE.Shape()

      if (index % 3 === 1) {
        // 中袋
        const AB = new THREE.Vector2(A.x, A.y).distanceTo(new THREE.Vector2(B.x, B.y))
        const M = new THREE.Vector2((A.x + C.x) / 2, (A.y + C.y) / 2)
        shape.moveTo(A.x, A.y)
        const arcAB = arcToPoints(A, M, B, AB / 2)
        arcAB.forEach(p => shape.lineTo(p.x, p.y))
        shape.lineTo(C.x, C.y)
        shape.lineTo(D.x, D.y)
        shape.lineTo(A.x, A.y)
      }
      else {
        let args1: [number, number, number, number, number, boolean] = [0, 0, 0, 0, 0, false]
        let args2: [number, number, number, number, number, boolean] = [0, 0, 0, 0, 0, false]
        switch (index) {
          case 0:
            args1 = [A.x, B.y, Math.abs(A.x - B.x), Math.PI * 1.5, Math.PI, true]
            args2 = [D.x, C.y, Math.abs(C.x - D.x), Math.PI, Math.PI * 1.5, false]
            break
          case 2:
            args1 = [A.x, B.y, Math.abs(A.x - B.x), Math.PI * 1.5, Math.PI * 2, false]
            args2 = [D.x, C.y, Math.abs(C.x - D.x), Math.PI * 2, Math.PI * 1.5, true]
            break
          case 3:
            args1 = [A.x, B.y, Math.abs(A.x - B.x), Math.PI / 2, Math.PI, false]
            args2 = [D.x, C.y, Math.abs(C.x - D.x), Math.PI, Math.PI / 2, true]
            break
          case 5:
            args1 = [A.x, B.y, Math.abs(A.x - B.x), Math.PI / 2, 0, true]
            args2 = [D.x, C.y, Math.abs(C.x - D.x), 0, Math.PI / 2, false]
            break
        }

        shape.moveTo(A.x, A.y)
        un.setPath('ARC', ...args1).getPoints(quantity).forEach(p => shape.lineTo(p.x, p.y))
        shape.lineTo(B.x, B.y)
        shape.lineTo(C.x, C.y)
        un.setPath('ARC', ...args2).getPoints(quantity).forEach(p => shape.lineTo(p.x, p.y))
        shape.lineTo(D.x, D.y)
        shape.lineTo(A.x, A.y)
      }

      const extrudeSettings = {
        depth: height,
        bevelEnabled: false,
      }

      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
      geometry.translate(0, 0, -height / 2)
      return geometry
    })
  }

  #generateTableBoardGeometry() {
    const {
      table: {
        width, // x
        height, // y
        depth, // z
      },
      cornerParams,
      middleParams,
    } = config

    //   A    B  C     D
    // L                 E
    //
    // K                 F
    //   J    I  H     G
    const cOffset = cornerParams.r
    const mOffset = middleParams.side
    const A = { x: -width / 2 + cOffset, y: -depth / 2 }
    const B = { x: 0 - mOffset, y: -depth / 2 }
    const C = { x: 0 + mOffset, y: -depth / 2 }
    const D = { x: width / 2 - cOffset, y: -depth / 2 }
    const E = { x: width / 2, y: -depth / 2 + cOffset }
    const F = { x: width / 2, y: depth / 2 - cOffset }
    const G = { x: width / 2 - cOffset, y: depth / 2 }
    const H = { x: 0 + mOffset, y: depth / 2 }
    const I = { x: 0 - mOffset, y: depth / 2 }
    const J = { x: -width / 2 + cOffset, y: depth / 2 }
    const K = { x: -width / 2, y: depth / 2 - cOffset }
    const L = { x: -width / 2, y: -depth / 2 + cOffset }

    const quantity = this.#quantity
    const un = new UnitPath()

    const shape = new THREE.Shape()
    shape.moveTo(A.x, A.y)
    shape.lineTo(B.x, B.y)

    un.setPath('ARC', 0, -depth / 2, mOffset, Math.PI, 0, true).getPoints(quantity).forEach(p => shape.lineTo(p.x, p.y))
    shape.lineTo(C.x, C.y)
    shape.lineTo(D.x, D.y)

    un.setPath('ARC', width / 2, -depth / 2, cOffset, Math.PI, Math.PI / 2, true).getPoints(quantity).forEach(p => shape.lineTo(p.x, p.y))
    shape.lineTo(E.x, E.y)
    shape.lineTo(F.x, F.y)

    un.setPath('ARC', width / 2, depth / 2, cOffset, Math.PI * 1.5, Math.PI, true).getPoints(quantity).forEach(p => shape.lineTo(p.x, p.y))
    shape.lineTo(G.x, G.y)
    shape.lineTo(H.x, H.y)
    un.setPath('ARC', 0, depth / 2, mOffset, 0, Math.PI, true).getPoints(quantity).forEach(p => shape.lineTo(p.x, p.y))
    shape.lineTo(I.x, I.y)
    shape.lineTo(J.x, J.y)
    un.setPath('ARC', -width / 2, depth / 2, cOffset, 0, Math.PI * 1.5, true).getPoints(quantity).forEach(p => shape.lineTo(p.x, p.y))
    shape.lineTo(K.x, K.y)
    shape.lineTo(L.x, L.y)
    un.setPath('ARC', -width / 2, -depth / 2, cOffset, Math.PI / 2, 0, true).getPoints(quantity).forEach(p => shape.lineTo(p.x, p.y))
    shape.lineTo(A.x, A.y)

    const extrudeSettings = {
      depth: height,
      bevelEnabled: false,
    }

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geometry.translate(0, 0, -height / 2)
    return geometry
  }
}
interface FunnelOptions {
  position: THREE.Vector3
  isRotate?: boolean
}

class Funnel {
  /**
   * 漏斗几何参数
   */
  topDiameter: number
  bottomDiameter: number
  funnelHeight: number
  bottomCatchHeight: number
  wallThickness: number
  radiusDifference: number
  tiltAngle: number
  slantHeight: number
  baseWidth: number
  floorYOffset: number
  angle = 2 * Math.PI / 180

  poleMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x3170A6,
    clearcoat: 0.92,
    clearcoatRoughness: 0.35,
    side: THREE.DoubleSide,
  })

  constructor(private mainScene: MainScene) {
    const {
      cornerParams,
      ball: { radius: ballRadius },
    } = config

    // 几何参数
    this.topDiameter = cornerParams.r * 2.2
    this.bottomDiameter = ballRadius * 2 * 1.1
    this.funnelHeight = ballRadius * 2 * 1.5
    this.bottomCatchHeight = ballRadius * 2 * 1.4
    this.wallThickness = 0.002

    this.radiusDifference = (this.topDiameter - this.bottomDiameter) / 2
    this.tiltAngle = Math.atan(this.radiusDifference / this.funnelHeight)
    this.slantHeight = Math.sqrt(this.radiusDifference ** 2 + this.funnelHeight ** 2)

    this.baseWidth = ballRadius * 12
    this.floorYOffset = this.baseWidth / 2 * Math.sin(this.angle)
  }

  setup(options: FunnelOptions) {
    this.setupPhysics(options)
    return this.setupMesh(options)
  }

  setupPhysics(options: FunnelOptions) {
    const {
      bottomDiameter,
      bottomCatchHeight,
      wallThickness,
      baseWidth,
      floorYOffset,
      angle,
    } = this

    const funnelBody = new THREE.Group()

    // const directions = [
    //   { axis: 'x', sign: 1, rotAxis: new THREE.Vector3(0, 0, 1) },
    //   { axis: 'x', sign: -1, rotAxis: new THREE.Vector3(0, 0, 1) },
    //   { axis: 'z', sign: 1, rotAxis: new THREE.Vector3(1, 0, 0) },
    //   { axis: 'z', sign: -1, rotAxis: new THREE.Vector3(1, 0, 0) },
    // ]

    // directions.forEach(({ axis, sign, rotAxis }) => {
    //   const isXAxis = axis === 'x'

    //   const sideHalfSize = new THREE.Vector3(
    //     isXAxis ? wallThickness / 2 : topDiameter / 2,
    //     slantHeight / 2,
    //     isXAxis ? topDiameter / 2 : wallThickness / 2,
    //   )

    //   const sidePosition = new THREE.Vector3(
    //     isXAxis ? -sign * (topDiameter + bottomDiameter) / 4 : 0,
    //     funnelHeight / 2,
    //     isXAxis ? 0 : sign * (topDiameter + bottomDiameter) / 4,
    //   )

    //   const sideRotation = new THREE.Quaternion().setFromAxisAngle(rotAxis, sign * tiltAngle)
    //   this.#addBoxShape(funnelBody, sideHalfSize, sidePosition, sideRotation)

    //   // 加底接球区
    //   if (!(axis === 'z' && sign === 1)) {
    //     const bottomHalf = new THREE.Vector3(bottomDiameter / 2, bottomCatchHeight / 2, wallThickness / 2)
    //     const bottomPos = new THREE.Vector3()
    //     bottomPos.y = -bottomCatchHeight / 2

    //     if (isXAxis) {
    //       bottomPos.z = sign * bottomDiameter / 2
    //     }
    //     else {
    //       bottomPos.x = -sign * bottomDiameter / 2
    //     }

    //     const bottomRot = new THREE.Quaternion().setFromAxisAngle(
    //       new THREE.Vector3(0, 1, 0),
    //       sign * Math.PI / 2 * (isXAxis ? 0 : 1),
    //     )

    //     this.#addBoxShape(funnelBody, bottomHalf, bottomPos, bottomRot)
    //   }
    // })

    // 背板
    // this.#addBoxShape(
    //   funnelBody,
    //   new THREE.Vector3(bottomCatchHeight / 2, bottomCatchHeight / 2, wallThickness),
    //   new THREE.Vector3(bottomCatchHeight / 2, -bottomCatchHeight / 2, 0),
    //   new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2),
    // )

    // 下部横向底板
    const baseHeight = bottomCatchHeight
    const baseHalfSize = new THREE.Vector3(baseWidth / 2, baseHeight / 2, wallThickness / 2)

    this.#addBoxShape(funnelBody, baseHalfSize, new THREE.Vector3(bottomDiameter / 2 - baseWidth / 2, -baseHeight / 2, -bottomDiameter / 2))
    this.#addBoxShape(funnelBody, baseHalfSize, new THREE.Vector3(bottomDiameter / 2 - baseWidth / 2, -baseHeight / 2, bottomDiameter / 2))

    // 倾斜底板
    const floorThickness = wallThickness
    const floorRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      angle,
    )

    this.#addBoxShape(
      funnelBody,
      new THREE.Vector3(baseWidth / 2, floorThickness / 2, bottomDiameter / 2),
      new THREE.Vector3(bottomDiameter / 2 - baseWidth / 2, -baseHeight + floorYOffset, 0),
      floorRotation,
    )

    // 顶板
    this.#addBoxShape(
      funnelBody,
      new THREE.Vector3((baseWidth - bottomDiameter) / 2, wallThickness / 2, bottomDiameter / 2),
      new THREE.Vector3(-(baseWidth - bottomDiameter) / 2 - bottomDiameter / 2, 0, 0),
      floorRotation,
    )

    // 后盖
    this.#addBoxShape(
      funnelBody,
      new THREE.Vector3(wallThickness / 2, baseHeight / 2, bottomDiameter / 2),
      new THREE.Vector3(-baseWidth + bottomDiameter / 2, -baseHeight / 2, 0),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -angle),
    )

    const { x, y, z } = options.position
    funnelBody.position.set(x, y - baseHeight / 2 + config.table.leg.height, z)
    funnelBody.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), options.isRotate ? Math.PI : 0)
    this.mainScene.physics.add.existing(funnelBody as any, { mass: 0, margin: 0.0001 })
  }

  setupMesh(options: FunnelOptions) {
    const {
      topDiameter,
      bottomDiameter,
      funnelHeight,
      bottomCatchHeight,
      baseWidth,
      floorYOffset,
      poleMaterial,
    } = this

    const group = new THREE.Group()

    const cylinderMesh = this.#createLineFunnel(
      topDiameter / 2,
      bottomDiameter / 2,
      funnelHeight,
      32,
      4,
      0xE9ECF1,
    )
    cylinderMesh.position.set(0, 0, 0)
    group.add(cylinderMesh)

    // 侧面形状
    const sideWallThickness = 0.005
    const sideHeight = bottomCatchHeight
    const tiltOffset = floorYOffset

    const Y = sideHeight - tiltOffset - tiltOffset

    const rightSideWallPoints = [
      [0, Y + sideWallThickness],
      [baseWidth + sideWallThickness, Y + sideWallThickness + tiltOffset],
      [baseWidth + sideWallThickness, Y + sideWallThickness + tiltOffset - bottomDiameter],
      [baseWidth, Y + sideWallThickness + tiltOffset - bottomDiameter],
      [baseWidth, Y + tiltOffset],
      [sideWallThickness, Y],
      [sideWallThickness, 0],
    ]

    const X = -bottomDiameter / 2
    const leftSideWallPoints = [
      [0, Y + sideWallThickness],
      [X + baseWidth + sideWallThickness, Y + sideWallThickness + tiltOffset],
      [X + baseWidth + sideWallThickness, Y + sideWallThickness + tiltOffset - bottomDiameter * 0.6],
      [X + baseWidth, Y + sideWallThickness + tiltOffset - bottomDiameter * 0.6],
      [X + baseWidth, Y + tiltOffset],
      [sideWallThickness, Y],
      [sideWallThickness, 0],
    ]

    const sideWalls = [
      { points: rightSideWallPoints, position: new THREE.Vector3(bottomDiameter / 2, 0, -sideWallThickness) },
      { points: leftSideWallPoints, position: new THREE.Vector3(0, 0, bottomDiameter / 2 - sideWallThickness) },
      { points: leftSideWallPoints, position: new THREE.Vector3(0, 0, -bottomDiameter / 2 - sideWallThickness) },
    ]

    sideWalls.forEach(({ points, position }) => {
      const shape = new THREE.Shape()
      shape.moveTo(0, 0)
      points.forEach(([x, y]) => shape.lineTo(x, y))
      shape.lineTo(0, 0)

      const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
        depth: sideWallThickness * 2,
        bevelEnabled: false,
      })

      const mesh = new THREE.Mesh(extrudeGeo, poleMaterial)
      mesh.position.copy(position)
      mesh.rotation.set(Math.PI, Math.PI, 0)
      group.add(mesh)
    })

    const baseHeight = bottomCatchHeight
    // 加圆环
    ;[
      { pos: new THREE.Vector3(-baseWidth + bottomDiameter / 2 - sideWallThickness, -baseHeight / 2 - sideWallThickness, 0), rot: new THREE.Vector3(0, Math.PI / 2, 0) },
    ].forEach(({ pos, rot }) => {
      const torus = new THREE.TorusGeometry(bottomDiameter / 2, sideWallThickness, 128, 128)
      const torusMesh = new THREE.Mesh(torus, poleMaterial)
      torusMesh.position.copy(pos)
      torusMesh.rotation.set(rot.x, rot.y, rot.z)
      group.add(torusMesh)
    })

    const { x, y, z } = options.position
    group.position.set(x, y - baseHeight / 2 + config.table.leg.height, z)
    group.rotation.set(0, options.isRotate ? Math.PI : 0, 0)
    this.mainScene.add.existing(group)
    return group
  }

  #addBoxShape(group: THREE.Group, size: THREE.Vector3, position: THREE.Vector3, quaternion = new THREE.Quaternion()) {
    const box = this.mainScene.add.box({
      width: size.x * 2,
      height: size.y * 2,
      depth: size.z * 2,
    })
    box.position.set(position.x, position.y, position.z)
    box.quaternion.copy(quaternion)
    group.add(box)
  }

  // 创建抗锯齿宽线漏斗
  #createLineFunnel(topRadius: number, baseRadius: number, height: number, baseSegments: number, layers: number, color: number) {
    const points = []
    const layerHeights = []
    for (let i = 0; i <= layers; i++) {
      const t = i / layers
      layerHeights.push(height * (t * t))
    }

    function radiusAtHeight(y: number) {
      const t = y / height
      return baseRadius * (1 - t) + topRadius * t
    }

    for (let i = 0; i <= layers; i++) {
      const y = layerHeights[i]
      const r = radiusAtHeight(y)
      const segments = Math.floor(baseSegments * (1 - i / layers * 0.7)) + 4

      for (let j = 0; j < segments; j++) {
        const angle = (j / segments) * Math.PI * 2
        const x = r * Math.cos(angle)
        const z = r * Math.sin(angle)
        points.push(new THREE.Vector3(x, y, z))
      }
    }

    // 构建线段顶点数组（浮点数组，x,y,z,x,y,z,...）
    const vertices = []

    // 水平环线
    let index = 0
    for (let i = 0; i <= layers; i++) {
      const segments = Math.floor(baseSegments * (1 - i / layers * 0.7)) + 4
      for (let j = 0; j < segments; j++) {
        const current = points[index + j]
        const next = points[index + ((j + 1) % segments)]
        vertices.push(current.x, current.y, current.z)
        vertices.push(next.x, next.y, next.z)
      }
      index += segments
    }

    // 竖直线段
    index = 0
    for (let i = 0; i < layers; i++) {
      const segmentsA = Math.floor(baseSegments * (1 - i / layers * 0.7)) + 4
      const segmentsB = Math.floor(baseSegments * (1 - (i + 1) / layers * 0.7)) + 4

      const layerAStart = index
      const layerBStart = index + segmentsA

      for (let j = 0; j < segmentsA; j++) {
        const mappedIndex = Math.floor(j * segmentsB / segmentsA)

        const ptA = points[layerAStart + j]
        const ptB = points[layerBStart + mappedIndex]

        vertices.push(ptA.x, ptA.y, ptA.z)
        vertices.push(ptB.x, ptB.y, ptB.z)
      }
      index += segmentsA
    }

    // 使用LineGeometry
    const lineGeometry = new LineGeometry()
    lineGeometry.setPositions(vertices)

    // 粗线材质，单位是屏幕像素宽度
    const lineMaterial = new LineMaterial({
      color,
      linewidth: 5, // 线宽，单位屏幕像素
      transparent: true,
      opacity: 1,
      // resolution 必须设置为渲染器画布尺寸
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      worldUnits: false, // false: 线宽单位为像素, true: 使用三维单位
      dashed: false, // 是否虚线
      alphaToCoverage: true, // 优化透明度渲染
    })

    const line = new Line2(lineGeometry, lineMaterial)
    // line.computeLineDistances(); // 用于虚线计算
    return line
  }
}
