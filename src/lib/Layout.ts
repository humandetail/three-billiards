import type CueSystem from './CueSystem'
import * as CANNON from 'cannon-es'
import CannonDebugger from 'cannon-es-debugger'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { BilliardsStatus, context, emitter, EventTypes, setContext } from '../central-control'
import config from '../config'
import { getTexturePath } from '../utils'

export default class Layout {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls!: OrbitControls

  world!: CANNON.World
  cannonDebugger!: any

  showHelper = true
  helpers: (THREE.PointLightHelper | any)[] = []

  isCameraMoving = false

  #sceneObjects = new Map<string, THREE.Object3D>()

  balls: THREE.Object3D[] = []
  ballBodies: CANNON.Body[] = []
  ballMaterial = new CANNON.Material('ball')

  boxes: THREE.Object3D[] = []
  boxesBody: CANNON.Body[] = []

  tableMaterial = new CANNON.Material('table')
  rubberMaterial = new CANNON.Material('rubber')

  cueSystem: CueSystem | null = null

  // renderRequested = false
  // canCheckBody = false
  // bodyMoving = false

  velocityThreshold = 0.1 // 速度阈值（判断是否静止）

  constructor(protected canvas: HTMLCanvasElement) {
    const rect = this.canvas.getBoundingClientRect()
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(75, rect.width / rect.height, 0.1, 1000)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    })
    this.camera.position.set(0, 2, 0) // 从y轴直接看向000
    this.camera.lookAt(0, 0, 0)

    this.renderer.setClearColor(0xFFFFFF)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    this.init()

    this.render()
  }

  init() {
    this.initWorld()

    this.initObserver()
    this.initLight()
    this.initControls()
    // this.initGround()

    this.initEvents()

    if (this.showHelper) {
      this.scene.add(...this.helpers)

      this.scene.add(new THREE.AxesHelper(5))
      // this.scene.add(new THREE.GridHelper(10, this.renderer.domElement.height))
    }
  }

  initWorld() {
    const world = new CANNON.World()
    // 设置重力
    world.gravity.set(0, -9.82, 0)
    world.broadphase = new CANNON.NaiveBroadphase() // 使用默认碰撞检测

    // 设置摩擦系数和弹性系数
    const ballBallContact = new CANNON.ContactMaterial(this.ballMaterial, this.ballMaterial, {
      friction: 0.02, // 摩擦系数（0=无摩擦，1=完全摩擦）
      restitution: 0.95, // 弹性系数（0=完全非弹性，1=完全弹性）
    })

    const ballTableContact = new CANNON.ContactMaterial(this.ballMaterial, this.tableMaterial, {
      friction: config.material.cloth.friction, // 摩擦系数（0=无摩擦，1=完全摩擦）
      restitution: config.material.cloth.restitution, // 弹性系数（0=完全非弹性，1=完全弹性）
    })

    const ballRubberContact = new CANNON.ContactMaterial(this.ballMaterial, this.rubberMaterial, {
      friction: config.material.cushion.friction, // 摩擦系数（0=无摩擦，1=完全摩擦）
      restitution: config.material.cushion.restitution, // 弹性系数（0=完全非弹性，1=完全弹性）
    })

    world.addContactMaterial(ballBallContact)
    world.addContactMaterial(ballTableContact)
    world.addContactMaterial(ballRubberContact)

    this.world = world

    this.cannonDebugger = CannonDebugger(this.scene, this.world as any)
  }

  initEvents() {
    // this.controls.addEventListener('start', () => {
    //   this.isCameraMoving = true
    // })
    this.controls.addEventListener('change', () => {
      // this.isCameraMoving = true
      // this.renderRequested = true
      setContext('renderRequested', true)
      // this.requestRenderIfNotRequested()
      // setTimeout(() => {

      //   this.isCameraMoving = false
      // })
    })
    // this.controls.addEventListener('end', () => {
    //   setTimeout(() => {

    //     this.isCameraMoving = false
    //   })
    //   console.log('change-end')
    // })
    // this.world.addEventListener('postStep', () => {
    //   console.log('postStep')
    //   if (!this.canCheckBody || this.renderRequested) {
    //     return
    //   }
    //   this.requestRenderIfNotRequested()
    // })

    // emitter.on(EventTypes.cueStatus, status => {
    //   if (status === 'finished') {
    //     setTimeout(() => {
    //       this.canCheckBody = true
    //     })
    //     // this.requestRenderIfNotRequested()
    //   }
    // })
  }

  initObserver() {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry.target === this.canvas) {
        const { width, height } = entry.contentRect
        this.handleResize(width, height)
      }
    })
    observer.observe(this.canvas)
  }

  initLight() {
    const light = new THREE.PointLight(0xFFFFFF, 10)
    light.position.set(0, 3.8, 0)

    light.castShadow = true

    this.scene.add(light)

    this.helpers.push(new THREE.PointLightHelper(light))

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5)
    this.scene.add(ambientLight)
  }

  /**
   * 地板最顶面所在位置就是 y = 0
   */
  initGround() {
    const texture = new THREE.TextureLoader().load(getTexturePath('ground.jpg'))
    // texture.wrapS = THREE.RepeatWrapping
    // texture.wrapT = THREE.RepeatWrapping
    // texture.repeat.set(4, 2)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshBasicMaterial({
        map: texture,
        // color: 'gray',
      }),
    )
    ground.position.y = 0
    ground.rotation.x = THREE.MathUtils.degToRad(-90)

    ground.receiveShadow = true
    ground.castShadow = true

    this.scene.add(ground)

    // 创建 Cannon.js 的静态地板（质量 mass=0 表示静态）
    const floorShape = new CANNON.Plane()
    const floorBody = new CANNON.Body({
      mass: 0, // mass=0 表示静态物体（不受重力影响）
      shape: floorShape,
    })
    floorBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0), // 绕 x 轴旋转
      -Math.PI / 2, // 旋转 -90 度（让平面平铺）
    )
    floorBody.position.set(0, 0, 0) // 设置位置
    this.world.addBody(floorBody)
  }

  getSceneObject(name: string) {
    return this.#sceneObjects.get(name)
  }

  makeSceneObject(name: string, parent: THREE.Object3D = this.scene) {
    const object = new THREE.Object3D()
    this.#sceneObjects.set(name, object)
    parent.add(object)
    return object
  }

  addObject(name: 'root' | string, object: THREE.Object3D) {
    if (name === 'root') {
      this.scene.add(object)
    }
    else {
      if (!this.#sceneObjects.has(name)) {
        this.makeSceneObject(name)
      }
      this.#sceneObjects.get(name)!.add(object)
    }

    object.castShadow = true
    object.receiveShadow = true

    // this.boxes.push(object)
  }

  addCueSystem(cueSystem: CueSystem) {
    this.cueSystem = cueSystem
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.maxDistance = 50
    this.controls.minDistance = 0.001
  }

  syncPhysicsToGraphics() {
    this.balls.forEach((ball, index) => {
      const ballBody = this.ballBodies[index]
      // ball.position.set(
      //   Number.parseFloat(ballBody.position.x.toFixed(4)),
      //   Number.parseFloat(ballBody.position.y.toFixed(4)),
      //   Number.parseFloat(ballBody.position.z.toFixed(4)),
      // ) // 同步位置
      ball.position.copy(ballBody.position)

      ball.quaternion.copy(ballBody.quaternion) // 同步旋转
    })
  }

  render() {
    requestAnimationFrame(() => this.render())
    if (context.canCheckBody) {
      const isBodyMoving = this.isBodyMoving()
      if (!isBodyMoving) {
        // this.canCheckBody = false
        setContext('canCheckBody', false)
        setContext('status', BilliardsStatus.Idle)
        console.log('球运动完成')
        if (!this.isCameraMoving) {
          return
        }
      }
    }
    else if (!context.renderRequested) {
      return
    }

    // this.isCameraMoving = false
    setContext('renderRequested', false)
    // this.world.step(this.isCameraMoving ? 1 / 120 : 1 / 60) // 60fps
    this.world.step(1 / 60, 3)
    this.syncPhysicsToGraphics()
    // this.cannonDebugger.update()
    if (this.cueSystem) {
      this.cueSystem.update()
    }
    this.renderer.render(this.scene, this.camera)
  }

  isBodyMoving() {
    return this.world.bodies.some((body) => {
      // 仅检测动态物体
      return body.mass > 0 && (
        body.velocity.lengthSquared() > this.velocityThreshold ** 2
        || body.angularVelocity.lengthSquared() > this.velocityThreshold ** 2
      )
    })
  }

  handleResize(width: number, height: number) {
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    // 更新所有LineMaterial的分辨率
    this.scene.traverse((obj: any) => {
      if (obj.isLine2 && obj.material.isLineMaterial) {
        obj.material.resolution.set(width, height)
      }
    })
  }
}
