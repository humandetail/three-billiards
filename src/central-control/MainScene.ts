import type { ExtendedMesh } from 'enable3d'
import type CueSystem from '../lib/CueSystem'
import { Scene3D, THREE } from 'enable3d'
import throttle from 'lodash.throttle'
import config from '../config'
import context, { addBallToPocket, BilliardsStatus, setContext } from './Context'

export default class MainScene extends Scene3D {
  cueSystem?: CueSystem

  mainBall?: ExtendedMesh
  balls: ExtendedMesh[] = []
  cushions: ExtendedMesh[] = []
  pockets: ExtendedMesh[] = []

  ballY = config.table.leg.height + config.table.height + config.ball.radius
  mainBallInitialPosition = { x: -config.table.width / 4, z: 0 }

  needUpdateNames = new Set<string>()

  async create() {
    await this.warpSpeed()

    this.camera.position.set(-2, 4, 0) // 从y轴直接看向000
    this.camera.lookAt(0, 0, 0)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    // 在场景初始化时启用阴影
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.setupLights()

    // const hiddenNames = ['pocket', 'cushion', 'table'/** , 'ball' */]

    // this.scene.children.forEach((child) => {
    //   if (hiddenNames.some(name => child.name.startsWith(name))) {
    //     child.visible = false
    //   }
    // })
    // // 展示物理体
    // if (this.physics.debug) {
    //   this.physics.debug.enable()
    // }
  }

  get checkableBalls() {
    return this.balls.filter(ball => !(ball as any).inPocket)
  }

  setupLights() {
    const { scene, lights } = this
    // 1. 主光源 - 台球桌上方吊灯（聚光灯）
    const spotLight = lights.spotLight({
      color: 0xFFEE88,
      intensity: 1.2,
      distance: 0,
      angle: Math.PI / 4,
      penumbra: 0.3,
      decay: 0.8,
    })
    spotLight.position.set(0, 8, 0)
    spotLight.castShadow = true
    spotLight.shadow.mapSize.width = 2048
    spotLight.shadow.mapSize.height = 2048

    // 聚光灯目标指向台球桌中心
    const spotTarget = new THREE.Object3D()
    spotTarget.position.set(0, 0, 0)
    scene.add(spotTarget)
    spotLight.target = spotTarget

    // 2. 辅助光源 - 环境光（避免纯黑阴影）
    const ambientLight = lights.ambientLight({ color: 0x333355, intensity: 0.3 })
    scene.add(ambientLight)

    // 3. 边缘补光 - 方向光（模拟环境反射）
    const fillLight = lights.directionalLight({ color: 0x5577FF, intensity: 0.15 })
    fillLight.position.set(5, 5, 5)
    scene.add(fillLight)

    // 4. 台球桌下方反射光（增强立体感）
    const bounceLight = lights.rectAreaLight({ color: 0x4466AA, intensity: 0.1, width: 10, height: 10 })
    bounceLight.position.set(0, 0.2, 0)
    bounceLight.rotation.x = Math.PI // 光线向上照射
    scene.add(bounceLight)

    // 5. 台球特殊高光（增强球体质感）
    const ballHighlight = lights.pointLight({ color: 0xFFFFFF, intensity: 0.5, distance: 4 })
    ballHighlight.position.set(0, 3, 0)
    scene.add(ballHighlight)
  }

  init() {
    this.#initPocketEvents()
    this.#initCushionEvents()
  }

