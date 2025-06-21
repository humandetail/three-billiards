import type { Ball, Cushion } from './lib/physics/PhysicsSystem'
import type { Point } from './utils/index.js'
import * as THREE from 'three'

import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { setup } from './central-control'
import config, { getTangent } from './config'
import {
  applyImpulse,

  createBall,
  createCushion,

  physicsUpdate,
} from './lib/physics/PhysicsSystem'
import { SPATIAL_GRID_SIZE, SpatialGrid } from './lib/physics/SpatialGrid'
import { arcToPoints, getTexturePath } from './utils/index.js'

import './style.scss'

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
)
camera.position.set(-2, 1, 0)
scene.add(camera)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setClearColor(0xFFFFFF)
document.body.appendChild(renderer.domElement)

const light = new THREE.DirectionalLight(0xFFFFFF, 1)
light.position.set(0, 10, 0)
scene.add(light)

const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5)
scene.add(ambientLight)

const pointLight = new THREE.PointLight(0xFFFFFF, 1, 100)
pointLight.position.set(0, 10, 0)
scene.add(pointLight)

const axes = new THREE.AxesHelper(5)
scene.add(axes)

const controls = new OrbitControls(camera, renderer.domElement)

function createCushionRubbers(): THREE.Mesh[] {
  const cushionRubbers = generateCushionGeometries()
  return cushionRubbers.map((geometry, index) => {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshPhysicalMaterial({ color: 0x226622, wireframe: false }),
    )
    mesh.rotateX(Math.PI / 2)
    mesh.position.set(0, config.ball.radius * 0.7, 0)
    scene.add(mesh)

    mesh.name = `cushionRubber-${index}`
    return mesh
  })
}

function generateCushionGeometries(): THREE.ExtrudeGeometry[] {
  const {
    cushion: {
      rubberEndPoints,
    },
    ball: { radius: r },
  } = config

  return rubberEndPoints.slice(0, 6).map((points, index) => {
    const [A, B, C, D, E, F, G, H] = points

    let tangent1: Point
    let tangent2: Point
    let tangent3: Point
    let tangent4: Point

    if ([0, 3, 5].includes(index)) {
      ;[tangent1, tangent2] = getTangent(A, B, C, r)
      ;[tangent3, tangent4] = getTangent(B, C, D, r)
    }
    else {
      ;[tangent2, tangent1] = getTangent(C, B, A, r)
      ;[tangent4, tangent3] = getTangent(D, C, B, r)
    }

    const shape = new THREE.Shape()
    shape.moveTo(A.x, A.y)
    shape.lineTo(tangent1.x, tangent1.y)

    const arcPoints1 = arcToPoints(tangent1, B, tangent2, r, 32, index === 5)
    arcPoints1.forEach(p => shape.lineTo(p.x, p.y))

    const arcPoints3 = arcToPoints(tangent3, C, tangent4, r)
    arcPoints3.forEach(p => shape.lineTo(p.x, p.y))

    shape.lineTo(D.x, D.y)
    shape.lineTo(E.x, E.y)
    shape.lineTo(F.x, F.y)
    shape.lineTo(G.x, G.y)
    shape.lineTo(H.x, H.y)
    shape.lineTo(A.x, A.y)

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: r,
      bevelEnabled: false,
    }

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geometry.translate(0, 0, -r)
    return geometry
  })
}

const balls: Ball[] = [
  createBall(1, -0.5, config.ball.radius, 0, config.ball.radius, config.ball.mass),
  createBall(2, -0.3, config.ball.radius, 0, config.ball.radius, config.ball.mass),
  createBall(3, -config.table.width / 2 + config.ball.radius * 4, config.ball.radius, 0, config.ball.radius, config.ball.mass),
]

setTimeout(() => {
  applyImpulse(balls[0], new THREE.Vector3(-0.3, 0, 0), 0.5, new THREE.Vector3(-config.ball.radius, 0, 0))
  // applyImpulse(balls[1], new THREE.Vector3(0, 0, -0.3), 0.5, new THREE.Vector3(0, 0, 0))
  applyImpulse(balls[1], new THREE.Vector3(0, 0, 0), 0.5, new THREE.Vector3(0, 0, 0))
  applyImpulse(balls[2], new THREE.Vector3(0.4, 0, -0.3), 0.4, new THREE.Vector3(0, 0, 0))
}, 1000)

const loader = new THREE.TextureLoader()

balls.forEach((ball, index) => {
  const texture = loader.load(getTexturePath(`balls/${index}.jpg`))
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(ball.radius, 32, 32),
    new THREE.MeshPhongMaterial({ map: texture }),
  )
  mesh.position.set(ball.x, ball.y, ball.z)
  mesh.name = `ball-${index}`
  ball.mesh = mesh
  scene.add(mesh)
})

const cushionMeshes = createCushionRubbers()
const cushions: Cushion[] = cushionMeshes.map(mesh => createCushion(mesh))

let lastTime = 0
const spatialGrid = new SpatialGrid(SPATIAL_GRID_SIZE)
function gameLoop(timestamp: number): void {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.01)
  lastTime = timestamp

  physicsUpdate(balls, cushions, dt, scene, spatialGrid)

  controls.update()
  renderer.render(scene, camera)

  requestAnimationFrame(gameLoop)
}

requestAnimationFrame(gameLoop)
