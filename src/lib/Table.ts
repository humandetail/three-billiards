import type Layout from './Layout'

import Cannon from 'cannon'
import * as THREE from 'three'
import { PARAMETERS } from '../config'
import { getPoints } from '../utils'

export default class Table {
  offGround = {
    tableBottom: PARAMETERS.offGroundHeight,
    tableCenter: PARAMETERS.offGroundHeight + PARAMETERS.tableThickness / 2,
    tableTop: PARAMETERS.offGroundHeight + PARAMETERS.tableThickness,

    bankBottom: PARAMETERS.offGroundHeight + PARAMETERS.tableThickness,
    bankCenter: PARAMETERS.offGroundHeight + PARAMETERS.tableThickness + PARAMETERS.bankTotalThickness / 2,
    bankTop: PARAMETERS.offGroundHeight + PARAMETERS.tableThickness + PARAMETERS.bankTotalThickness,
  }

  clothMaterial = new THREE.MeshPhongMaterial({ color: 'green' })
  woodMaterial = new THREE.MeshPhongMaterial({ color: 'brown' })

  constructor(public layout: Layout) {}

  makeTable() {
    const sceneObject = this.layout.makeSceneObject('table')
    sceneObject.position.y = this.offGround.tableCenter

    // const mesh = new THREE.Mesh(
    //   new THREE.BoxGeometry(
    //     10,
    //     4,
    //     20,
    //   ),
    //   new THREE.MeshPhongMaterial({ color: 'brown' }),
    // )
    // mesh.position.y = 0
    // this.layout.addObject(
    //   'root',
    //   mesh,
    //   10,
    //   4,
    //   20,
    // )

    // this.makeTableLegs()
    this.makeTableBoard()
    this.makeTableLine()
  }

  makeTableBoard() {
    // 中间整个大板
    {
      const sceneObject = this.layout.getSceneObject('table')!

      const width = PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4
      const height = PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4

      const geometry = new THREE.BoxGeometry(
        width,
        PARAMETERS.tableThickness,
        height,
      )
      const mesh = new THREE.Mesh(geometry, this.clothMaterial)
      sceneObject.add(mesh)

      this.createTableBody(mesh, width, PARAMETERS.tableThickness, height)
    }
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
      let material = this.clothMaterial

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
              material = this.clothMaterial
              thickness = PARAMETERS.tableThickness
              y = 0
            }
            else {
              thickness = PARAMETERS.bankTotalThickness + PARAMETERS.tableThickness
              y = -PARAMETERS.tableThickness / 2 + thickness / 2
              material = this.woodMaterial
            }

            const mesh = new THREE.Mesh(
              isOpenRight
                ? new THREE.BoxGeometry(
                  width,
                  thickness,
                  size,
                )
                : new THREE.BoxGeometry(
                  size,
                  thickness,
                  height,
                ),
              material,
            )
            mesh.position.x = isOpenRight
              ? cIndex === 0 || cIndex === 3
                ? PARAMETERS.cornerPocketRadius - width / 2
                : -PARAMETERS.cornerPocketRadius + width / 2
              : p.x
            mesh.position.y = y
            mesh.position.z = isOpenRight
              ? p.y
              : i < 2
                ? PARAMETERS.cornerPocketRadius - height / 2
                : -PARAMETERS.cornerPocketRadius + height / 2
            obj.add(mesh)

