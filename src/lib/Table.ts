import type Layout from './Layout'

import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'
import { PARAMETERS } from '../config'
import { getPoints, setGeometryColor } from '../utils'
import Compound from './Compound'

interface BoxAttr {
  width: number
  height: number
  depth: number
  color: THREE.Color
  x: number
  y: number
  z: number
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
    this.makeTableBoard()
    this.makeTableLine()
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

            // const mesh = new THREE.Mesh(
            //   new THREE.BoxGeometry(size, thickness, height),
            //   material,
            // )
            // mesh.position.x = p.x
            // mesh.position.y = y
            // mesh.position.z = i < 2
            //   ? 0 + PARAMETERS.middlePocketRadius - height / 2
            //   : 0 - PARAMETERS.middlePocketRadius + height / 2
            // obj.add(mesh)

            // // 创建物理刚体
            // this.createTableBody(mesh, size, thickness, height)
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
      [0 + legWidth / 2, boardHeight / 2 - legDepth / 2],
      [0 + legWidth / 2, -boardHeight / 2 + legDepth / 2],
      [-boardWidth / 2 + legWidth / 2, boardHeight / 2 - legDepth / 2],
      [-boardWidth / 2 + legWidth / 2, -boardHeight / 2 + legDepth / 2],
    ]

    positions.forEach((position) => {
      const geometry = new THREE.BoxGeometry(legWidth, legHeight, legDepth)
      const material = new THREE.MeshPhongMaterial({ color: 'gold' }) // 金色材质
      const mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.position.set(
        position[0],
        legHeight / 2,
        position[1],
      )

      const body = new CANNON.Body({
        mass: 0,
      })
      body.addShape(new CANNON.Box(new CANNON.Vec3(legWidth / 2, legHeight / 2, legDepth / 2)))
      body.position.set(position[0], position[1], position[2])
      this.layout.world.addBody(body)
      this.layout.addObject('root', mesh)
    })
  }

  // 创建台面底部的物理刚体
  createTableBody(mesh: THREE.Mesh, width: number, height: number, thickness: number) {
    // 创建物理刚体
    const position = mesh.getWorldPosition(new THREE.Vector3())

    const body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      shape: new CANNON.Box(new CANNON.Vec3(
        width / 2,
        height / 2,
        thickness / 2,
      )),
    })
    this.layout.world.addBody(body)
    body.material = this.layout.tableMaterial
  }

  mergeBox(boxes: BoxAttr[]) {
    const geometries: THREE.BoxGeometry[] = []

    boxes.forEach(({ width, height, depth, color, x, y, z }) => {
      const geo = new THREE.BoxGeometry(width, height, depth)
      setGeometryColor(geo, color)
      geo.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z))
      geometries.push(geo)
    })

    const mesh = new THREE.Mesh(
      BufferGeometryUtils.mergeGeometries(geometries, false),
      new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
    )

    this.layout.scene.add(mesh)
    mesh.position.y = this.offGround.tableCenter
  }
}
