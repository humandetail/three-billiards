import type Layout from './Layout'

import * as THREE from 'three'
import { CSG } from 'three-csg-ts'
import { PARAMETERS } from '../config'

export default class Table {
  pocketY = PARAMETERS.offGroundHeight + PARAMETERS.tableThickness / 2 - PARAMETERS.pocketHeight / 2
  pockets = [
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
    this.makeTableBoard()

    this.makeFrame()

    this.makeBorder()

    this.pockets.forEach((pocket) => {
      this.makePocket(pocket.x, pocket.y, pocket.z, pocket.radius)
    })
  }

  makeTableBoard() {
    const boxGeometry = new THREE.BoxGeometry(PARAMETERS.tableWidth, PARAMETERS.tableHeight, PARAMETERS.tableThickness)
    const tableBoard = new THREE.Mesh(boxGeometry, new THREE.MeshPhongMaterial({ color: 'deepskyblue', side: THREE.DoubleSide }))

    // const cylinderGeometry = new THREE.CylinderGeometry(PARAMETERS.cornerPocketRadius, PARAMETERS.cornerPocketRadius, PARAMETERS.pocketHeight, 128)
    // const cylinderMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000, side: THREE.DoubleSide })
    // const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial)

    tableBoard.castShadow = true
    tableBoard.receiveShadow = true

    tableBoard.position.set(0, PARAMETERS.offGroundHeight, 0)
    tableBoard.rotation.x = THREE.MathUtils.degToRad(-90)
    this.layout.addObject(tableBoard)

    // this.layout.addObject(cylinder)

    // tableBoard.castShadow = true
    // tableBoard.receiveShadow = true

    // const result = CSG.subtract(tableBoard, cylinder)
    // result.position.set(0, 4, 0)
    // result.rotation.x = THREE.MathUtils.degToRad(-90)

    // const tableBoardBody = new CANNON.Body({
    //   mass: 1,
    // })

    // this.layout.scene.add(result)

    // const tableBoardBody = new CANNON.Body({
    //   mass: 1,
    // })

    // this.layout.world.addBody(tableBoardBody)
  }

  makeBank() {}

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
        PARAMETERS.tableThickness * 2
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
        PARAMETERS.tableThickness * 2
      )
      const box = new THREE.Mesh(boxGeometry, boxMaterial)

      box.position.set((i === 0 ? -1 : 1) * (PARAMETERS.tableWidth / 2) - PARAMETERS.tableThickness / 2, PARAMETERS.offGroundHeight, 0)
      box.rotation.x = THREE.MathUtils.degToRad(-90)
      box.rotation.z = THREE.MathUtils.degToRad(90)

      this.layout.addObject(box)
    }
  }
}
