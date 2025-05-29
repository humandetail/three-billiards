import type { ExtendedMesh } from 'enable3d'
import type CueSystem from '../lib/CueSystem'
import { Scene3D } from 'enable3d'
import throttle from 'lodash.throttle'
import config from '../config'
import context, { BilliardsStatus, setContext } from './Context'

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

    const hiddenNames = ['pocket', 'cushion', 'table', 'ball']

    this.scene.children.forEach((child) => {
      if (hiddenNames.some(name => child.name.startsWith(name))) {
        child.visible = false
      }
    })
    // 展示物理体
    if (this.physics.debug) {
      this.physics.debug.enable()
    }
  }

  get checkableBalls() {
    return this.balls.filter(ball => !(ball as any).inPocket)
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
            this.setBallPosition(ball, { x: pocket.body.position.x, y: pocket.body.position.y, z: pocket.body.position.z })
            ball.body.setVelocity(0, -1, 0)

            ;(ball as any).inPocket = true
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
            this.setBallPosition(this.mainBall!, { x: pocket.body.position.x, y: pocket.body.position.y, z: pocket.body.position.z })
            this.mainBall!.body.setVelocity(0, -1, 0)
            // @todo - 进入移球状态
            // setContext('status', BilliardsStatus.Moving)

            setTimeout(() => {
              this.setBallPosition(this.mainBall!, this.mainBallInitialPosition)
            }, 0)
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
