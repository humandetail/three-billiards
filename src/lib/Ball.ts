import type Layout from './Layout'
import Cannon from 'cannon'
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

  ballMaterial = new Cannon.Material('ball')

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

    ball.castShadow = true
    ball.receiveShadow = true

    this.layout.balls.push(ball)

    const ballBody = new Cannon.Body({
      mass: 1,
      position: new Cannon.Vec3(ball.position.x, ball.position.y, ball.position.z),
      shape: new Cannon.Sphere(ballRadius),
      linearDamping: 0.3, // 模拟空气阻力+桌面摩擦
      angularDamping: 0.5, // 模拟旋转衰减
    })
    ballBody.velocity.set(0, 0, 0)
    ballBody.angularVelocity.set(0, 0, 0)

    ballBody.material = this.layout.ballMaterial

    this.layout.world.addBody(ballBody)
    this.layout.ballsBody.push(ballBody)

    if (name === 0) {
      // 给白球一个初始速度
      ballBody.velocity.set(500, 0, 0)
    }

    return ball
  }
}
