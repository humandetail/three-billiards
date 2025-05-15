import type Layout from './Layout'

import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'

import { PARAMETERS } from '../config'
import { getPoints, setGeometryColor } from '../utils'
import Compound from './Compound'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'

interface BoxAttr {
  width: number
  height: number
  depth: number
  color: THREE.Color
  x: number
  y: number
  z: number
}

interface PocketAttr {
  position: {
    x: number
    y: number
    z: number
  }
  isRotate: boolean
}

export default class Table {
  offGround = {
    tableBottom: PARAMETERS.offGroundHeight,
    tableCenter: PARAMETERS.offGroundHeight + PARAMETERS.tableThickness / 2,
    tableTop: PARAMETERS.offGroundHeight + PARAMETERS.tableThickness,

    bankBottom: PARAMETERS.offGroundHeight + PARAMETERS.tableThickness,
    bankCenter: PARAMETERS.offGroundHeight + PARAMETERS.tableThickness + PARAMETERS.bankTotalThickness / 2,
    bankTop: PARAMETERS.offGroundHeight + PARAMETERS.tableThickness + PARAMETERS.bankTotalThickness,
  }

  clothMaterial = new THREE.MeshPhongMaterial({ color: 0x00AA00 })
  woodMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 })

  clothColor = new THREE.Color(0x00AA00)
  woodColor = new THREE.Color(0x8B4513)

  boxes: BoxAttr[] = []

  constructor(public layout: Layout) {}

  makeTable() {
    const sceneObject = this.layout.makeSceneObject('table')
    sceneObject.position.y = this.offGround.tableCenter

    this.makeTableLegs()
    this.makeTableBody()
    this.makeTableBoard()
    this.makeTableLine()

    const cornerX = PARAMETERS.withWoodWidth / 2 - PARAMETERS.cornerPocketRadius
    const cornerZ = PARAMETERS.withWoodHeight / 2 - PARAMETERS.cornerPocketRadius
    const middleX = 0
    const middleZ = PARAMETERS.withWoodHeight / 2 - PARAMETERS.middlePocketRadius
    const pocketOptions = [
      { x: -cornerX, z: -cornerZ }, // 左上
      { x: middleX, z: -middleZ }, // 中上
      { x: cornerX, z: -cornerZ }, // 右上
      { x: cornerX, z: cornerZ }, // 右下
      { x: middleX, z: middleZ }, // 中下
      { x: -cornerX, z: cornerZ }, // 左下
    ]
    pocketOptions.forEach((position, index) => {
      this.makePocket({
        position: {
          ...position,
          y: this.offGround.tableBottom ,
        },
        isRotate: index === 0 || index === pocketOptions.length - 1,
      })
    })
  }

  makeTableBoard() {
    const tableCompound = new Compound({
      mass: 0,
      meshPosition: new THREE.Vector3(0, this.offGround.tableCenter, 0),
      bodyPosition: new CANNON.Vec3(0, this.offGround.tableCenter, 0),
    })
    // 中间整个大板
    {
      const width = PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4
      const height = PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4
      tableCompound.add({
        width,
        height: PARAMETERS.tableThickness,
        depth: height,
        color: this.clothColor,
        x: 0,
        y: 0,
        z: 0,
      })
    }
    // 补齐板
    {
      const horizontalWidth = (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 2 - PARAMETERS.middlePocketRadius
      const horizontalHeight = PARAMETERS.cornerPocketRadius * 2
      const horizontalZ = PARAMETERS.withWoodHeight / 2 - PARAMETERS.cornerPocketRadius

      for (let i = 0; i < 4; i++) {
        tableCompound.add({
          width: horizontalWidth,
          height: PARAMETERS.tableThickness,
          depth: horizontalHeight,
          color: this.clothColor,
          x: i % 2 === 0
            ? -horizontalWidth / 2 - PARAMETERS.middlePocketRadius
            : horizontalWidth / 2 + PARAMETERS.middlePocketRadius,
          y: 0,
          z: i < 2
            ? -horizontalZ
            : horizontalZ,
        })
      }

      const verticalWidth = PARAMETERS.cornerPocketRadius * 2
      const verticalHeight = PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4
      const verticalX = PARAMETERS.withWoodWidth / 2 - PARAMETERS.cornerPocketRadius

      for (let j = 0; j < 2; j++) {
        tableCompound.add({
          width: verticalWidth,
          height: PARAMETERS.tableThickness,
          depth: verticalHeight,
          color: this.clothColor,
          x: j === 0
            ? -verticalX
            : verticalX,
          y: 0,
          z: 0,
        })
      }

      const fixedBoardWidth = PARAMETERS.middlePocketRadius * 2
      const fixedBoardHeight = PARAMETERS.cornerPocketRadius * 2 - PARAMETERS.middlePocketRadius * 2
      const fixedBoardZ = horizontalZ - horizontalHeight / 2 + fixedBoardHeight / 2

      for (let k = 0; k < 2; k++) {
        tableCompound.add({
          width: fixedBoardWidth,
          height: PARAMETERS.tableThickness,
          depth: fixedBoardHeight,
          color: this.clothColor,
          x: 0,
          y: 0,
          z: k === 0
            ? -fixedBoardZ
            : fixedBoardZ,
        })
      }
    }
    // 木质支撑层
    {
      const y = PARAMETERS.tableThickness / 2 + PARAMETERS.bankTotalThickness / 2

      const horizontalWidth = (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 2 - PARAMETERS.middlePocketRadius
      const horizontalHeight = PARAMETERS.woodWidth
      const horizontalZ = PARAMETERS.withWoodHeight / 2 - PARAMETERS.woodWidth / 2

      for (let i = 0; i < 4; i++) {
        tableCompound.add({
          width: horizontalWidth,
          height: PARAMETERS.bankTotalThickness,
          depth: horizontalHeight,
          color: this.woodColor,
          x: i % 2 === 0
            ? -horizontalWidth / 2 - PARAMETERS.middlePocketRadius
            : horizontalWidth / 2 + PARAMETERS.middlePocketRadius,
          y,
          z: i < 2
            ? -horizontalZ
            : horizontalZ,
        })
      }

      const verticalWidth = PARAMETERS.woodWidth
      const verticalHeight = PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4
      const verticalX = PARAMETERS.withWoodWidth / 2 - PARAMETERS.woodWidth / 2

      for (let j = 0; j < 2; j++) {
        tableCompound.add({
          width: verticalWidth,
          height: PARAMETERS.bankTotalThickness,
          depth: verticalHeight,
          color: this.woodColor,
          x: j === 0
            ? -verticalX
            : verticalX,
          y,
          z: 0,
        })
      }
    }
    // 木条外边框 side
    for (let i = 0; i < 2; i++) {
      tableCompound.add({
        width: PARAMETERS.outerWidth,
        height: PARAMETERS.tableThickness + PARAMETERS.bankTotalThickness,
        depth: PARAMETERS.sideWidth,
        color: this.woodColor,
        x: 0,
        y: PARAMETERS.bankTotalThickness / 2,
        z: (PARAMETERS.outerHeight / 2 - PARAMETERS.sideWidth / 2) * (i === 0 ? -1 : 1),
      })
    }

    for (let j = 0; j < 2; j++) {
      tableCompound.add({
        width: PARAMETERS.sideWidth,
        height: PARAMETERS.tableThickness + PARAMETERS.bankTotalThickness,
        depth: PARAMETERS.outerHeight,
        color: this.woodColor,
        x: (PARAMETERS.outerWidth / 2 - PARAMETERS.sideWidth / 2) * (j === 0 ? -1 : 1),
        y: PARAMETERS.bankTotalThickness / 2,
        z: 0,
      })
    }

    const { mesh, body } = tableCompound.generate()
    this.layout.scene.add(mesh)
    this.layout.world.addBody(body)

    // 袋口包边
    {
      const tableSceneObject = this.layout.getSceneObject('table')!
      // 角袋周长
      const scale = 20
      const size = 0.1
      const quarterCornerPocketPerimeter = Math.ceil(2 * PARAMETERS.cornerPocketRadius * Math.PI * scale / 4)
      const quarterMiddlePocketPerimeter = Math.ceil(2 * PARAMETERS.middlePocketRadius * Math.PI * scale / 4)

      let thickness = PARAMETERS.tableThickness
      let y = 0
      let color = this.clothColor

      const posX = PARAMETERS.withWoodWidth / 2 - PARAMETERS.cornerPocketRadius
      const posZ = PARAMETERS.withWoodHeight / 2 - PARAMETERS.cornerPocketRadius

      // 区分入口和非入口
      const diff = PARAMETERS.cornerPocketRadius - PARAMETERS.woodWidth
      const pos = [
        { x: -posX, z: -posZ }, // top
        { x: posX, z: -posZ }, // right
        { x: posX, z: posZ }, // bottom
        { x: -posX, z: posZ }, // left
      ]

      pos.map(({ x, z }, index) => {
        const obj = this.layout.makeSceneObject(`cornerPocket-${index}`, tableSceneObject)
        obj.position.x = x
        obj.position.z = z
        return obj
      }).forEach((obj, cIndex) => {
        const p = obj.getWorldPosition(new THREE.Vector3())
        const compound = new Compound({
          mass: 0,
          meshPosition: new THREE.Vector3(0, 0, 0),
          bodyPosition: new CANNON.Vec3(p.x, this.offGround.tableCenter, p.z),
        })
        for (let i = 0; i < 4; i++) {
          const startAngle = i * (Math.PI / 2)
          const endAngle = (i + 1) * (Math.PI / 2)
          const points = getPoints(
            0,
            0,
            PARAMETERS.cornerPocketRadius,
            startAngle,
            endAngle,
            false,
            quarterCornerPocketPerimeter,
          )

          const isOpenLeft = (cIndex === 0 && i === 1)
            || (cIndex === 1 && i === 0)
            || (cIndex === 2 && i === 3)
            || (cIndex === 3 && i === 2)

          const isOpenRight = (cIndex === 0 && i === 3)
            || (cIndex === 1 && i === 2)
            || (cIndex === 2 && i === 1)
            || (cIndex === 3 && i === 0)

          points.forEach((p) => {
            const width = PARAMETERS.cornerPocketRadius - Math.abs(p.x)
            const height = PARAMETERS.cornerPocketRadius - Math.abs(p.y)

            if (
              cIndex === i || (
                (Math.abs(p.x) <= diff) && isOpenLeft
              ) || (
                Math.abs(p.y) <= diff && isOpenRight
              )
            ) {
              color = this.clothColor
              thickness = PARAMETERS.tableThickness
              y = 0
            }
            else {
              thickness = PARAMETERS.bankTotalThickness + PARAMETERS.tableThickness
              y = -PARAMETERS.tableThickness / 2 + thickness / 2
              color = this.woodColor
            }

            compound.add({
              width: isOpenRight ? width : size,
              height: thickness,
              depth: isOpenRight ? size : height,
              x: isOpenRight
                ? cIndex === 0 || cIndex === 3
                  ? PARAMETERS.cornerPocketRadius - width / 2
                  : -PARAMETERS.cornerPocketRadius + width / 2
                : p.x,
              y,
              z: isOpenRight
                ? p.y
                : i < 2
                  ? PARAMETERS.cornerPocketRadius - height / 2
                  : -PARAMETERS.cornerPocketRadius + height / 2,
              color,
            })
          })
        }

        const { mesh, body } = compound.generate()
        obj.add(mesh)
        this.layout.world.addBody(body)

        body.material = this.layout.rubberMaterial
        this.layout.boxes.push(mesh)
        this.layout.boxesBody.push(body)
      })

      Array.from({ length: 2 }, (_, cIndex) => {
        const obj = this.layout.makeSceneObject(`middlePocket-${cIndex}`, tableSceneObject)
        obj.position.x = 0
        obj.position.z = cIndex === 0
          ? -PARAMETERS.withWoodHeight / 2 + PARAMETERS.middlePocketRadius
          : PARAMETERS.withWoodHeight / 2 - PARAMETERS.middlePocketRadius
        return obj
      }).forEach((obj, cIndex) => {
        const p = obj.getWorldPosition(new THREE.Vector3())
        const compound = new Compound({
          mass: 0,
          meshPosition: new THREE.Vector3(0, 0, 0),
          bodyPosition: new CANNON.Vec3(p.x, this.offGround.tableCenter, p.z),
        })
        for (let i = 0; i < 4; i++) {
          const points = getPoints(0, 0, PARAMETERS.middlePocketRadius, i * (Math.PI / 2), (i + 1) * (Math.PI / 2), false, quarterMiddlePocketPerimeter)
          if ((cIndex === 0 && i < 2) || (cIndex === 1 && i >= 2)) {
            thickness = PARAMETERS.tableThickness
            y = 0
            color = this.clothColor
          }
          else {
            thickness = PARAMETERS.bankTotalThickness + PARAMETERS.tableThickness
            y = -PARAMETERS.tableThickness / 2 + thickness / 2
            color = this.woodColor
          }
          points.forEach((p) => {
            const height = PARAMETERS.middlePocketRadius - Math.abs(p.y)

            compound.add({
              width: size,
              height: thickness,
              depth: height,
              x: p.x,
              y,
              z: i < 2
                ? 0 + PARAMETERS.middlePocketRadius - height / 2
                : 0 - PARAMETERS.middlePocketRadius + height / 2,
              color,
            })
          })
        }

        const { mesh, body } = compound.generate()
        obj.add(mesh)
        this.layout.world.addBody(body)
      })
    }

    // 胶条
    {
      const tableSceneObject = this.layout.getSceneObject('table')!

      const scale = 20
      const perimeter = Math.ceil(2 * PARAMETERS.rubberWidth * Math.PI * scale / 4)
      const size = PARAMETERS.rubberWidth / perimeter

      const bankTop = PARAMETERS.tableThickness / 2 + PARAMETERS.bankTotalThickness
      const horizontalWidth = PARAMETERS.withWoodWidth / 2 - PARAMETERS.cornerPocketRadius * 2 - PARAMETERS.middlePocketRadius - PARAMETERS.rubberWidth * 2 + 0.5
      const horizontalX = PARAMETERS.middlePocketRadius + PARAMETERS.rubberWidth + horizontalWidth / 2
      const horizontalZ = PARAMETERS.withWoodHeight / 2 - PARAMETERS.woodWidth - PARAMETERS.rubberWidth / 2

      Array.from({ length: 4 }, (_, cIndex) => {
        const cx = cIndex % 2 === 0
          ? -horizontalX
          : horizontalX
        const cz = cIndex < 2
          ? -horizontalZ
          : horizontalZ

        const leftPoints = cIndex < 2
          ? getPoints(0, 0, PARAMETERS.rubberWidth, Math.PI / 2, Math.PI, false, perimeter)
          : getPoints(0, 0, PARAMETERS.rubberWidth, Math.PI * 1.5, Math.PI, true, perimeter)

        const compound = new Compound({
          mass: 0,
          meshPosition: new THREE.Vector3(0, 0, 0),
          bodyPosition: new CANNON.Vec3(0, this.offGround.tableCenter, 0),
        })

        leftPoints.forEach(({ x }, i) => {
          compound.add({
            width: horizontalWidth + Math.abs(x) * 2,
            height: PARAMETERS.bankContactHeight,
            depth: size,
            x: cx,
            y: bankTop - PARAMETERS.bankContactHeight / 2,
            z: cz + (PARAMETERS.rubberWidth / 2 - size * i) * (cIndex < 2 ? 1 : -1),
            color: this.clothColor,
          })
        })

        const { mesh, body } = compound.generate()
        tableSceneObject.add(mesh)
        this.layout.world.addBody(body)
        body.material = this.layout.rubberMaterial

        return null
      })

      const verticalHeight = PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4 - PARAMETERS.rubberWidth * 2 + 0.5
      const verticalX = PARAMETERS.withWoodWidth / 2 - PARAMETERS.woodWidth - PARAMETERS.rubberWidth / 2

      Array.from({ length: 2 }, (_, cIndex) => {
        const cx = cIndex === 0
          ? -verticalX
          : verticalX
        const points = cIndex === 0
          ? getPoints(0, 0, PARAMETERS.rubberWidth, 0, Math.PI * 1.5, true, perimeter)
          : getPoints(0, 0, PARAMETERS.rubberWidth, 0, Math.PI / 2, false, perimeter)

        const compound = new Compound({
          mass: 0,
          meshPosition: new THREE.Vector3(0, 0, 0),
          bodyPosition: new CANNON.Vec3(0, this.offGround.tableCenter, 0),
        })

        points.forEach(({ y }, i) => {
          compound.add({
            width: size,
            height: PARAMETERS.bankContactHeight,
            depth: verticalHeight + Math.abs(y) * 2,
            x: cx + (PARAMETERS.rubberWidth / 2 - size * i) * (cIndex === 0 ? 1 : -1),
            y: bankTop - PARAMETERS.bankContactHeight / 2,
            z: 0,
            color: this.clothColor,
          })
        })

        const { mesh, body } = compound.generate()
        tableSceneObject.add(mesh)
        this.layout.world.addBody(body)

        body.material = this.layout.rubberMaterial

        return null
      })
    }
  }

  makeTableLine() {
    const tableSceneObject = this.layout.getSceneObject('table')!
    const lineSize = PARAMETERS.tableHeight / 2

    const geometry = new THREE.BufferGeometry()
    const vertices = new Float32Array([
      -PARAMETERS.withWoodWidth / 4,
      PARAMETERS.tableThickness / 2,
      -lineSize, // 起点

      -PARAMETERS.withWoodWidth / 4,
      PARAMETERS.tableThickness / 2,
      lineSize, // 终点
    ])
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    const material = new THREE.LineBasicMaterial({ color: 0xFFFFFF })
    const line = new THREE.Line(geometry, material)

    tableSceneObject.add(line)

    // 置球点
    const cueBallPosition = PARAMETERS.withWoodWidth / 4
    const cueBallGeometry = new THREE.CircleGeometry(1, 32, 32)
    const cueBallMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
    const cueBallMesh = new THREE.Mesh(cueBallGeometry, cueBallMaterial)

    cueBallMesh.position.x = cueBallPosition
    cueBallMesh.position.y = PARAMETERS.tableThickness / 2
    cueBallMesh.rotation.x = -Math.PI / 2
    tableSceneObject.add(cueBallMesh)
  }

  makeTableBody() {
    const boardWidth = PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4
    const boardHeight = PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4

    const bodyDepth = PARAMETERS.bodyDepth
    const legWidth = PARAMETERS.legWidth

    const geometries: THREE.BufferGeometry[] = []

    const width = boardWidth - legWidth * 2
    const height = boardHeight - legWidth * 2

    const bodyGeo = new THREE.BoxGeometry(width, bodyDepth, height)
    setGeometryColor(bodyGeo, this.woodColor)
    geometries.push(bodyGeo)

    for (let i = 0; i < 4; i++) {
      const w = (width - legWidth) / 2
      const h = legWidth
      const geo = new THREE.BoxGeometry(w, bodyDepth, h)
      setGeometryColor(geo, this.woodColor)
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
      setGeometryColor(geo, this.woodColor)
      const matrix = new THREE.Matrix4()
      matrix.makeTranslation(new THREE.Vector3(
          (i === 0 ? -1 : 1) * (width / 2 + legWidth / 2),
          0,
          0,
      ))
      geo.applyMatrix4(matrix)
      geometries.push(geo)
    }

    const mesh = new THREE.Mesh(
      BufferGeometryUtils.mergeGeometries(geometries, false),
      new THREE.MeshPhongMaterial({ vertexColors: true, }),
    )

    mesh.position.set(0, this.offGround.tableBottom - bodyDepth / 2, 0)
    this.layout.scene.add(mesh)
  }

  // 创建桌脚
  makeTableLegs() {
    const boardWidth = PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4
    const boardHeight = PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4

    const legWidth = PARAMETERS.legWidth
    const legHeight = PARAMETERS.legHeight
    const legDepth = PARAMETERS.legDepth

    const positions = [
      [boardWidth / 2 - legWidth / 2, boardHeight / 2 - legDepth / 2],
      [boardWidth / 2 - legWidth / 2, -boardHeight / 2 + legDepth / 2],
      [0, boardHeight / 2 - legDepth / 2],
      [0, -boardHeight / 2 + legDepth / 2],
      [-boardWidth / 2 + legWidth / 2, boardHeight / 2 - legDepth / 2],
      [-boardWidth / 2 + legWidth / 2, -boardHeight / 2 + legDepth / 2],
    ]

    const geometries = positions.map((position) => {
      const geometry = new THREE.BoxGeometry(legWidth, legHeight, legDepth)
      setGeometryColor(geometry, this.woodColor)
      const matrix = new THREE.Matrix4()
      matrix.makeTranslation(new THREE.Vector3(
        position[0],
        legHeight / 2,
        position[1],
      ))
      geometry.applyMatrix4(matrix)

      return geometry
    })

    const mesh = new THREE.Mesh(
      BufferGeometryUtils.mergeGeometries(geometries, false),
      new THREE.MeshPhongMaterial({ vertexColors: true, }),
    )
    this.layout.scene.add(mesh)
  }

  makePocket(options: PocketAttr) {
    // 漏斗参数
    const topWidth = PARAMETERS.cornerPocketRadius * 2 // 顶部宽度
    const bottomWidth = PARAMETERS.ballRadius * 2 * 1.1 // 底部宽度
    const height = PARAMETERS.ballRadius * 2 * 1.5 // 高度
    const bottomHeight = PARAMETERS.ballRadius * 2 * 1.2 // 底部高度
    const wallThickness = 0.2 // 壁厚

    // 计算几何参数
    const delta = (topWidth / 2 - bottomWidth / 2)
    const theta = Math.atan(delta / height) // 倾斜角度
    const L = Math.sqrt(delta * delta + height * height) // 斜面长度

    const poleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x3170A6,
      clearcoat: 0.92,
      clearcoatRoughness: 0.35,
    })

    // 四个方向：+x, -x, +z, -z
    const directions = [
      { axis: 'x', sign: 1, rotAxis: new CANNON.Vec3(0, 0, 1) }, // +X方向绕Z轴旋转
      { axis: 'x', sign: -1, rotAxis: new CANNON.Vec3(0, 0, 1) }, // -X方向绕Z轴旋转
      { axis: 'z', sign: 1, rotAxis: new CANNON.Vec3(1, 0, 0) }, // +Z方向绕X轴旋转
      { axis: 'z', sign: -1, rotAxis: new CANNON.Vec3(1, 0, 0) }, // -Z方向绕X轴旋转
    ]

    const body = new CANNON.Body({
      mass: 0,
    })

    directions.forEach((dir) => {
      // 根据方向设置尺寸
      let halfExtents
      if (dir.axis === 'x') {
        halfExtents = new CANNON.Vec3(
          wallThickness / 2,
          L / 2,
          topWidth / 2,
        )
      }
      else { // z方向
        halfExtents = new CANNON.Vec3(
          topWidth / 2,
          L / 2,
          wallThickness / 2,
        )
      }

      // 计算旋转角度（正负号处理）
      const angle = dir.sign * theta
      const quaternion = new CANNON.Quaternion().setFromAxisAngle(dir.rotAxis, angle)

      // 设置位置
      const pos = new CANNON.Vec3()
      if (dir.axis === 'x') {
        pos.x = -1 * dir.sign * (topWidth / 2 + bottomWidth / 2) / 2 // X方向中心
        pos.y = height / 2 // 高度居中
      }
      else {
        pos.z = dir.sign * (topWidth / 2 + bottomWidth / 2) / 2 // Z方向中心
        pos.y = height / 2
      }

      body.addShape(
        new CANNON.Box(halfExtents),
        pos,
        quaternion,
      )

      if (dir.axis === 'z' && dir.sign === 1) {
        return
      }
      // 底部接球区
      const bottomShape = new CANNON.Box(new CANNON.Vec3(
        bottomWidth / 2,
        bottomHeight / 2,
        wallThickness / 2,
      ))
      const bottomPos = new CANNON.Vec3()
      bottomPos.y = -bottomHeight / 2 // 高度居中
      if (dir.axis === 'x') {
        bottomPos.z = dir.sign * bottomWidth / 2 // Z方向中心
      }
      else {
        bottomPos.x = -1 * dir.sign * bottomWidth / 2 // X方向中心
      }
      body.addShape(
        bottomShape,
        bottomPos,
        new CANNON.Quaternion().setFromAxisAngle(new CANNON.Vec3(0, 1, 0), dir.sign * Math.PI / 2 * (dir.axis === 'x' ? 0 : 1)),
      )
    })

    // 底板
    const baseWidth = PARAMETERS.ballRadius * 12
    const baseShape = new CANNON.Box(new CANNON.Vec3(
      baseWidth / 2,
      bottomHeight / 2,
      wallThickness / 2,
    ))
    // 后
    body.addShape(
      baseShape,
      new CANNON.Vec3(bottomWidth / 2 - baseWidth / 2, -bottomHeight / 2, -bottomWidth / 2),
    )
    // 前
    body.addShape(
      baseShape,
      new CANNON.Vec3(bottomWidth / 2 - baseWidth / 2, -bottomHeight / 2, bottomWidth / 2),
    )
    // 底
    const floor = new CANNON.Box(new CANNON.Vec3(
      baseWidth / 2,
      wallThickness / 2,
      bottomWidth / 2,
    ))
    const q = new CANNON.Quaternion()
    const tiltAngle = 2 * (Math.PI / 180) // 绕 Z 轴旋转 10 度（右下倾斜）
    q.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), tiltAngle)

    const h = baseWidth / 2 * Math.sin(tiltAngle)
    body.addShape(
      floor,
      new CANNON.Vec3(
        bottomWidth / 2 - baseWidth / 2,
        -bottomHeight + h,
        0,
      ),
      q,
    )
    // 上
    const ceiling = new CANNON.Box(new CANNON.Vec3(
      (baseWidth - bottomWidth) / 2,
      wallThickness / 2,
      bottomWidth / 2,
    ))

    body.addShape(
      ceiling,
      new CANNON.Vec3(
        -(baseWidth - bottomWidth) / 2 - bottomWidth / 2,
        0,
        0,
      ),
      q,
    )

    // 封
    const capShape = new CANNON.Box(new CANNON.Vec3(
      wallThickness / 2,
      bottomHeight / 2,
      bottomWidth / 2,
    ))
    const capPos = new CANNON.Vec3(-baseWidth + bottomWidth / 2, -bottomHeight / 2, 0)
    body.addShape(
      capShape,
      capPos,
    )

    // THREE ---------
    const group = new THREE.Group()

    const cylinderMesh = this.createLineFunnel(
      bottomWidth / 2,
      topWidth / 2,
      height,
      8,
      0.1,
      3,
      0xE9ECF1,
    )
    cylinderMesh.position.set(0, height / 2, 0)
    group.add(cylinderMesh)

    let sWidth = baseWidth
    const sHeight = bottomHeight
    const sSize = 0.5
    const tiltAngleDiff = h
    const m1Points = [
      [0, sHeight],
      [sWidth, sHeight + tiltAngleDiff],
      [sWidth, -height - tiltAngleDiff], // 注意 -height 延长到入口处
      [sWidth - sSize, -height - tiltAngleDiff],
      [sWidth - sSize, sHeight + tiltAngleDiff - sSize],
      [sSize, sHeight - sSize],
      [sSize, 0],
    ]
    sWidth -= bottomWidth / 2
    const m2Points = [
      [0, sHeight],
      [sWidth, sHeight + tiltAngleDiff],
      [sWidth, -height + tiltAngleDiff],
      [sWidth - sSize, -height + tiltAngleDiff],
      [sWidth - sSize, sHeight + tiltAngleDiff - sSize],
      [sSize, sHeight - sSize],
      [sSize, 0],
    ]
    const attrs = [
      { points: m1Points, position: new THREE.Vector3(bottomWidth / 2, 0, 0) },
      { points: m2Points, position: new THREE.Vector3(0, PARAMETERS.ballRadius / 2, bottomWidth / 2) },
      { points: m2Points, position: new THREE.Vector3(0, PARAMETERS.ballRadius / 2, -bottomWidth / 2) },
    ]

    attrs.forEach(({ points, position }) => {
      const shape = new THREE.Shape()
      shape.moveTo(0, 0)
      points.forEach(([x, y]) => {
        shape.lineTo(x, y)
      })
      shape.lineTo(0, 0)
      const extrudeSettings = {
        depth: sSize * 2, // 挤出厚度
        bevelEnabled: false, // 禁用倒角
      }
      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
      const m = new THREE.Mesh(geo, poleMaterial)
      m.position.set(position.x, position.y, position.z)
      m.rotation.set(Math.PI, Math.PI, 0)
      group.add(m)
    })

    // 加几个环
    ;[
      { position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Vector3(Math.PI / 2, 0, 0) },
      { position: new THREE.Vector3(-sWidth / 3, -bottomHeight / 2 - sSize, sSize), rotation: new THREE.Vector3(0, Math.PI / 2, 0) },
      { position: new THREE.Vector3(-sWidth * 2 / 3, -bottomHeight / 2 - sSize, sSize), rotation: new THREE.Vector3(0, Math.PI / 2, 0) },
    ].forEach(({ position, rotation }) => {
      const tours = new THREE.TorusGeometry(
        bottomWidth / 2,
        sSize,
        128,
        128,
      )
      const tourMesh = new THREE.Mesh(tours, poleMaterial)
      tourMesh.position.copy(position)
      tourMesh.rotation.set(rotation.x, rotation.y, rotation.z)
      group.add(tourMesh)
    })
    group.position.set(options.position.x, options.position.y - height, options.position.z)
    group.rotation.set(0, options.isRotate ? Math.PI : 0, 0)
    this.layout.scene.add(group)

    body.position.set(options.position.x, options.position.y - height, options.position.z)
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), options.isRotate ? Math.PI : 0)
    this.layout.world.addBody(body)
  }

  // 创建抗锯齿宽线漏斗
  createLineFunnel(topR: number, bottomR: number, height: number, segments: number, thickness: number, lineWidth: number, color: number) {
    const vertices = []
    const indices = []

    // === 1. 生成顶点数据（保持原方案结构） ===
    for (let side = 0; side < 2; side++) { // 0=外壁, 1=内壁
      const radiusOffset = side === 0 ? thickness : 0
      for (let y = 0; y <= segments; y++) {
        const progress = y / segments
        const radius = topR + (bottomR - topR) * progress - radiusOffset
        const angleStep = (Math.PI * 2) / segments
        for (let i = 0; i <= segments; i++) {
          const angle = i * angleStep
          vertices.push(
            radius * Math.cos(angle),
            -height / 2 + progress * height,
            radius * Math.sin(angle),
          )
        }
      }
    }

    // === 2. 生成线段索引 ===
    // 内外壁纵向线
    for (let side = 0; side < 2; side++) {
      const offset = side * (segments + 1) * (segments + 1)
      for (let y = 0; y < segments; y++) {
        for (let i = 0; i <= segments; i++) {
          const a = offset + y * (segments + 1) + i
          const b = a + (segments + 1)
          indices.push(a, b)
        }
      }
    }

    // 内外壁横向线
    for (let side = 0; side < 2; side++) {
      const offset = side * (segments + 1) * (segments + 1)
      for (let y = 0; y <= segments; y++) {
        for (let i = 0; i < segments; i++) {
          const a = offset + y * (segments + 1) + i
          const b = a + 1
          indices.push(a, b)
        }
      }
    }

    // 连接内外壁的垂直线
    for (let y = 0; y <= segments; y++) {
      for (let i = 0; i <= segments; i++) {
        const outerIdx = y * (segments + 1) + i
        const innerIdx = outerIdx + (segments + 1) * (segments + 1)
        indices.push(outerIdx, innerIdx)
      }
    }

    // === 3. 转换为 LineGeometry ===
    const lineGeo = new LineGeometry()
    const linePositions = []

    // 将顶点索引转换为连续的线段数据
    for (let i = 0; i < indices.length; i += 2) {
      const startIdx = indices[i]
      const endIdx = indices[i + 1]
      linePositions.push(
        vertices[startIdx * 3], // 起点X
        vertices[startIdx * 3 + 1], // 起点Y
        vertices[startIdx * 3 + 2], // 起点Z
        vertices[endIdx * 3], // 终点X
        vertices[endIdx * 3 + 1], // 终点Y
        vertices[endIdx * 3 + 2], // 终点Z
      )
    }
    lineGeo.setPositions(linePositions)

    // === 4. 创建宽线材质 ===
    const lineMaterial = new LineMaterial({
      color, // 线条颜色
      linewidth: lineWidth, // 线宽（单位由worldUnits决定）
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      worldUnits: false, // false: 线宽单位为像素, true: 使用三维单位
      dashed: false, // 是否虚线
      alphaToCoverage: true, // 优化透明度渲染
    })

    // === 5. 创建最终线条对象 ===
    const line = new Line2(lineGeo, lineMaterial)
    // line.computeLineDistances(); // 用于虚线计算（本例未启用）

    return line
  }
}