  #initPocketEvents() {
    this.pockets.forEach((pocket) => {
      this.balls.forEach((ball) => {
        this.physics.add.collider(ball, pocket, (type) => {
          if (type === 'start') {
            // eslint-disable-next-line no-console
            console.log(ball.name, '入袋', pocket.name, pocket)
            // 强制入袋
            this.setBallPosition(ball, { x: pocket.position.x, y: pocket.position.y - config.ball.radius * 2, z: pocket.position.z })
            // ball.body.setVelocity(0, -1, 0)

            ;(ball as any).inPocket = true
            addBallToPocket(ball)

            // @todo - 检测入球是否为已方球
          }
        })
      })
      // 主球入袋
      if (this.mainBall) {
        this.physics.add.collider(pocket, this.mainBall, (type) => {
          if (type === 'start') {
            // this.mainBall!.body.setVelocity(0, -1, 0)
            // console.log('主球入袋')
            this.setBallPosition(this.mainBall!, { x: pocket.position.x, y: pocket.position.y - config.ball.radius * 2, z: pocket.position.z })
            // this.mainBall!.body.setVelocity(0, -1, 0)
            // @todo - 进入移球状态
            // setContext('status', BilliardsStatus.Moving)

            addBallToPocket(this.mainBall!)

            // setTimeout(() => {
            //   this.setBallPosition(this.mainBall!, this.mainBallInitialPosition)
            // }, 0)
          }
        })
      }
    })
  }

  #initCushionEvents() {
    this.physics.collisionEvents.on('collision', ({ bodies }: { bodies: ExtendedMesh[] }) => {
      if ((bodies[0].name.startsWith('ball') && bodies[1].name.startsWith('cushion')) || (bodies[0].name.startsWith('cushion') && bodies[1].name.startsWith('ball'))) {
        // console.log(bodies[0].name, '撞到', bodies[1].name)
      }
    })
  }

  checkValidPosition(x: number, z: number) {
    return this.checkableBalls.every((ball) => {
      const { x: ballX, z: ballZ } = ball.body.position
      const distance = Math.sqrt((x - ballX) ** 2 + (z - ballZ) ** 2)
      return distance >= config.ball.radius * 2
    })
  }

  setBallPosition(ball: ExtendedMesh, { x, y, z }: { x: number, y?: number, z: number }) {
    ball.body.setVelocity(0, 0, 0)
    ball.body.setAngularVelocity(0, 0, 0)
    ball.position.set(x, y ?? this.ballY, z)
    ball.body.setCollisionFlags(2)
    ball.body.needUpdate = true
    setTimeout(() => {
      this.needUpdateNames.add(ball.name)
    }, 40)
  }

  setBall(ball: ExtendedMesh) {
    if (ball.name === 'ball-0') {
      this.mainBall = ball
    }
    else {
      this.balls.push(ball)
    }
  }

  setBalls(balls: ExtendedMesh[]) {
    this.balls = balls
  }

  setCushion(cushion: ExtendedMesh) {
    this.cushions.push(cushion)
  }

  setCushions(cushions: ExtendedMesh[]) {
    this.cushions = cushions
  }

  setPocket(pocket: ExtendedMesh) {
    this.pockets.push(pocket)
  }

  setPockets(pockets: ExtendedMesh[]) {
    this.pockets = pockets
  }

  setCueSystem(cueSystem: CueSystem) {
    this.cueSystem = cueSystem
  }

  #checkBallsStatic = throttle(() => {
    const balls = [this.mainBall!, ...this.checkableBalls]
    const { speedThreshold, angularSpeedThreshold } = context
    const isAllStatic = balls.every((ball) => {
      const velocity = ball.body.velocity
      const angularVelocity = ball.body.angularVelocity
      const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2)
      const angularSpeed = Math.sqrt(angularVelocity.x ** 2 + angularVelocity.y ** 2 + angularVelocity.z ** 2)
      return speed <= speedThreshold && angularSpeed <= angularSpeedThreshold
    })
    if (isAllStatic) {
      balls.forEach((ball) => {
        ball.body.setVelocity(0, 0, 0)
        ball.body.setAngularVelocity(0, 0, 0)
      })
      setContext('status', BilliardsStatus.Idle)
    }
  }, context.checkStaticInterval)

  update(time: number, delta: number) {
    super.update(time, delta)

    ;[...this.balls, this.mainBall!].forEach((ball) => {
      if (this.needUpdateNames.has(ball.name)) {
        ball.body.setCollisionFlags(0)
        ball.body.setVelocity(0, 0, 0)
        ball.body.setAngularVelocity(0, 0, 0)
        ball.body.needUpdate = true
        if (ball.name === this.mainBall!.name && context.status === BilliardsStatus.Idle) {
          this.cueSystem?.update()
        }
      }
    })
    this.needUpdateNames.clear()

    // 检测球是否都静止了
    // 不需要每帧检测，只需要在每次击球后检测
    if (context.status === BilliardsStatus.ShotCompleted) {
      this.#checkBallsStatic()
    }

    if (this.cueSystem) {
      this.cueSystem.update()
    }
  }
}

// export default class MainScene extends Scene3D {
//   ball0!: ExtendedMesh

//   async create() {
//     await this.warpSpeed()
//     this.renderer.setPixelRatio(window.devicePixelRatio)
//     this.camera.position.set(-1, 4, 0) // 从y轴直接看向000
//     this.camera.lookAt(0, 0, 0)

//     // 展示物理体
//     if (this.physics.debug) {
//       this.physics.debug.enable()
//     }

//     const board = this.add.box({
//       width: 2.75,
//       depth: 1.27,
//       height: 0.2,
//       x: 0,
//       y: 0.1,
//       z: 0,
//       mass: 0,
//     })
//     this.physics.add.existing(board)

