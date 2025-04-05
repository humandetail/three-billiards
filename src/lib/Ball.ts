import type Layout from './Layout'
import * as THREE from 'three'
import { PARAMETERS } from '../config'

export default class Ball {
  public tableTop = PARAMETERS.offGroundHeight + PARAMETERS.tableThickness

  ballSceneObject!: THREE.Object3D

  initialPositions = [
    { x: 0, z: 0 },

    // r * √3（等边三角形高度）
    { x: PARAMETERS.ballRadius * 4 * Math.sqrt(3), z: -PARAMETERS.ballRadius * 4 },
    { x: PARAMETERS.ballRadius * 4 * Math.sqrt(3), z: PARAMETERS.ballRadius * 4 },

    { x: PARAMETERS.ballRadius * 2 * Math.sqrt(3), z: -PARAMETERS.ballRadius * 2 }, // 4
    { x: PARAMETERS.ballRadius * 3 * Math.sqrt(3), z: -PARAMETERS.ballRadius }, // 8
    { x: PARAMETERS.ballRadius * 2 * Math.sqrt(3), z: PARAMETERS.ballRadius * 2 },

    { x: PARAMETERS.ballRadius * 3 * Math.sqrt(3), z: -PARAMETERS.ballRadius * 3 },
    { x: PARAMETERS.ballRadius * 2 * Math.sqrt(3), z: 0 },
    { x: PARAMETERS.ballRadius * 3 * Math.sqrt(3), z: PARAMETERS.ballRadius },
    { x: PARAMETERS.ballRadius * 3 * Math.sqrt(3), z: PARAMETERS.ballRadius * 3 },

    { x: PARAMETERS.ballRadius * Math.sqrt(3), z: -PARAMETERS.ballRadius }, // 2
    { x: PARAMETERS.ballRadius * 4 * Math.sqrt(3), z: -PARAMETERS.ballRadius * 2 },
    { x: PARAMETERS.ballRadius * 4 * Math.sqrt(3), z: 0 },
    { x: PARAMETERS.ballRadius * 4 * Math.sqrt(3), z: PARAMETERS.ballRadius * 2 },
    { x: PARAMETERS.ballRadius * Math.sqrt(3), z: PARAMETERS.ballRadius }, // 3
  ]

  constructor(public layout: Layout) {
    this.ballSceneObject = this.layout.makeSceneObject('ball')
    this.init()
  }

  init() {
    const ballSceneObject = this.ballSceneObject
    this.initialPositions.forEach((pos, index) => {
      const ball = this.makeBall(pos.x + PARAMETERS.tableWidth / 4, pos.z, index + 1)
      ballSceneObject.add(ball)
    })

    ballSceneObject.add(this.makeBall(-PARAMETERS.withWoodWidth / 4, 0, 0))
  }

  makeBall(x: number, z: number, name = 0) {
    const ballRadius = PARAMETERS.ballRadius
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32)
    let material: THREE.MeshPhongMaterial
    if (name !== 0) {
      const loader = new THREE.TextureLoader()
      const texture = loader.load(`/textures/balls/${name}.jpg`)
      material = new THREE.MeshPhongMaterial({
        map: texture,
        specular: 0x111111,
        shininess: 30,
      })
    }
    else {
      material = new THREE.MeshPhongMaterial({
        color: 0xFFFFFF,
        specular: 0x111111,
        shininess: 30,
      })
    }

    const ball = new THREE.Mesh(ballGeometry, material)
    ball.name = `ball-${name}`
    ball.position.set(x, this.tableTop + ballRadius, z)
    return ball
  }
}
