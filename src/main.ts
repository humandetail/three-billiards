import Cannon from 'cannon'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import Ball from './lib/Ball'
import Compound from './lib/Compound'
import Layout from './lib/Layout'
import Table from './lib/Table'
import { getPoints } from './utils'
import './style.css'
import Cue from './lib/Cue'

function main() {
  const layout = new Layout(document.querySelector('#main-canvas') as HTMLCanvasElement)

  const table = new Table(layout)

  // eslint-disable-next-line no-new
  new Ball(layout)
  table.makeTable()

  new Cue(layout)

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      layout.hitBall()
    }
  })
}

main()

// eslint-disable-next-line unused-imports/no-unused-vars
function test() {
  const canvas = document.querySelector('#main-canvas') as HTMLCanvasElement
  const { innerWidth, innerHeight } = window

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000)
  camera.position.y = 20
  scene.add(camera)
  const renderer = new THREE.WebGLRenderer({ canvas })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0xFFFFFF)
  renderer.setSize(innerWidth, innerHeight)
  renderer.render(scene, camera)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  const axis = new THREE.AxesHelper(5)
  scene.add(axis)
  const grid = new THREE.GridHelper(100, 100)
  scene.add(grid)

  const world = new Cannon.World()
  world.gravity.set(0, -9.82, 0)
  // 创建 Cannon.js 的静态地板（质量 mass=0 表示静态）
  const floorShape = new Cannon.Plane()
  const floorBody = new Cannon.Body({
    mass: 0, // mass=0 表示静态物体（不受重力影响）
    shape: floorShape,
  })
  floorBody.quaternion.setFromAxisAngle(
    new Cannon.Vec3(1, 0, 0), // 绕 x 轴旋转
    -Math.PI / 2, // 旋转 -90 度（让平面平铺）
  )
  floorBody.position.set(0, 0, 0) // 设置位置
  world.addBody(floorBody)

  // 半径
  const radius = 4
  // 质量
  const quality = 1000

  const ballMaterial = new Cannon.Material('ball')
  const wallMaterial = new Cannon.Material('wall')

  const contactMaterial = new Cannon.ContactMaterial(ballMaterial, wallMaterial, {
    friction: 0.15, // 摩擦系数（0=无摩擦，1=完全摩擦）
    restitution: 1, // 弹性系数（0=完全非弹性，1=完全弹性）
  })
  world.addContactMaterial(contactMaterial)

  const points = getPoints(0, 0, radius, Math.PI / 2, Math.PI, false, quality)

  const compound = new Compound(0, 0, 0, 0)

  points.forEach((point) => {
    const height = radius - Math.abs(point.y)

    compound.add({
      width: 0.1,
      height: 2,
      depth: height,
      x: point.x,
      y: 1,
      z: Math.abs(point.y) + height / 2,
      color: new THREE.Color('green'),
    })
  })

  const { mesh, body } = compound.generate()

  scene.add(mesh)
  body.material = wallMaterial
  world.addBody(body)

  const points2 = getPoints(0, 0, radius, Math.PI, Math.PI * 1.5, false, quality)
  const compound2 = new Compound(0, 0, 0, 0)

  points2.forEach((point) => {
    const height = radius - Math.abs(point.y)

    compound2.add({
      width: 0.1,
      height: 2,
      depth: height,
      x: point.x,
      y: 1,
      z: -Math.abs(point.y) - height / 2,
      color: new THREE.Color('blue'),
    })
  })

  const { mesh: mesh2, body: body2 } = compound2.generate()

  scene.add(mesh2)
  body2.material = wallMaterial
  world.addBody(body2)

  const ball = new THREE.Mesh(new THREE.SphereGeometry(radius / 4, 32, 32), new THREE.MeshBasicMaterial({ color: 'red' }))
  ball.position.set(1, 1, 3)
  scene.add(ball)

  const ballBody = new Cannon.Body({
    mass: 1,
    position: new Cannon.Vec3(1, 1, 3),
  })

  const ballShape = new Cannon.Sphere(radius / 4)
  ballBody.addShape(ballShape)
  ballBody.material = ballMaterial
  world.addBody(ballBody)

  // 给球体一个初始速度
  ballBody.velocity.set(-10, 0, 0)

  const syncPhysics = () => {
    ball.position.copy(ballBody.position)
  }

  function animate() {
    requestAnimationFrame(animate)
    controls.update()
    world.step(1 / 60)

    syncPhysics()

    renderer.render(scene, camera)
    syncPhysics()
  }

  animate()
}

// test()
