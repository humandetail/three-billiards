import type Layout from './Layout'

import * as THREE from 'three'
import { CSG } from 'three-csg-ts'
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

  cornerPocketCenterPoints = [
    // 左上角
    {
      x: -(PARAMETERS.withWoodWidth / 2 - PARAMETERS.cornerPocketRadius),
      z: -(PARAMETERS.withWoodHeight / 2 - PARAMETERS.cornerPocketRadius),
    },
    // 右上角
    {
      x: PARAMETERS.withWoodWidth / 2 - PARAMETERS.cornerPocketRadius,
      z: -(PARAMETERS.withWoodHeight / 2 - PARAMETERS.cornerPocketRadius),
    },
    // 左下角
    {
      x: -(PARAMETERS.withWoodWidth / 2 - PARAMETERS.cornerPocketRadius),
      z: PARAMETERS.withWoodHeight / 2 - PARAMETERS.cornerPocketRadius,
    },
    // 右下角
    {
      x: PARAMETERS.withWoodWidth / 2 - PARAMETERS.cornerPocketRadius,
      z: PARAMETERS.withWoodHeight / 2 - PARAMETERS.cornerPocketRadius,
    },
  ]

  middlePocketCenterPoints = [
    {
      x: 0,
      z: -(PARAMETERS.withWoodHeight / 2 - PARAMETERS.middlePocketRadius),
    },
    {
      x: 0,
      z: PARAMETERS.withWoodHeight / 2 - PARAMETERS.middlePocketRadius,
    },
  ]

  // 补齐板
  horizontalFixedBoardCenterPoints = [
    {
      x: -(PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 4 - PARAMETERS.middlePocketRadius / 2,
      z: -(PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4) / 2 - PARAMETERS.cornerPocketRadius,
    },
    {
      x: (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 4 + PARAMETERS.middlePocketRadius / 2,
      z: -(PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4) / 2 - PARAMETERS.cornerPocketRadius,
    },
    {
      x: -(PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 4 - PARAMETERS.middlePocketRadius / 2,
      z: (PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4) / 2 + PARAMETERS.cornerPocketRadius,
    },
    {
      x: (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 4 + PARAMETERS.middlePocketRadius / 2,
      z: (PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4) / 2 + PARAMETERS.cornerPocketRadius,
    },
  ]

  verticalFixedBoardCenterPoints = [
    {
      x: -(PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 2 - PARAMETERS.cornerPocketRadius,
      z: 0,
    },
    {
      x: (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 2 + PARAMETERS.cornerPocketRadius,
      z: 0,
    },
  ]

  // 木质支撑层
  horizontalWoodSupportLayerCenterPoints = [
    {
      x: -(PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 4 - PARAMETERS.middlePocketRadius / 2,
      z: -(PARAMETERS.withWoodHeight - PARAMETERS.woodWidth) / 2,
    },
    {
      x: (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 4 + PARAMETERS.middlePocketRadius / 2,
      z: -(PARAMETERS.withWoodHeight - PARAMETERS.woodWidth) / 2,
    },
    {
      x: -(PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 4 - PARAMETERS.middlePocketRadius / 2,
      z: (PARAMETERS.withWoodHeight - PARAMETERS.woodWidth) / 2,
    },
    {
      x: (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 4 + PARAMETERS.middlePocketRadius / 2,
      z: (PARAMETERS.withWoodHeight - PARAMETERS.woodWidth) / 2,
    },
  ]

  verticalWoodSupportLayerCenterPoints = [
    {
      x: -(PARAMETERS.withWoodWidth - PARAMETERS.woodWidth) / 2,
      z: 0,
    },
    {
      x: (PARAMETERS.withWoodWidth - PARAMETERS.woodWidth) / 2,
      z: 0,
    },
  ]

  // 橡胶条
  horizontalRubberCenterPoints = [
    {
      x: -(PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 4 - PARAMETERS.middlePocketRadius / 2,
      z: -(PARAMETERS.withWoodHeight / 2 - PARAMETERS.woodWidth - PARAMETERS.rubberWidth / 2),
    },
    {
      x: (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 4 + PARAMETERS.middlePocketRadius / 2,
      z: -(PARAMETERS.withWoodHeight / 2 - PARAMETERS.woodWidth - PARAMETERS.rubberWidth / 2),
    },
    {
      x: -(PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 4 - PARAMETERS.middlePocketRadius / 2,
      z: (PARAMETERS.withWoodHeight / 2 - PARAMETERS.woodWidth - PARAMETERS.rubberWidth / 2),
    },
    {
      x: (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 4 + PARAMETERS.middlePocketRadius / 2,
      z: (PARAMETERS.withWoodHeight / 2 - PARAMETERS.woodWidth - PARAMETERS.rubberWidth / 2),
    },
  ]

  verticalRubberCenterPoints = [
    {
      x: -(PARAMETERS.withWoodWidth / 2 - PARAMETERS.woodWidth - PARAMETERS.rubberWidth / 2),
      z: 0,
    },
    {
      x: (PARAMETERS.withWoodWidth / 2 - PARAMETERS.woodWidth - PARAMETERS.rubberWidth / 2),
      z: 0,
    },
  ]

  constructor(public layout: Layout) {}

  makeTable() {
    this.makeTableBoard()

    // make a ball
    {
      const geometry = new THREE.SphereGeometry(PARAMETERS.ballRadius, 32, 32)
      const material = new THREE.MeshPhongMaterial({ color: 'white' })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.y = this.offGround.tableTop + PARAMETERS.ballRadius
      mesh.position.x = -PARAMETERS.tableWidth / 2 + PARAMETERS.cornerPocketRadius * 2
      mesh.position.z = -PARAMETERS.tableHeight / 2 + PARAMETERS.cornerPocketRadius * 2
      this.layout.addObject(mesh)
    }
  }

  makeTableBoard() {
    // 中间整个大板
    {
      const width = PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4
      const height = PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4

      const geometry = new THREE.BoxGeometry(
        width,
        PARAMETERS.tableThickness,
        height,
      )
      const material = new THREE.MeshPhongMaterial({ color: 'green' })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.y = this.offGround.tableCenter
      this.layout.addObject(mesh)
    }
    // 袋口位置
    // {
    //   const cylinderMaterial = new THREE.MeshPhongMaterial({ color: 'blue' })
    //   this.cornerPocketCenterPoints.forEach((point) => {
    //     const cylinderGeometry = new THREE.CylinderGeometry(PARAMETERS.cornerPocketRadius, PARAMETERS.cornerPocketRadius, PARAMETERS.tableThickness, 32)
    //     const cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial)
    //     cylinderMesh.position.y = this.offGround.tableCenter
    //     cylinderMesh.position.x = point.x
    //     cylinderMesh.position.z = point.z
    //     this.layout.addObject(cylinderMesh)
    //   })

    //   this.middlePocketCenterPoints.forEach((point) => {
    //     const cylinderGeometry = new THREE.CylinderGeometry(PARAMETERS.middlePocketRadius, PARAMETERS.middlePocketRadius, PARAMETERS.tableThickness, 32)
    //     const cylinderMesh = new THREE.Mesh(cylinderGeometry, cylinderMaterial)
    //     cylinderMesh.position.y = this.offGround.tableCenter
    //     cylinderMesh.position.x = point.x
    //     cylinderMesh.position.z = point.z
    //     this.layout.addObject(cylinderMesh)
    //   })
    // }
    // 袋口包边
    {
      // 角袋周长
      const scale = 10
      const size = 0.1
      const quarterCornerPocketPerimeter = Math.ceil(2 * PARAMETERS.cornerPocketRadius * Math.PI * scale / 4)
      const quarterMiddlePocketPerimeter = Math.ceil(2 * PARAMETERS.middlePocketRadius * Math.PI * scale / 4)

      // 分入口和非入口
      const materialA = new THREE.MeshPhongMaterial({ color: 'green' })
      const materialB = new THREE.MeshPhongMaterial({ color: 'brown' })
      const openSide = [0, 1, 3, 2]

      let thickness = PARAMETERS.tableThickness
      let y = this.offGround.tableCenter
      let material = materialA

      this.cornerPocketCenterPoints.forEach(({ x: cx, z: cz }, cIndex) => {
        for (let i = 0; i < 4; i++) {
          const points = getPoints(
            cx,
            cz,
            PARAMETERS.cornerPocketRadius,
            i * (Math.PI / 2),
            (i + 1) * (Math.PI / 2),
            false,
            quarterCornerPocketPerimeter,
          )
          if (openSide[cIndex] === i) {
            thickness = PARAMETERS.tableThickness
            y = this.offGround.tableCenter
            material = materialA
          }
          else {
            thickness = PARAMETERS.bankTotalThickness + PARAMETERS.tableThickness
            y = this.offGround.tableBottom + thickness / 2
            material = materialB
          }
          points.forEach((p) => {
            const height = PARAMETERS.cornerPocketRadius - (
              cIndex < 2
                ? i < 2
                  ? (Math.abs(cz) - Math.abs(p.y))
                  : (Math.abs(p.y) - Math.abs(cz))
                : i < 2
                  ? (Math.abs(p.y) - Math.abs(cz))
                  : (Math.abs(cz) - Math.abs(p.y))
            )

            const mesh = new THREE.Mesh(
              new THREE.BoxGeometry(
                size,
                thickness,
                height,
              ),
              material,
            )
            mesh.position.x = p.x
            mesh.position.y = y
            mesh.position.z = i < 2
              ? cz + PARAMETERS.cornerPocketRadius - height / 2
              : cz - PARAMETERS.cornerPocketRadius + height / 2
            this.layout.addObject(mesh)
          })
        }
      })

      this.middlePocketCenterPoints.forEach(({ x: cx, z: cz }, cIndex) => {
        for (let i = 0; i < 4; i++) {
          const points = getPoints(cx, cz, PARAMETERS.middlePocketRadius, i * (Math.PI / 2), (i + 1) * (Math.PI / 2), false, quarterMiddlePocketPerimeter)
          if ((cIndex === 0 && i < 2) || (cIndex === 1 && i >= 2)) {
            thickness = PARAMETERS.tableThickness
            y = this.offGround.tableCenter
            material = materialA
          }
          else {
            thickness = PARAMETERS.bankTotalThickness + PARAMETERS.tableThickness
            y = this.offGround.tableBottom + thickness / 2
            material = materialB
          }
          points.forEach((p) => {
            const height = PARAMETERS.middlePocketRadius - (
              cIndex === 0
                ? i < 2
                  ? (Math.abs(cz) - Math.abs(p.y))
                  : (Math.abs(p.y) - Math.abs(cz))
                : i < 2
                  ? (Math.abs(p.y) - Math.abs(cz))
                  : (Math.abs(cz) - Math.abs(p.y))
            )
            const mesh = new THREE.Mesh(
              new THREE.BoxGeometry(size, thickness, height),
              material,
            )
            mesh.position.x = p.x
            mesh.position.y = y
            mesh.position.z = i < 2
              ? cz + PARAMETERS.middlePocketRadius - height / 2
              : cz - PARAMETERS.middlePocketRadius + height / 2
            this.layout.addObject(mesh)
          })
        }
      })
    }
    // 补齐板
    {
      const material = new THREE.MeshPhongMaterial({ color: 'green' })
      this.horizontalFixedBoardCenterPoints.forEach(({ x: cx, z: cz }) => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 2 - PARAMETERS.middlePocketRadius,
            PARAMETERS.tableThickness,
            PARAMETERS.cornerPocketRadius * 2,
          ),
          material,
        )
        mesh.position.x = cx
        mesh.position.y = this.offGround.tableCenter
        mesh.position.z = cz
        this.layout.addObject(mesh)
      })

      this.verticalFixedBoardCenterPoints.forEach(({ x: cx, z: cz }) => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            PARAMETERS.cornerPocketRadius * 2,
            PARAMETERS.tableThickness,
            (PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4),
          ),
          material,
        )
        mesh.position.x = cx
        mesh.position.y = this.offGround.tableCenter
        mesh.position.z = cz
        this.layout.addObject(mesh)
      })

      // 中袋缺口
      for (let i = 0; i < 2; i++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            PARAMETERS.middlePocketRadius * 2,
            PARAMETERS.tableThickness,
            PARAMETERS.cornerPocketRadius * 2 - PARAMETERS.middlePocketRadius * 2,
          ),
          material,
        )
        mesh.position.x = 0
        mesh.position.y = this.offGround.tableCenter
        mesh.position.z = ((PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4) / 2 + (PARAMETERS.cornerPocketRadius * 2 - PARAMETERS.middlePocketRadius * 2) / 2) * (i === 0 ? -1 : 1)
        this.layout.addObject(mesh)
      }
    }
    // 木条外边框 cloth
    {
      const material = new THREE.MeshPhongMaterial({ color: 'brown' })
      for (let i = 0; i < 2; i++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            PARAMETERS.outerWidth,
            PARAMETERS.tableThickness + PARAMETERS.bankTotalThickness,
            PARAMETERS.clothWidth,
          ),
          material,
        )
        mesh.position.y = this.offGround.tableBottom + (PARAMETERS.tableThickness + PARAMETERS.bankTotalThickness) / 2
        mesh.position.z = (PARAMETERS.outerHeight / 2 - PARAMETERS.clothWidth / 2) * (i === 0 ? -1 : 1)
        this.layout.addObject(mesh)
      }

      for (let j = 0; j < 2; j++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            PARAMETERS.clothWidth,
            PARAMETERS.tableThickness + PARAMETERS.bankTotalThickness,
            PARAMETERS.outerHeight,
          ),
          material,
        )
        mesh.position.x = (PARAMETERS.outerWidth / 2 - PARAMETERS.clothWidth / 2) * (j === 0 ? -1 : 1)
        mesh.position.y = this.offGround.tableBottom + (PARAMETERS.tableThickness + PARAMETERS.bankTotalThickness) / 2
        this.layout.addObject(mesh)
      }
    }
    // 木质支撑层
    {
      const material = new THREE.MeshPhongMaterial({ color: 'brown' })

      this.horizontalWoodSupportLayerCenterPoints.forEach(({ x: cx, z: cz }) => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 2 - PARAMETERS.middlePocketRadius,
            PARAMETERS.bankTotalThickness,
            PARAMETERS.woodWidth,
          ),
          material,
        )
        mesh.position.x = cx
        mesh.position.y = this.offGround.bankCenter
        mesh.position.z = cz
        this.layout.addObject(mesh)
      })

      this.verticalWoodSupportLayerCenterPoints.forEach(({ x: cx, z: cz }) => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            PARAMETERS.woodWidth,
            PARAMETERS.bankTotalThickness,
            PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4,
          ),
          material,
        )
        mesh.position.x = cx
        mesh.position.y = this.offGround.bankCenter
        mesh.position.z = cz
        this.layout.addObject(mesh)
      })
    }

    // 胶条
    {
      // @todo - 胶条是带有 45 度角的，需要处理
      const material = new THREE.MeshPhongMaterial({ color: 'green' })

      this.horizontalRubberCenterPoints.forEach(({ x: cx, z: cz }, cIndex) => {
        const width = (PARAMETERS.withWoodWidth - PARAMETERS.cornerPocketRadius * 4) / 2 - PARAMETERS.middlePocketRadius - PARAMETERS.rubberWidth * 2
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            width,
            PARAMETERS.bankTotalThickness,
            PARAMETERS.rubberWidth,
          ),
          material,
        )
        mesh.position.x = cx
        mesh.position.y = this.offGround.bankCenter
        mesh.position.z = cz
        this.layout.addObject(mesh)

        {
          // @todo - 先使用简单的圆柱体
          const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
              PARAMETERS.rubberWidth,
              PARAMETERS.rubberWidth,
              PARAMETERS.bankTotalThickness,
              128,
              128,
              false,
              cIndex < 2 ? Math.PI * 1.5 : Math.PI,
              Math.PI / 2,
            ),
            material,
          )
          mesh.position.x = cx - width / 2
          mesh.position.y = this.offGround.bankCenter
          mesh.position.z = cz + (cIndex < 2 ? -1 : 1) * PARAMETERS.rubberWidth / 2
          this.layout.addObject(mesh)
        }
        {
          // @todo - 先使用简单的圆柱体
          const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
              PARAMETERS.rubberWidth,
              PARAMETERS.rubberWidth,
              PARAMETERS.bankTotalThickness,
              128,
              128,
              false,
              cIndex < 2 ? 0 : Math.PI / 2,
              Math.PI / 2,
            ),
            material,
          )
          mesh.position.x = cx + width / 2
          mesh.position.y = this.offGround.bankCenter
          mesh.position.z = cz + (cIndex < 2 ? -1 : 1) * PARAMETERS.rubberWidth / 2
          this.layout.addObject(mesh)
        }
      })

      this.verticalRubberCenterPoints.forEach(({ x: cx, z: cz }, cIndex) => {
        const height = PARAMETERS.withWoodHeight - PARAMETERS.cornerPocketRadius * 4 - PARAMETERS.rubberWidth * 2
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(
            PARAMETERS.rubberWidth,
            PARAMETERS.bankTotalThickness,
            height,
          ),
          material,
        )
        mesh.position.x = cx
        mesh.position.y = this.offGround.bankCenter
        mesh.position.z = cz
        this.layout.addObject(mesh)

        {
          // @todo - 先使用简单的圆柱体
          const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
              PARAMETERS.rubberWidth,
              PARAMETERS.rubberWidth,
              PARAMETERS.bankTotalThickness,
              128,
              128,
              false,
              cIndex === 0 ? Math.PI / 2 : Math.PI,
              Math.PI / 2,
            ),
            material,
          )
          mesh.position.x = cx + (cIndex === 0 ? -1 : 1) * PARAMETERS.rubberWidth / 2
          mesh.position.y = this.offGround.bankCenter
          mesh.position.z = cz - height / 2
          this.layout.addObject(mesh)
        }
        {
          // @todo - 先使用简单的圆柱体
          const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(
              PARAMETERS.rubberWidth,
              PARAMETERS.rubberWidth,
              PARAMETERS.bankTotalThickness,
              128,
              128,
              false,
              cIndex === 0 ? 0 : Math.PI * 1.5,
              Math.PI / 2,
            ),
            material,
          )
          mesh.position.x = cx + (cIndex === 0 ? -1 : 1) * PARAMETERS.rubberWidth / 2
          mesh.position.y = this.offGround.bankCenter
          mesh.position.z = cz + height / 2
          this.layout.addObject(mesh)
        }
      })
    }
  }
}
