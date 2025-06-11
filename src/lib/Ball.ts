import type { ExtendedMesh } from 'enable3d'
import type MainScene from '../central-control/MainScene'
import * as THREE from 'three'
import config from '../config'
import { getTexturePath } from '../utils'

export default class Ball {
  private tableTop = config.table.leg.height + config.table.height
  private ballRadius = config.ball.radius

  mainBall!: ExtendedMesh

  /**
   * 开局摆球位置
   * 15颗目标球呈三角形排列，最前端的球放在置球点上，
   * 8号球必须位于第三排中央位置（如图）。
   * 两底角必须分别是一颗全色球和一颗花色球，
   * 这是为了确保开球后双方都有机会选择自己的球组。
   *
   *          1
   *       2    9
   *     10   8   3
   *    4  11   5  12
   *   13 14  6  15  7
   */
  initialPositions: Array<{ x: number, z: number }> = [
    { x: 0, z: 0 }, // 1 排 0 【1】
    { x: this.ballRadius * Math.sqrt(3), z: -this.ballRadius }, // 2 排 -1 【2】
    { x: this.ballRadius * 2 * Math.sqrt(3), z: this.ballRadius * 2 }, // 3 排 1 【3】
    { x: this.ballRadius * 3 * Math.sqrt(3), z: -this.ballRadius * 3 }, // 4 排 -2 【4】
    { x: this.ballRadius * 3 * Math.sqrt(3), z: this.ballRadius }, // 4 排 1 【5】
    { x: this.ballRadius * 4 * Math.sqrt(3), z: 0 }, // 5 排 0 【6】
    { x: this.ballRadius * 4 * Math.sqrt(3), z: this.ballRadius * 4 }, // 5 排 2 【7】
    { x: this.ballRadius * 2 * Math.sqrt(3), z: 0 }, // 3 排 0 【8】
    { x: this.ballRadius * Math.sqrt(3), z: this.ballRadius }, // 2 排 1 【9】
    { x: this.ballRadius * 2 * Math.sqrt(3), z: -this.ballRadius * 2 }, // 3 排 -1 【10】
    { x: this.ballRadius * 3 * Math.sqrt(3), z: -this.ballRadius }, // 4 排 -1 【11】
    { x: this.ballRadius * 3 * Math.sqrt(3), z: this.ballRadius * 3 }, // 4 排 2 【12】
    // r * √3（等边三角形高度）
    { x: this.ballRadius * 4 * Math.sqrt(3), z: -this.ballRadius * 4 }, // 5 排 -2 【13】
    { x: this.ballRadius * 4 * Math.sqrt(3), z: -this.ballRadius * 2 }, // 5 排 -1 【14】
    { x: this.ballRadius * 4 * Math.sqrt(3), z: this.ballRadius * 2 }, // 5 排 1 【15】
  ]

  constructor(public mainScene: MainScene) {}

  init() {
    this.makeBall(-config.table.width / 4, 0, 0)
    // this.makeBall(-config.table.width / 2 + this.ballRadius * 2, config.table.depth / 2 - this.ballRadius * 2, 0)
    this.initialPositions.forEach((pos, index) => {
      this.makeBall(pos.x + config.table.width / 4, pos.z, index + 1)
    })
  }

  makeBall(x: number, z: number, name = 0) {
    const { ballRadius } = this
    const loader = new THREE.TextureLoader()
    const texture = loader.load(getTexturePath(`balls/${name}.jpg`))
    // const mainBallTexture = loader.load('/textures/balls/sprite.png')

    const ball = this.mainScene.add.sphere(
      {
        x,
        y: this.tableTop + ballRadius,
        z,
        radius: ballRadius,
        widthSegments: 128,
        heightSegments: 128,
      },
      {
        physical: {
          map: texture,
          clearcoat: 0.92,
          clearcoatRoughness: 0.35,
        },
        // phong: name !== 0
        //   ? {
        //       map: texture,
        //       specular: 0x111111,
        //       shininess: 30,
        //     }
        //   : {
        //       color: 0xFFFFFF,
        //       // map: mainBallTexture,
        //       specular: 0x111111,
        //       shininess: 30,
        //     },
      },
    )

    ball.castShadow = true
    ball.receiveShadow = true

    this.mainScene.add.existing(ball)
    this.mainScene.physics.add.existing(
      ball,
      {
        shape: 'sphere',
        radius: ballRadius,
        mass: 0.165,
      },
    )

    ball.body.setFriction(config.material.ball.friction)
    ball.body.setRestitution(config.material.ball.restitution)
    ball.body.setDamping(config.material.ball.damping.linear, config.material.ball.damping.angular) // 线性/角速度缓慢衰减（空气+桌面阻力）
    ball.body.setCcdMotionThreshold(config.material.ball.ccdThreshold)
    ball.body.setCcdSweptSphereRadius(ballRadius * config.material.ball.ccdSweptSphereRadiusScale)
    ball.body.ammo.setRollingFriction(config.material.ball.friction)

    ball.body.checkCollisions = true
    // ball.body.setCollisionFlags(2)

    ball.castShadow = true
    ball.receiveShadow = true

    ball.name = `ball-${name}`

    this.mainScene.setBall(ball)

    if (name === 0) {
      this.mainBall = ball
    }

    return ball
  }
}
