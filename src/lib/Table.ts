import type Layout from './Layout'

import * as THREE from 'three'
import { CSG } from 'three-csg-ts'
import { PARAMETERS } from '../config'
import { getPoints } from '../utils'

export default class Table {
  pocketY = PARAMETERS.offGroundHeight + PARAMETERS.tableThickness / 2 - PARAMETERS.pocketHeight / 2
  pockets = [
    // 左上
    {
      x: -PARAMETERS.tableWidth / 2,
      y: this.pocketY,
      z: -PARAMETERS.tableHeight / 2,
      radius: PARAMETERS.cornerPocketRadius,
    },
    {
      x: -PARAMETERS.tableWidth / 2,
      y: this.pocketY,
      z: PARAMETERS.tableHeight / 2,
      radius: PARAMETERS.cornerPocketRadius,
    },
    {
      x: PARAMETERS.tableWidth / 2,
      y: this.pocketY,
      z: PARAMETERS.tableHeight / 2,
      radius: PARAMETERS.cornerPocketRadius,
    },
    {
      x: PARAMETERS.tableWidth / 2,
      y: this.pocketY,
      z: -PARAMETERS.tableHeight / 2,
      radius: PARAMETERS.cornerPocketRadius,
    },

    {
      x: 0,
      y: this.pocketY,
      z: PARAMETERS.tableHeight / 2,
      radius: PARAMETERS.middlePocketRadius,
    },
    {
      x: 0,
      y: this.pocketY,
      z: -PARAMETERS.tableHeight / 2,
      radius: PARAMETERS.middlePocketRadius,
    },
  ]

  constructor(public layout: Layout) {}

