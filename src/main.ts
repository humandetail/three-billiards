import * as THREE from 'three'
import { PARAMETERS } from './config'
import Layout from './lib/Layout'

import Table from './lib/Table'
import { getPoints } from './utils'
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

// function test() {
//   const layout = new Layout(document.querySelector('#main-canvas') as HTMLCanvasElement)

//   // const r = PARAMETERS.middlePocketRadius
//   // const startAngle = Math.PI
//   // const endAngle = Math.PI / 2

//   // const scale = 10
//   // const l = Math.ceil(scale * Math.abs(endAngle - startAngle) * r / 0.1)

//   // const points = getPoints(0, 0, r, startAngle, endAngle, true, l)

//   // const material = [
//   //   new THREE.MeshBasicMaterial({ color: 'orange' }),
//   //   new THREE.MeshBasicMaterial({ color: 'orange' }),
//   //   new THREE.MeshBasicMaterial({ color: 'green' }),
//   //   new THREE.MeshBasicMaterial({ color: 'orange' }),
//   //   new THREE.MeshBasicMaterial({ color: 'green' }),
//   //   new THREE.MeshBasicMaterial({ color: 'orange' }),
//   // ]

//   // const moveY = 0

//   // points.forEach((point, index) => {
//   //   const height = PARAMETERS.ballRadius * ((l - index) / l)
//   //   const side = new THREE.Mesh(
//   //     new THREE.BoxGeometry(
//   //       (PARAMETERS.tableWidth / 2 - 2 * r), height, 0.1),
//   //     material,
//   //   )
//   //   side.position.set(0, 4 - height / 2, point.y + moveY)
//   //   layout.addObject(side)
//   // })

//   {
//     // 包边(上左)
//     const leftR = PARAMETERS.cornerPocketRadius
//     const rightR = PARAMETERS.middlePocketRadius

//     const maxR = Math.max(leftR, rightR)

//     const width = PARAMETERS.tableWidth / 4
//     const height = PARAMETERS.tableThickness
//     const thickness = 0.1

//     const arcLength = Math.PI / 2 * maxR
//     const scale = 10
//     const length = Math.ceil(scale * arcLength / thickness)
//     console.log(arcLength, length)

//     for (let i = 0; i < length; i++) {
//       const angle = (Math.PI / 2) * i / length
//       const x = Math.cos(angle) * maxR
//       const y = Math.sin(angle) * maxR

//       const side = new THREE.Mesh(
//         new THREE.BoxGeometry(
//           width - Math.abs(x),
//           height,
//           thickness,
//         ),
//         new THREE.MeshBasicMaterial({ color: 'orange' }),
//       )
//       side.position.set(0 + Math.abs(x) / 2, 4, -y)
//       layout.addObject(side)
//     }
//   }

//   {
//     // 定位平面
//     const plane = new THREE.Mesh(
//       new THREE.PlaneGeometry(PARAMETERS.tableWidth, PARAMETERS.tableHeight),
//       new THREE.MeshBasicMaterial({ color: 'lightblue' }),
//     )
//     plane.position.set(0, 1, 0)
//     plane.rotation.x = THREE.MathUtils.degToRad(-90)
//     layout.addObject(plane)
//   }

//   layout.render()
// }

// test()