            // 创建物理刚体
            this.createTableBody(mesh, isOpenRight ? width : size, thickness, isOpenRight ? size : height)
          })
        }
      })

      Array.from({ length: 2 }, (_, cIndex) => {
        const obj = this.layout.makeSceneObject(`middlePocket-${cIndex}`, tableSceneObject)
        obj.position.x = 0
        obj.position.z = cIndex === 0
          ? -PARAMETERS.withWoodHeight / 2 + PARAMETERS.middlePocketRadius
          : PARAMETERS.withWoodHeight / 2 - PARAMETERS.middlePocketRadius
        return obj
      }).forEach((obj, cIndex) => {
        for (let i = 0; i < 4; i++) {
          const points = getPoints(0, 0, PARAMETERS.middlePocketRadius, i * (Math.PI / 2), (i + 1) * (Math.PI / 2), false, quarterMiddlePocketPerimeter)
          if ((cIndex === 0 && i < 2) || (cIndex === 1 && i >= 2)) {
            thickness = PARAMETERS.tableThickness
            y = 0
            material = this.clothMaterial
          }
          else {
            thickness = PARAMETERS.bankTotalThickness + PARAMETERS.tableThickness
            y = -PARAMETERS.tableThickness / 2 + thickness / 2
            material = this.woodMaterial
          }
          points.forEach((p) => {
            const height = PARAMETERS.middlePocketRadius - Math.abs(p.y)
            const mesh = new THREE.Mesh(
              new THREE.BoxGeometry(size, thickness, height),
              material,
            )
            mesh.position.x = p.x
            mesh.position.y = y
            mesh.position.z = i < 2
              ? 0 + PARAMETERS.middlePocketRadius - height / 2
              : 0 - PARAMETERS.middlePocketRadius + height / 2
            obj.add(mesh)

            // 创建物理刚体
            this.createTableBody(mesh, size, thickness, height)
          })
        }
      })
    }
    // 补齐板
    {
      const tableSceneObject = this.layout.getSceneObject('table')!

      const horizontalWidth = (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 2 - PARAMETERS.middlePocketRadius
      const horizontalHeight = PARAMETERS.cornerPocketRadius * 2
      const horizontalZ = PARAMETERS.withWoodHeight / 2 - PARAMETERS.cornerPocketRadius

      for (let i = 0; i < 4; i++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            horizontalWidth,
            PARAMETERS.tableThickness,
            horizontalHeight,
          ),
          this.clothMaterial,
        )
        mesh.position.x = i % 2 === 0
          ? -horizontalWidth / 2 - PARAMETERS.middlePocketRadius
          : horizontalWidth / 2 + PARAMETERS.middlePocketRadius
        mesh.position.z = i < 2
          ? -horizontalZ
          : horizontalZ
        tableSceneObject.add(mesh)

        // 创建物理刚体
        this.createTableBody(mesh, horizontalWidth, PARAMETERS.tableThickness, horizontalHeight)
      }

      const verticalWidth = PARAMETERS.cornerPocketRadius * 2
      const verticalHeight = PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4
      const verticalX = PARAMETERS.withWoodWidth / 2 - PARAMETERS.cornerPocketRadius

      for (let j = 0; j < 2; j++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            verticalWidth,
            PARAMETERS.tableThickness,
            verticalHeight,
          ),
          this.clothMaterial,
        )
        mesh.position.x = j === 0
          ? -verticalX
          : verticalX
        tableSceneObject.add(mesh)

        // 创建物理刚体
        this.createTableBody(mesh, verticalWidth, PARAMETERS.tableThickness, verticalHeight)
      }

      const fixedBoardWidth = PARAMETERS.middlePocketRadius * 2
      const fixedBoardHeight = PARAMETERS.cornerPocketRadius * 2 - PARAMETERS.middlePocketRadius * 2
      const fixedBoardZ = horizontalZ - horizontalHeight / 2 + fixedBoardHeight / 2

      for (let k = 0; k < 2; k++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            fixedBoardWidth,
            PARAMETERS.tableThickness,
            fixedBoardHeight,
          ),
          this.clothMaterial,
        )
        mesh.position.z = k === 0
          ? -fixedBoardZ
          : fixedBoardZ
        tableSceneObject.add(mesh)

        // 创建物理刚体
        this.createTableBody(mesh, fixedBoardWidth, PARAMETERS.tableThickness, fixedBoardHeight)
      }
    }
    // 木条外边框 side
    {
      const tableSceneObject = this.layout.getSceneObject('table')!
      for (let i = 0; i < 2; i++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            PARAMETERS.outerWidth,
            PARAMETERS.tableThickness + PARAMETERS.bankTotalThickness,
            PARAMETERS.sideWidth,
          ),
          this.woodMaterial,
        )
        mesh.position.y = PARAMETERS.bankTotalThickness / 2
        mesh.position.z = (PARAMETERS.outerHeight / 2 - PARAMETERS.sideWidth / 2) * (i === 0 ? -1 : 1)
        tableSceneObject.add(mesh)
      }

      for (let j = 0; j < 2; j++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            PARAMETERS.sideWidth,
            PARAMETERS.tableThickness + PARAMETERS.bankTotalThickness,
            PARAMETERS.outerHeight,
          ),
          this.woodMaterial,
        )
        mesh.position.x = (PARAMETERS.outerWidth / 2 - PARAMETERS.sideWidth / 2) * (j === 0 ? -1 : 1)
        mesh.position.y = PARAMETERS.bankTotalThickness / 2
        tableSceneObject.add(mesh)
      }
    }
    // 木质支撑层
    {
      const tableSceneObject = this.layout.getSceneObject('table')!

      const y = PARAMETERS.tableThickness / 2 + PARAMETERS.bankTotalThickness / 2

      const horizontalWidth = (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 2 - PARAMETERS.middlePocketRadius
      const horizontalHeight = PARAMETERS.woodWidth
      const horizontalZ = PARAMETERS.withWoodHeight / 2 - PARAMETERS.woodWidth / 2

      for (let i = 0; i < 4; i++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            horizontalWidth,
            PARAMETERS.bankTotalThickness,
            horizontalHeight,
          ),
          this.woodMaterial,
        )
        mesh.position.x = i % 2 === 0
          ? -horizontalWidth / 2 - PARAMETERS.middlePocketRadius
          : horizontalWidth / 2 + PARAMETERS.middlePocketRadius
        mesh.position.z = i < 2
          ? -horizontalZ
          : horizontalZ
        mesh.position.y = y
        tableSceneObject.add(mesh)
      }

      const verticalWidth = PARAMETERS.woodWidth
      const verticalHeight = PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4
      const verticalX = PARAMETERS.withWoodWidth / 2 - PARAMETERS.woodWidth / 2

      for (let j = 0; j < 2; j++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            verticalWidth,
            PARAMETERS.bankTotalThickness,
            verticalHeight,
          ),
          this.woodMaterial,
        )
        mesh.position.x = j === 0
          ? -verticalX
          : verticalX
        mesh.position.y = y
        tableSceneObject.add(mesh)
      }
    }

    // 胶条
    {
      const tableSceneObject = this.layout.getSceneObject('table')!

      const scale = 20
      const perimeter = Math.ceil(2 * PARAMETERS.rubberWidth * Math.PI * scale / 4)
      const size = PARAMETERS.rubberWidth / perimeter
      const thicknessList = Array.from({ length: perimeter }, (_, i) => {
        return Math.min(PARAMETERS.bankContactHeight + Math.tan(Math.PI / 4) * size * i, PARAMETERS.bankTotalThickness)
      })

      const bankTop = PARAMETERS.tableThickness / 2 + PARAMETERS.bankTotalThickness

      const horizontalWidth = (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 2 - PARAMETERS.middlePocketRadius - PARAMETERS.rubberWidth * 2
      const horizontalX = (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 4 + PARAMETERS.middlePocketRadius / 2
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

        thicknessList.forEach((thickness, i) => {
          const { x } = leftPoints[i]
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(
              horizontalWidth + Math.abs(x) * 2,
              thickness,
              size,
            ),
            this.clothMaterial,
          )
          mesh.position.x = cx
          mesh.position.y = bankTop - thickness / 2
          mesh.position.z = cz + (PARAMETERS.rubberWidth / 2 - size * i) * (cIndex < 2 ? 1 : -1)
          tableSceneObject.add(mesh)

          // 创建物理刚体
          this.createRubberBody(mesh, horizontalWidth + Math.abs(x) * 2, thickness, size)
        })

        return null
      })

      const verticalHeight = PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4 - PARAMETERS.rubberWidth * 2
      const verticalX = PARAMETERS.withWoodWidth / 2 - PARAMETERS.woodWidth - PARAMETERS.rubberWidth / 2

      Array.from({ length: 4 }, (_, cIndex) => {
        const cx = cIndex === 0
          ? -verticalX
          : verticalX
        const points = cIndex === 0
          ? getPoints(0, 0, PARAMETERS.rubberWidth, 0, Math.PI * 1.5, true, perimeter)
          : getPoints(0, 0, PARAMETERS.rubberWidth, 0, Math.PI / 2, false, perimeter)

        thicknessList.forEach((thickness, i) => {
          const { y } = points[i]
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(
              size,
              thickness,
              verticalHeight + Math.abs(y) * 2,
            ),
            this.clothMaterial,
          )
          mesh.position.x = cx + (PARAMETERS.rubberWidth / 2 - size * i) * (cIndex === 0 ? 1 : -1)
          mesh.position.y = bankTop - thickness / 2
          tableSceneObject.add(mesh)

          // 创建物理刚体
          this.createRubberBody(mesh, size, thickness, verticalHeight + Math.abs(y) * 2)
        })

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
    const geometry = new THREE.BoxGeometry(10, PARAMETERS.offGroundHeight, 10)
    const material = new THREE.MeshPhongMaterial({ color: 0x8B4513 }) // 棕色木材材质
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.position.y = PARAMETERS.offGroundHeight / 2

    this.layout.addObject('root', mesh)
  }

  // 创建台面底部的物理刚体
  createTableBody(mesh: THREE.Mesh, width: number, height: number, thickness: number) {
    // 创建物理刚体
    const position = mesh.getWorldPosition(new THREE.Vector3())

    const body = new Cannon.Body({
      mass: 0,
      position: new Cannon.Vec3(position.x, position.y, position.z),
      shape: new Cannon.Box(new Cannon.Vec3(
        width / 2,
        height / 2,
        thickness / 2,
      )),
    })
    this.layout.world.addBody(body)
    this.layout.boxsBody.push(body)

    body.material = this.layout.tableMaterial
  }

  // 创建胶条的物理刚体
  createRubberBody(mesh: THREE.Mesh, width: number, height: number, thickness: number) {
    // 创建物理刚体
    const position = mesh.getWorldPosition(new THREE.Vector3())

    const body = new Cannon.Body({
      mass: 0,
      position: new Cannon.Vec3(position.x, position.y, position.z),
      shape: new Cannon.Box(new Cannon.Vec3(
        width / 2,
        height / 2,
        thickness / 2,
      )),
    })
    this.layout.world.addBody(body)
    this.layout.boxsBody.push(body)

    body.material = this.layout.rubberMaterial
  }
}
