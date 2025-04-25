import * as Cannon from 'cannon'
import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'

interface DashConfig {
  maxChargeTime: number
  minDashSpeed: number
  maxDashSpeed: number
  dashDuration: number
  cooldown: number
  moveSpeedBase: number
}

type DashState = 'idle' | 'charging' | 'dashing' | 'cooldown'

export class DashSystem {
  config: DashConfig = {
    maxChargeTime: 2000,
    minDashSpeed: 10,
    maxDashSpeed: 100,
    dashDuration: 500,
    cooldown: 800,
    moveSpeedBase: 0.1,
  }

  state: DashState = 'idle'
  chargeStartTime = 0
  dashStartTime = 0
  currentSpeed = 0
  dashDirection = new THREE.Vector3()

  constructor(public controls: PointerLockControls, options: Partial<DashConfig> = {}) {
    this.config = Object.assign({}, this.config, options)
  }

  startCharging() {
    if (this.state !== 'idle')
      return

    this.state = 'charging'
    this.chargeStartTime = Date.now()
  }

  updateCharging() {
    if (this.state !== 'charging') {
      return
    }

    const chargeTime = Date.now() - this.chargeStartTime
    const chargeRatio = Math.min(chargeTime / this.config.maxChargeTime, 1.0)
    console.log('蓄力中', `${chargeRatio * 100}%`)

    this.controls.moveForward(-0.05)

    // // 更新蓄力特效
    // this.chargeRing.scale.set(1 + chargeRatio * 0.5, 1 + chargeRatio * 0.5, 1)
    // this.chargeRing.material.opacity = 0.7 * (1 - chargeRatio * 0.5)
    // this.chargeRing.material.color.setHSL(0.5 + chargeRatio * 0.3, 1, 0.5)
  }

  executeDash() {
    if (this.state !== 'charging')
      return

    const chargeTime = Date.now() - this.chargeStartTime
    const chargeRatio = Math.min(chargeTime / this.config.maxChargeTime, 1.0)

    this.currentSpeed = this.config.minDashSpeed
      + (this.config.maxDashSpeed - this.config.minDashSpeed) * chargeRatio

    // 获取相机前方方向
    this.dashDirection.set(0, 0, -1).applyQuaternion(this.controls.object.quaternion)
    this.state = 'dashing'
    this.dashStartTime = Date.now()
    // this.chargeRing.visible = false

    console.log(`冲刺! 力度: ${Math.round(chargeRatio * 100)}%`)
  }

  updateDashing() {
    if (this.state !== 'dashing') {
      return
    }
    const dashTime = Date.now() - this.dashStartTime
    const dashProgress = Math.min(dashTime / this.config.dashDuration, 1.0)

    // 二次缓出函数
    const speed = this.currentSpeed * (1 - dashProgress * dashProgress)
    this.controls.moveForward(speed * this.config.moveSpeedBase)
    if (dashProgress >= 1.0) {
      this.state = 'cooldown'
      setTimeout(() => {
        this.state = 'idle'
      }, this.config.cooldown)
    }
  }
}

export class CueSystem extends DashSystem {
  camera: THREE.PerspectiveCamera
  controls: PointerLockControls

  mesh!: THREE.Mesh
  body!: Cannon.Body

  moveSpeed = 0.1
  moveDirection = {
    up: false,
    right: false,
    down: false,
    left: false,
    forward: false,
    backward: false,
  }

  // dashSystem: DashSystem

  constructor(
    public renderer: THREE.WebGLRenderer,
    public scene: THREE.Scene,
    public world: Cannon.World,
    opts: Partial<DashConfig> = {},
  ) {
    const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000)
    camera.position.set(0, 26, 50)

    scene.add(camera)

    const controls = new PointerLockControls(camera, renderer.domElement)

    super(controls, opts)

    this.camera = camera
    this.controls = controls

