import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'
import { resizeRendererToDisplaySize } from '../../utils'
import { createHollowRoundedBoxGeometry } from '../../utils/HollowRounedBox'

export type RegulatorDirection = 'horizontal' | 'vertical'

export default class RegulatorHelper {
  private parentEl!: HTMLElement
  canvas!: HTMLCanvasElement
  ctx!: CanvasRenderingContext2D

  private width = 0
  private height = 0

  private renderer!: THREE.WebGLRenderer
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private controls!: OrbitControls
  private directionalLight!: THREE.DirectionalLight
  private previousRotateAngle = 0

  private renderRequested = false

  hollowRoundedBox = new THREE.Group()


  constructor(el: string | HTMLElement, public dir: RegulatorDirection = 'horizontal') {
    const oEl = typeof el === 'string'
      ? document.querySelector<HTMLElement>(el)
      : el
    
    if (!oEl || !('innerHTML' in oEl)) {
      throw new Error('Invalid element provided')
    }

    this.parentEl = oEl

    this.setup()
    this.setupEvents()
    this.draw()
    this.render()
  }

  setup() {
    const canvas = document.createElement('canvas')
    this.parentEl.appendChild(canvas)
    const { width, height } = this.parentEl.getBoundingClientRect()
    this.width = Math.min(width * 0.8, 192)
    this.height = Math.min(height * 0.8, 48)

    if (this.dir === 'vertical') {
      this.width = Math.min(width * 0.8, 48)
      this.height = Math.min(height * 0.8, 192)
    }

    const renderer = this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: false })
    const scene = this.scene = new THREE.Scene()
    const camera = this.camera = new THREE.PerspectiveCamera(12, this.width / this.height, 0.1, 1000)

    camera.position.set(0, 0, this.dir === 'horizontal' ? 14 : 52)
    camera.lookAt(0, 0, 0)

    scene.add(camera)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(this.width, this.height)
    renderer.render(scene, camera)

    const controls = this.controls = new OrbitControls(camera, renderer.domElement)
    controls.rotateSpeed = 0.1
    controls.enableZoom = false
    controls.enablePan = true
    controls.enableDamping = true

    if (this.dir === 'horizontal') {
      // 限制垂直旋转
      controls.minPolarAngle = Math.PI / 2
      controls.maxPolarAngle = Math.PI / 2
    } else {
      // 限制水平旋转
      controls.minAzimuthAngle = Math.PI / 2
      controls.maxAzimuthAngle = Math.PI / 2

      // 保存初始状态，用于 reset
      controls.saveState()
    }

    const ambientLight = new THREE.AmbientLight(0x404040)
    scene.add(ambientLight)

    const directionalLight = this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8)
    directionalLight.position.set(0, 0, 50)
    directionalLight.lookAt(0, 0, 0)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 1024
    directionalLight.shadow.mapSize.height = 1024
    scene.add(directionalLight)
  }

  setupEvents() {
    const { controls, directionalLight, camera, previousRotateAngle } = this
    const handleChange = () => {
      this.requestRenderIfNotRequested()

      directionalLight.position.copy(camera.position);

      const currentRotateAngle = this.dir === 'horizontal'
        ? controls.getAzimuthalAngle()
        : controls.getPolarAngle()
      const delta = currentRotateAngle - previousRotateAngle;

      if (this.dir === 'vertical') {
        if (currentRotateAngle >= Math.PI - 0.01 || currentRotateAngle <= 0.01) {
          controls.removeEventListener('change', handleChange)
          controls.reset()
          directionalLight.position.copy(camera.position);
          controls.addEventListener('change', handleChange)
        }
      }
  
      if (delta > 0) {
        // console.log("向右旋转");
      } else if (delta < 0) {
        // console.log("向左旋转");
      }

      this.previousRotateAngle = currentRotateAngle;
    }
    controls.addEventListener('change', handleChange)
  }

  draw() {
    const { scene } = this

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x6b7b8b,
      clearcoat: 0.92,
      clearcoatRoughness: 0.35,
    })

    const teeth = 48
    const radius = 4
    const thickness = 1

    const gearGroup = new THREE.Group();

    // 轴
    const axisGeometry = new THREE.CylinderGeometry(radius * 0.4, radius * 0.4, thickness * 2, 32);
    const axisMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const axisMesh = new THREE.Mesh(axisGeometry, axisMaterial);
    axisMesh.rotation.x = Math.PI / 2; // 水平放置
    gearGroup.add(axisMesh);

    // 轮盘
    const gearBodyGeometry = new THREE.CylinderGeometry(
      radius, radius, thickness, 32
    );
    const gearBody = new THREE.Mesh(gearBodyGeometry, material);
    gearBody.rotation.x = Math.PI / 2; // 水平放置
    gearGroup.add(gearBody);

    // 齿
    const toothShape = new THREE.Shape();
    const toothThickness = 0.8

    // 定义梯形路径（从齿根到齿顶）
    toothShape.moveTo(-0.08, 0);
    toothShape.lineTo(-0.25, toothThickness);
    toothShape.lineTo(0.25, toothThickness);
    toothShape.lineTo(0.08, 0);
    toothShape.lineTo(-0.08, 0);

    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: false
    };
    const toothGeometry = new THREE.ExtrudeGeometry(toothShape, extrudeSettings);

    // 环形排列齿轮齿
  const teethGeometries = [];
    const angleStep = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const clonedGeo = toothGeometry.clone();
      const angle = i * angleStep;
    const matrix = new THREE.Matrix4()
    .makeRotationZ(angle + Math.PI / 2) // 先旋转
    .setPosition(
      Math.cos(angle) * (radius + 0.75),
      Math.sin(angle) * (radius + 0.75),
      -0.5
    );
      
    clonedGeo.applyMatrix4(matrix);
    teethGeometries.push(clonedGeo);
    }
    const mergedTeethGeometry = BufferGeometryUtils.mergeGeometries(teethGeometries);
    const teethMesh = new THREE.Mesh(mergedTeethGeometry, material);
    gearGroup.add(teethMesh);
    scene.add(gearGroup)
    if (this.dir === 'horizontal') {
      gearGroup.rotation.x = Math.PI / 2; // 水平放置
    }

    // 绘制方通
    {
      const geometry = createHollowRoundedBoxGeometry({
        width: radius * 2 + toothThickness * 2 + 0.6,
        height: thickness + 1.6,
        thickness: 0.3,
        radius: 0.4,
        depth: 3,
        segments: 8,
      })
      const mesh = new THREE.Mesh(geometry, material)
      if (this.dir === 'vertical') {
        // mesh.rotation.x = Math.PI / 2
        // mesh.rotation.y = Math.PI / 2
        mesh.rotation.x = Math.PI
        mesh.rotation.y = Math.PI
        mesh.rotation.z = Math.PI / 2
      }

      this.hollowRoundedBox.add(mesh)
      scene.add(this.hollowRoundedBox)
    }
  }

  render() {
    this.renderRequested = false

    if (resizeRendererToDisplaySize(this.renderer)) {
      const canvas = this.renderer.domElement
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight
      this.camera.updateProjectionMatrix()
    }

    this.controls.update()

    // 更新方通位置
    this.hollowRoundedBox.quaternion.copy(this.camera.quaternion)

    this.renderer.render(this.scene, this.camera)
  }

  requestRenderIfNotRequested() {
    if (!this.renderRequested) {
      this.renderRequested = true;
      requestAnimationFrame(() => this.render());
    }
  }
}