import * as CANNON from 'cannon'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { getTexturePath } from '../utils'

export default class Layout {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls!: OrbitControls

  world!: CANNON.World

  showHelper = true
  helpers: (THREE.PointLightHelper | any)[] = []

  renderRequested = false

  constructor(protected canvas: HTMLCanvasElement) {
    const rect = this.canvas.getBoundingClientRect()
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(75, rect.width / rect.height, 0.1, 1000)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    })
    this.camera.position.set(-20, 20, 0)
    this.camera.lookAt(0, 0, 0)

    this.renderer.setClearColor(0xFFFFFF)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    this.init()

    this.requestRenderIfNotRequested()
  }

  init() {
    this.initWorld()

    this.initObserver()
    this.initLight()
    this.initControls()
    this.initGround()

    this.initEvents()

    if (this.showHelper) {
      this.scene.add(...this.helpers)

      this.scene.add(new THREE.AxesHelper(10))
      this.scene.add(new THREE.GridHelper(this.renderer.domElement.width, this.renderer.domElement.height))
    }
  }

  initWorld() {
    const world = new CANNON.World()
    // 设置重力
    world.gravity.set(0, -9.82, 0)

    this.world = world
  }

  initEvents() {
    this.controls.addEventListener('change', () => {
      this.requestRenderIfNotRequested()
    })
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
    const light = new THREE.PointLight(0xFFFFFF, 100)
    light.position.set(0, 15, 0)

    light.castShadow = true

    this.scene.add(light)

    this.helpers.push(new THREE.PointLightHelper(light))

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5)
    this.scene.add(ambientLight)
  }

  initGround() {
    const texture = new THREE.TextureLoader().load(getTexturePath('ground.jpg'))
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 2)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      // new THREE.MeshPhongMaterial({
      //   map: texture,
      // }),
      new THREE.MeshBasicMaterial({
        color: 'gray',
      }),
    )
    ground.rotation.x = THREE.MathUtils.degToRad(-90)

    ground.receiveShadow = true

    this.scene.add(ground)
  }

  addObject(object: THREE.Object3D) {
    this.scene.add(object)
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.maxDistance = 28
    this.controls.minDistance = 1
  }

  render() {
    this.renderRequested = false
    this.renderer.render(this.scene, this.camera)
  }

  requestRenderIfNotRequested() {
    if (!this.renderRequested) {
      this.renderRequested = true
      requestAnimationFrame(this.render.bind(this))
    }
  }

  handleResize(width: number, height: number) {
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }
}