  makeTable() {
    // this.makeTableBoard()

    // this.makeInnerBank()
    // this.makeOuterBank()

    // this.makeFrame()

    // this.makeBorder()

    // this.pockets.forEach((pocket) => {
    //   this.makePocket(pocket.x, pocket.y, pocket.z, pocket.radius)
    // })

    // make a ball
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(PARAMETERS.ballRadius, 32, 32),
      new THREE.MeshPhongMaterial({ color: 'white' }),
    )
    ball.position.set(
      -PARAMETERS.tableWidth / 2 + PARAMETERS.ballRadius,
      PARAMETERS.offGroundHeight + PARAMETERS.ballRadius + PARAMETERS.ballRadius,
      PARAMETERS.tableHeight / 2 - PARAMETERS.ballRadius,
    )
    this.layout.addObject(ball)
  }

  makeTableBoard() {
    const material = new THREE.MeshPhongMaterial({ color: 'green' })

    const translate = PARAMETERS.cornerPocketTranslate
    const scale = 10

    const angles = [
      // 左
      {
        startAngle: Math.PI / 2,
        endAngle: 0,
        antiClockwise: true,
      },
      // 中
      {
        startAngle: Math.PI,
        endAngle: Math.PI * 2,
        antiClockwise: true,
      },
      // 右
      {
        startAngle: Math.PI,
        endAngle: Math.PI / 2,
        antiClockwise: true,
      },
    ]

    angles.forEach((angle, angleIndex) => {
      const r = angleIndex % 2 === 0 ? PARAMETERS.cornerPocketRadius + translate : PARAMETERS.middlePocketRadius
      const startAngle = angle.startAngle
      const endAngle = angle.endAngle
      const l = Math.ceil(scale * Math.abs(endAngle - startAngle) * r / 0.1)

      const points = getPoints(0, -r, r, startAngle, endAngle, true, l)

      points.forEach((point) => {
        const side = new THREE.Mesh(
          new THREE.BoxGeometry(
            0.1,
            PARAMETERS.tableThickness,
            (PARAMETERS.tableHeight - 2 * r) + Math.abs(point.y) * 2,
          ),
          material,
        )

        const x = [
          point.x - PARAMETERS.tableWidth / 2,
          point.x,
          point.x + PARAMETERS.tableWidth / 2,
        ]
        side.position.set(
          x[angleIndex],
          PARAMETERS.offGroundHeight,
          0,
        )
        this.layout.addObject(side)
      })
    })

    // 中间的板
    for (let i = 0; i < 2; i++) {
      const side = new THREE.Mesh(
        new THREE.BoxGeometry(
          PARAMETERS.tableWidth / 2 - PARAMETERS.cornerPocketRadius - PARAMETERS.middlePocketRadius - translate,
          PARAMETERS.tableThickness,
          PARAMETERS.tableHeight,
        ),
        material,
      )
      side.position.set(
        i === 0
          ? 0 - PARAMETERS.tableWidth / 4 + translate / 2
          : 0 + PARAMETERS.tableWidth / 4 - translate / 2,
        PARAMETERS.offGroundHeight,
        0,
      )
      this.layout.addObject(side)
    }
  }

  makeInnerBank() {
    const translate = PARAMETERS.cornerPocketTranslate
    const scale = 10

    const horizontalBanks = [
      // 左上
      {
        startAngle1: Math.PI,
        endAngle1: Math.PI / 2,
        antiClockwise1: true,
        startAngle2: 0,
        endAngle2: Math.PI / 2,
        antiClockwise2: false,
      },
      // 右上
      {
        startAngle1: Math.PI,
        endAngle1: Math.PI / 2,
        antiClockwise1: true,
        startAngle2: 0,
        endAngle2: Math.PI / 2,
        antiClockwise2: false,
      },
      // 左下
      {
        startAngle1: Math.PI,
        endAngle1: Math.PI * 1.5,
        antiClockwise1: false,
        startAngle2: 0,
        endAngle2: Math.PI * 1.5,
        antiClockwise2: true,
      },
      // 右下
      {
        startAngle1: Math.PI,
        endAngle1: Math.PI * 1.5,
        antiClockwise1: false,
        startAngle2: 0,
        endAngle2: Math.PI * 1.5,
        antiClockwise2: true,
      },
    ]

    horizontalBanks.forEach((bank, bankIndex) => {
      const leftRadius = bankIndex % 2 === 0 ? PARAMETERS.cornerPocketRadius : PARAMETERS.middlePocketRadius
      const rightRadius = bankIndex % 2 === 0 ? PARAMETERS.middlePocketRadius : PARAMETERS.cornerPocketRadius
      const maxRadius = Math.max(leftRadius, rightRadius)

      const material = new THREE.MeshPhongMaterial({ color: 'blue' })
      const width = PARAMETERS.tableWidth / 2 - leftRadius * 2 - rightRadius * 2 - translate
      const depth = 0.1

      const arcLength = Math.ceil(scale * (Math.abs(bank.endAngle1 - bank.startAngle1) * maxRadius) / depth)
      const points = getPoints(0, 0, leftRadius, bank.startAngle1, bank.endAngle1, bank.antiClockwise1, arcLength)
      const points2 = getPoints(0, 0, rightRadius, bank.startAngle2, bank.endAngle2, bank.antiClockwise2, arcLength)

      points.forEach((point, pointIndex) => {
        const height = PARAMETERS.ballRadius * ((arcLength - pointIndex) / arcLength)
        const side = new THREE.Mesh(
          new THREE.BoxGeometry(
            width + Math.abs(point.x) + Math.abs(points2[pointIndex].x),
            height,
            depth,
          ),
          material,
        )
        side.position.set(
          bankIndex % 2 === 0
            ? translate / 2 - PARAMETERS.tableWidth / 4
            : PARAMETERS.tableWidth / 4 - translate / 2,
          PARAMETERS.offGroundHeight + PARAMETERS.tableThickness - height / 2,
          bankIndex < 2
            ? point.y - (PARAMETERS.tableHeight / 2 - depth / 2)
            : point.y + (PARAMETERS.tableHeight / 2 - depth / 2),
        )

        this.layout.addObject(side)
      })
    })

    const verticalBanks = [
      // 左
      {
        startAngle1: Math.PI * 1.5,
        endAngle1: 0,
        antiClockwise1: false,
        startAngle2: Math.PI / 2,
        endAngle2: 0,
        antiClockwise2: true,
      },
      // 右
      {
        startAngle1: Math.PI * 1.5,
        endAngle1: Math.PI,
        antiClockwise1: true,
        startAngle2: Math.PI / 2,
        endAngle2: Math.PI,
        antiClockwise2: false,
      },
    ]

    verticalBanks.forEach((bank, bankIndex) => {
      const radius = PARAMETERS.cornerPocketRadius

      const material = new THREE.MeshPhongMaterial({ color: 'pink' })

      const depth = PARAMETERS.tableHeight - radius * 4 - translate * 2
      const width = 0.1

      const scale = 10
      const arcLength = Math.ceil(scale * (Math.abs(bank.endAngle1 - bank.startAngle1) * radius) / width)

      const points = getPoints(0, 0, radius, bank.startAngle1, bank.endAngle1, bank.antiClockwise1, arcLength)
      const points2 = getPoints(0, 0, radius, bank.startAngle2, bank.endAngle2, bank.antiClockwise2, arcLength)

      points.forEach((point, pointIndex) => {
        const height = PARAMETERS.ballRadius * ((arcLength - pointIndex) / arcLength)
        const side = new THREE.Mesh(
          new THREE.BoxGeometry(
            width,
            height,
            depth + Math.abs(point.y) + Math.abs(points2[pointIndex].y),
          ),
          material,
        )
        side.position.set(
          bankIndex % 2 === 0
            ? point.x - (PARAMETERS.tableWidth / 2 - width / 2)
            : point.x + (PARAMETERS.tableWidth / 2 - width / 2),
          PARAMETERS.offGroundHeight + PARAMETERS.tableThickness - height / 2,
          0,
        )

        this.layout.addObject(side)
      })
    })
  }

  makeOuterBank() {
    const material = new THREE.MeshPhongMaterial({ color: 'blue' })

    const translate = PARAMETERS.cornerPocketTranslate
    const scale = 10

    const verticalBanks = [
      // 左
      {
        startAngle: Math.PI,
        endAngle: Math.PI / 2,
        antiClockwise: true,
      },
      // 右
      {
        startAngle: Math.PI / 2,
        endAngle: 0,
        antiClockwise: true,
      },
    ]

    verticalBanks.forEach((bank, bankIndex) => {
      const r = PARAMETERS.cornerPocketRadius + translate
      const startAngle = bank.startAngle
      const endAngle = bank.endAngle
      const l = Math.ceil(scale * Math.abs(endAngle - startAngle) * r / 0.1)

      const points = getPoints(0, -r, r, startAngle, endAngle, true, l)

      points.forEach((point) => {
        const side = new THREE.Mesh(
          new THREE.BoxGeometry(
            0.1,
            PARAMETERS.tableThickness,
            (PARAMETERS.tableHeight - 2 * r) + Math.abs(point.y) * 2,
          ),
          material,
        )

        const x = [
          point.x - PARAMETERS.tableWidth / 2,
          point.x + PARAMETERS.tableWidth / 2,
        ]
        side.position.set(
          x[bankIndex],
          PARAMETERS.offGroundHeight + PARAMETERS.tableThickness,
          0,
        )
        this.layout.addObject(side)
      })
    })

    const horizontalBanks = [
      // 左上
      {
        startAngle1: Math.PI * 1.5,
        endAngle1: 0,
        antiClockwise1: false,
        startAngle2: Math.PI * 1.5,
        endAngle2: Math.PI,
        antiClockwise2: true,
      },
      // 右上
      {
        startAngle1: Math.PI * 1.5,
        endAngle1: 0,
        antiClockwise1: false,
        startAngle2: Math.PI * 1.5,
        endAngle2: Math.PI,
        antiClockwise2: true,
      },
      // // 左下
      // {
      //   startAngle1: Math.PI,
      //   endAngle1: Math.PI * 1.5,
      //   antiClockwise1: false,
      //   startAngle2: 0,
      //   endAngle2: Math.PI * 1.5,
      //   antiClockwise2: true,
      // },
      // // 右下
      // {
      //   startAngle1: Math.PI,
      //   endAngle1: Math.PI * 1.5,
      //   antiClockwise1: false,
      //   startAngle2: 0,
      //   endAngle2: Math.PI * 1.5,
      //   antiClockwise2: true,
      // },
    ]

    horizontalBanks.forEach((bank, bankIndex) => {
      const leftRadius = bankIndex % 2 === 0 ? PARAMETERS.cornerPocketRadius + translate : PARAMETERS.middlePocketRadius
      const rightRadius = bankIndex % 2 === 0 ? PARAMETERS.middlePocketRadius : PARAMETERS.cornerPocketRadius + translate
      // const maxRadius = Math.max(leftRadius, rightRadius)
      const maxRadius = PARAMETERS.middlePocketRadius

      const material = new THREE.MeshPhongMaterial({ color: 'red' })
      const width = PARAMETERS.tableWidth / 2
      const depth = 0.1

      const arcLength = Math.ceil(scale * (Math.abs(bank.endAngle1 - bank.startAngle1) * maxRadius) / depth)
      const points = getPoints(0, 0, leftRadius, bank.startAngle1, bank.endAngle1, bank.antiClockwise1, arcLength)
      const points2 = getPoints(0, 0, rightRadius, bank.startAngle2, bank.endAngle2, bank.antiClockwise2, arcLength)

      points.forEach((point, pointIndex) => {
        const height = PARAMETERS.tableThickness
        console.log(point.y)
        const side = new THREE.Mesh(
          new THREE.BoxGeometry(
            width - Math.abs(point.x) - Math.abs(points2[pointIndex].x),
            height,
            depth,
          ),
          material,
        )
        side.position.set(
          bankIndex % 2 === 0
            ? -PARAMETERS.tableWidth / 4 + translate / 2
            : PARAMETERS.tableWidth / 4 - translate / 2,
          PARAMETERS.offGroundHeight + PARAMETERS.tableThickness,
          bankIndex < 2
            ? point.y - (PARAMETERS.tableHeight / 2 + depth / 2)
            : point.y + (PARAMETERS.tableHeight / 2 - depth / 2),
        )

        this.layout.addObject(side)
      })
    })
  }

  makePocket(x: number, y: number, z: number, radius: number) {
    const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, PARAMETERS.pocketHeight, 128)
    const cylinderMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000, side: THREE.DoubleSide })
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial)

    cylinder.position.set(x, y, z)

    this.layout.addObject(cylinder)
  }

  makeFrame() {
    const cylinderGeometry = new THREE.CylinderGeometry(PARAMETERS.tableHeight / 3, PARAMETERS.tableHeight / 2, PARAMETERS.offGroundHeight - PARAMETERS.tableThickness, 4)
    const cylinderMaterial = new THREE.MeshPhongMaterial({ color: 'brown', side: THREE.DoubleSide })
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial)

    cylinder.position.set(0, PARAMETERS.offGroundHeight / 2, 0)

    this.layout.addObject(cylinder)
  }

  makeBorder() {
    const boxMaterial = new THREE.MeshPhongMaterial({ color: 'green', side: THREE.DoubleSide })
    for (let i = 0; i < 2; i++) {
      const boxGeometry = new THREE.BoxGeometry(
        PARAMETERS.tableWidth,
        PARAMETERS.tableThickness,
        PARAMETERS.tableThickness * 2,
      )
      const box = new THREE.Mesh(boxGeometry, boxMaterial)

      box.position.set(0, PARAMETERS.offGroundHeight, (i === 0 ? -1 : 1) * (PARAMETERS.tableHeight / 2) - PARAMETERS.tableThickness / 2)
      box.rotation.x = THREE.MathUtils.degToRad(-90)

      this.layout.addObject(box)
    }

    for (let i = 0; i < 2; i++) {
      const boxGeometry = new THREE.BoxGeometry(
        PARAMETERS.tableHeight,
        PARAMETERS.tableThickness,
        PARAMETERS.tableThickness * 2,
      )
      const box = new THREE.Mesh(boxGeometry, boxMaterial)

      box.position.set((i === 0 ? -1 : 1) * (PARAMETERS.tableWidth / 2) - PARAMETERS.tableThickness / 2, PARAMETERS.offGroundHeight, 0)
      box.rotation.x = THREE.MathUtils.degToRad(-90)
      box.rotation.z = THREE.MathUtils.degToRad(90)

      this.layout.addObject(box)
    }
  }
}