    this.init()
    this.initEvents()
  }

  init() {
    // 画个杆
    const cueRadius = 0.3
    const cueLength = 30
    const cueGeometry = new THREE.CylinderGeometry(cueRadius, cueRadius, cueLength, 32)
    const cueMaterial = new THREE.MeshBasicMaterial({ color: 'brown' })
    const cue = new THREE.Mesh(cueGeometry, cueMaterial)
    cue.castShadow = true

    cue.position.set(2, -10, -10)
    cue.rotateX(Math.PI / 2)
    this.scene.add(cue)
    this.camera.add(cue)

    const cueBody = new Cannon.Body({
      mass: 0,
    })
    const boxShape = new Cannon.Box(new Cannon.Vec3(cueRadius, cueLength / 2 - cueRadius, cueRadius))
    const sphereShape = new Cannon.Sphere(cueRadius)
    cueBody.addShape(boxShape, new Cannon.Vec3(0, cueRadius, 0))
    cueBody.addShape(sphereShape, new Cannon.Vec3(0, -cueLength / 2 + cueRadius, 0))
    cueBody.position.set(2, -10, -10)
    cueBody.quaternion.setFromAxisAngle(new Cannon.Vec3(1, 0, 0), Math.PI / 2)
    this.world.addBody(cueBody)

    this.mesh = cue
    this.body = cueBody
  }

  initEvents() {
    // 点击锁定指针
    document.addEventListener('click', () => {
      this.controls.lock()
    })

    const {
      controls,
      moveDirection,
      world,
      body,
    } = this

    document.addEventListener('keydown', (e) => {
      if (!controls.isLocked) {
        return
      }
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          if (!e.shiftKey) {
            moveDirection.forward = true
          }
          else {
            moveDirection.up = true
          }
          break
        case 'KeyS':
        case 'ArrowDown':
          if (!e.shiftKey) {
            moveDirection.backward = true
          }
          else {
            moveDirection.down = true
          }
          break
        case 'KeyA':
        case 'ArrowLeft':
          moveDirection.left = true
          break
        case 'KeyD':
        case 'ArrowRight':
          moveDirection.right = true
          break
        case 'Space':
          this.startCharging()
          break
        default:
          break
      }
    })

    document.addEventListener('keyup', (e) => {
      if (!controls.isLocked) {
        return
      }
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveDirection.forward = false
          moveDirection.up = false
          break
        case 'KeyS':
        case 'ArrowDown':
          moveDirection.backward = false
          moveDirection.down = false
          break
        case 'KeyA':
        case 'ArrowLeft':
          moveDirection.left = false
          break
        case 'KeyD':
        case 'ArrowRight':
          moveDirection.right = false
          break
        case 'Space':
          if (this.state === 'charging') {
            this.executeDash()
          }
          break
        default:
          break
      }
    })

    body.addEventListener('collide', (event: any) => {
      // const { body, target } = event; // body是当前物体，target是碰撞的另一个物体

      // console.log(`${body} 碰撞了 ${target}`);

      // 获取碰撞冲击力
      const impactStrength = event.contact.getImpactVelocityAlongNormal()
      console.log('碰撞强度:', impactStrength)
      setTimeout(() => {
        world.remove(body)
        this.state = 'idle'
      })
    })
  }

  sync() {
    const { body, mesh } = this
    body.position.copy(mesh.getWorldPosition(new THREE.Vector3()) as any)
    body.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()) as any)
  }

  update() {
    const { controls, moveDirection, moveSpeed } = this

    this.sync()
    if (this.state === 'charging') {
      this.updateCharging()
    }
    else if (this.state === 'dashing') {
      this.updateDashing()
    }

    // 键盘移动控制
    if (controls.isLocked) {
      if (this.state === 'idle') {
        if (moveDirection.forward)
          controls.moveForward(moveSpeed)
        if (moveDirection.backward)
          controls.moveForward(-moveSpeed)
      }

      if (moveDirection.left)
        controls.moveRight(-moveSpeed)
      if (moveDirection.right)
        controls.moveRight(moveSpeed)
      if (moveDirection.up)
        controls.object.position.y += moveSpeed
      if (moveDirection.down)
        controls.object.position.y -= moveSpeed
    }
  }
}