//     board.body.setFriction(config.material.cloth.friction)
//     board.body.setRestitution(config.material.cloth.restitution)
//     board.body.setCcdMotionThreshold(config.material.ball.ccdThreshold)
//     board.body.setCcdSweptSphereRadius(config.ball.radius * config.material.ball.ccdSweptSphereRadiusScale)

//     board.body.ammo.setRollingFriction(config.material.cloth.friction)

//     const createWall = (x: number, z: number, w: number, d: number) => {
//       const wall = this.add.box({
//         width: w,
//         depth: d,
//         height: 0.3,
//         x, y: 0.15, z,
//         mass: 0
//       })
//       this.physics.add.existing(wall)
//       // wall.body.setCollisionFlags(1)
//     }

//     const halfW = 2.75 / 2, halfD = 1.27 / 2
//     createWall(0, halfD + 0.025, 2.75, 0.05) // 前
//     createWall(0, -halfD - 0.025, 2.75, 0.05) // 后
//     createWall(halfW + 0.025, 0, 0.05, 1.27) // 右
//     createWall(-halfW - 0.025, 0, 0.05, 1.27) // 左

//     const ball0 = this.add.sphere({
//       radius: config.ball.radius,
//       y: config.ball.radius + 0.2,
//       x: -1,
//       mass: 0.176
//     },
//     {
//       phong: {
//         color: 'red',
//       }
//     })
//     this.physics.add.existing(ball0, {
//       shape: 'sphere',
//       mass: 0.176,
//       radius: config.ball.radius,
//     })

//     ball0.body.setCcdMotionThreshold(config.material.ball.ccdThreshold)
//     ball0.body.setCcdSweptSphereRadius(config.ball.radius * config.material.ball.ccdSweptSphereRadiusScale)

//     ball0.body.setDamping(config.material.ball.damping.linear, config.material.ball.damping.angular)
//     ball0.body.setFriction(config.material.ball.friction)
//     ball0.body.setRestitution(config.material.ball.restitution)

//     ball0.body.ammo.setRollingFriction(config.material.ball.friction)

//     this.ball0 = ball0
//     const ball1 = this.add.sphere({
//       radius: config.ball.radius,
//       y: config.ball.radius + 0.2,
//       x: config.ball.radius * 4,
//       mass: 0.176
//     },
//      {
//       phong: {
//         color: 'green',
//       }
//     })
//     this.physics.add.existing(ball1)

//     ball1.body.setCcdMotionThreshold(config.material.ball.ccdThreshold)
//     ball1.body.setCcdSweptSphereRadius(config.ball.radius * config.material.ball.ccdSweptSphereRadiusScale)

//     ball1.body.setDamping(config.material.ball.damping.linear, config.material.ball.damping.angular)
//     ball1.body.setFriction(config.material.ball.friction)
//     ball1.body.setRestitution(config.material.ball.restitution)

//     ball1.body.ammo.setRollingFriction(config.material.ball.friction)

//     /**
//  * 模拟台球击球
//  * @param ball  球体刚体
//  * @param strikePoint THREE.Vector3 击球的世界坐标点
//  * @param forceMagnitude 数值，击球冲量大小
//  */
// function strikeBall(ball: any, strikePoint: THREE.Vector3, forceMagnitude: number) {
//   // 球心世界坐标
//   const ballPosition = ball.position.clone()

//   // 计算击球点相对球心的向量（相对位置）
//   const relativePosition = strikePoint.clone().sub(ballPosition)

//   // 击球方向向量：从击球点指向球心的反方向
//   // 一般击球方向是“从击球点朝向球心的反方向”，你可以根据需求调整
//   const impulseDirection = relativePosition.clone().normalize()

//   // 冲量向量 = 冲量大小 * 方向
//   const impulse = impulseDirection.multiplyScalar(forceMagnitude)

//   // 施加冲量
//   ball.body.applyImpulse(impulse, relativePosition)
// }
//   strikeBall(ball0, new THREE.Vector3(0, 0, config.ball.radius * 2 / 3), 0.5)
//     // ball0.body.applyImpulse(new THREE.Vector3(0.4, 0, 0), { x: 0, y: config.ball.radius, z: config.ball.radius * 2/ 3 })
//   }

//   update(time: number, delta: number) {
//     super.update(time, delta)
//     const { velocity, angularVelocity } = this.ball0.body
//     const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2)
//     const angularSpeed = Math.sqrt(angularVelocity.x ** 2 + angularVelocity.y ** 2 + angularVelocity.z ** 2)
//   }
// }
