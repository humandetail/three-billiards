import * as THREE from 'three'
import { PARAMETERS } from './config'

import Layout from './lib/Layout'
import Table from './lib/Table'
import './style.css'

function main() {
  const layout = new Layout(document.querySelector('#main-canvas') as HTMLCanvasElement)

  // const geometry = new THREE.BoxGeometry(1, 1, 1)
  // const material = new THREE.MeshBasicMaterial({ color: 0x00FF00 })
  // const cube = new THREE.Mesh(geometry, material)
  // cube.position.set(0, 5, 0)
  // layout.addObject(cube)

  // cube.castShadow = true
  // cube.receiveShadow = true

  // const tableBoard = new THREE.Mesh(
  //   new THREE.BoxGeometry(PARAMETERS.TABLE_WIDTH, PARAMETERS.TABLE_HEIGHT, PARAMETERS.TABLE_THICKNESS),
  //   new THREE.MeshPhongMaterial({ color: 'deepskyblue', side: THREE.DoubleSide }),
  // )
  // tableBoard.position.set(0, 4, 0)
  // tableBoard.rotation.x = THREE.MathUtils.degToRad(-90)

  // tableBoard.castShadow = true
  // tableBoard.receiveShadow = true

  // layout.addObject(tableBoard)
  const table = new Table(layout)
  table.makeTable()
  setTimeout(() => {
    layout.render()
  })
}

main()
