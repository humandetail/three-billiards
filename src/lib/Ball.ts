import type Layout from './Layout'
import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { PARAMETERS } from '../config'

export default class Ball {
  public tableTop = PARAMETERS.offGroundHeight + PARAMETERS.tableThickness

  mainBall!: THREE.Mesh
  mainBallBody!: CANNON.Body

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

  ballMaterial = new CANNON.Material('ball')

  constructor(public layout: Layout) {
    this.init()
  }

  init() {
    this.makeBall(-PARAMETERS.withWoodWidth / 4, 0, 0)
    this.initialPositions.forEach((pos, index) => {
      this.makeBall(pos.x + PARAMETERS.tableWidth / 4, pos.z, index + 1)
    })

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

    ball.castShadow = true
    ball.receiveShadow = true

    this.layout.scene.add(ball)
    this.layout.balls.push(ball)

    const ballBody = new CANNON.Body({
      mass: 1.65, // kg，0.165kg，因为整体放大了十倍，所以这里的质量也放大
      position: new CANNON.Vec3(ball.position.x, ball.position.y, ball.position.z),
      shape: new CANNON.Sphere(ballRadius),
      linearDamping: 0.3, // 模拟空气阻力+桌面摩擦
      angularDamping: 0.5, // 模拟旋转衰减
    })
    ballBody.velocity.set(0, 0, 0)
    ballBody.angularVelocity.set(0, 0, 0)

    ballBody.material = this.layout.ballMaterial

    this.layout.world.addBody(ballBody)
    this.layout.ballBodies.push(ballBody)

    if (name === 0) {
      this.mainBall = ball
      this.mainBallBody = ballBody
    }

    return ball
  }
}
