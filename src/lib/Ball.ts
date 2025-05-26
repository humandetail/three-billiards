import type Layout from './Layout'
import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { getConfig, PARAMETERS } from '../config'

export default class Ball {
  public tableTop = 0
  config = getConfig()

  mainBall!: THREE.Mesh
  mainBallBody!: CANNON.Body

  get ballRadius() {
    return this.config.ball.radius
  }

  initialPositions = [
    { x: 0, z: 0 },

    // r * √3（等边三角形高度）
    { x: this.ballRadius * 4 * Math.sqrt(3), z: -this.ballRadius * 4 },
    { x: this.ballRadius * 4 * Math.sqrt(3), z: this.ballRadius * 4 },

    { x: this.ballRadius * 2 * Math.sqrt(3), z: -this.ballRadius * 2 }, // 4
    { x: this.ballRadius * 3 * Math.sqrt(3), z: -this.ballRadius }, // 8
    { x: this.ballRadius * 2 * Math.sqrt(3), z: this.ballRadius * 2 },

    { x: this.ballRadius * 3 * Math.sqrt(3), z: -this.ballRadius * 3 },
    { x: this.ballRadius * 2 * Math.sqrt(3), z: 0 },
    { x: this.ballRadius * 3 * Math.sqrt(3), z: this.ballRadius },
    { x: this.ballRadius * 3 * Math.sqrt(3), z: this.ballRadius * 3 },

    { x: this.ballRadius * Math.sqrt(3), z: -this.ballRadius }, // 2
    { x: this.ballRadius * 4 * Math.sqrt(3), z: -this.ballRadius * 2 },
    { x: this.ballRadius * 4 * Math.sqrt(3), z: 0 },
    { x: this.ballRadius * 4 * Math.sqrt(3), z: this.ballRadius * 2 },
    { x: this.ballRadius * Math.sqrt(3), z: this.ballRadius }, // 3
  ]

  ballMaterial = new CANNON.Material('ball')

  constructor(public layout: Layout) {}

  init() {
    this.makeBall(-this.config.table.width / 4, 0, 0)
    this.initialPositions.forEach((pos, index) => {
      this.makeBall(pos.x + this.config.table.width / 4, pos.z, index + 1)
    })
  }

  makeBall(x: number, z: number, name = 0) {
    const ballRadius = this.ballRadius
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
      mass: 0.165, // kg
      position: new CANNON.Vec3(ball.position.x, ball.position.y, ball.position.z),
      shape: new CANNON.Sphere(ballRadius),
      linearDamping: 0.2, // 模拟空气阻力+桌面摩擦
      angularDamping: 0.15, // 模拟旋转衰减
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
