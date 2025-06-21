import * as THREE from 'three'

// 物理常量
const DEFAULT_RESTITUTION = 0.9 // 恢复系数
const DEFAULT_FRICTION = 0.08 // 摩擦力
const ROLLING_FRICTION = 0.03 // 增加滚动摩擦系数
const STATIC_FRICTION_THRESHOLD = 0.005 // 静态摩擦阈值
const DRAG_COEFFICIENT = 0.47 // 阻力系数
const COLLISION_SUBSTEPS = 16 // 子步骤数量
const RESTING_THRESHOLD = 0.0005 // 静止阈值
const ANGULAR_RESTING_THRESHOLD = 0.0005 // 角速度阈值
const ENERGY_LOSS_THRESHOLD = 0.005 // 能量损失阈值
const MAX_ANGULAR_VELOCITY = 50 // 最大角速度
const POST_COLLISION_DAMPING = 0.7 // 碰撞后阻尼
export const SPATIAL_GRID_SIZE = 0.6 // 网格大小

export interface Ball {
  id: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  angularVelocityX: number
  angularVelocityY: number
  angularVelocityZ: number
  radius: number
  mass: number
  restitution: number
  friction: number
  dragCoefficient: number
  lastCollisionTime: number
  prevPosition: { x: number, y: number, z: number }
  isResting: boolean
  energyLossCounter: number
  mesh?: THREE.Mesh
  lastCellKey?: string
}

export interface Cushion {
  mesh: THREE.Mesh
  restitution: number
  friction: number
  rollingFriction: number
  worldAABB?: THREE.Box3 // 缓存的世界坐标AABB
}

// 优化的空间网格（增量更新）
export class SpatialGrid {
  private grid: Map<string, Set<Ball>> = new Map()
  private cellSize: number

  constructor(cellSize: number = SPATIAL_GRID_SIZE) {
    this.cellSize = cellSize
  }

  private getCellKey(x: number, z: number): string {
    const cellX = Math.floor(x / this.cellSize)
    const cellZ = Math.floor(z / this.cellSize)
    return `${cellX},${cellZ}`
  }

  clear(): void {
    this.grid.clear()
  }

  update(ball: Ball): void {
    const newKey = this.getCellKey(ball.x, ball.z)

    // 如果单元格没有变化，不需要更新
    if (ball.lastCellKey === newKey)
      return

    // 从旧单元格移除
    if (ball.lastCellKey && this.grid.has(ball.lastCellKey)) {
      const cell = this.grid.get(ball.lastCellKey)!
      cell.delete(ball)
      if (cell.size === 0) {
        this.grid.delete(ball.lastCellKey)
      }
    }

    // 添加到新单元格
    if (!this.grid.has(newKey)) {
      this.grid.set(newKey, new Set())
    }
    this.grid.get(newKey)!.add(ball)
    ball.lastCellKey = newKey
  }

  getNearbyBalls(ball: Ball): Ball[] {
    const result: Ball[] = []
    const cellX = Math.floor(ball.x / this.cellSize)
    const cellZ = Math.floor(ball.z / this.cellSize)

    // 检查相邻的9个单元格
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const key = `${cellX + dx},${cellZ + dz}`
        const cell = this.grid.get(key)
        if (cell) {
          for (const b of cell) {
            if (b !== ball && !b.isResting) {
              result.push(b)
            }
          }
        }
      }
    }

    return result
  }
}

export function createBall(
  id: number,
  x: number,
  y: number,
  z: number,
  radius: number,
  mass: number,
): Ball {
  return {
    id,
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    angularVelocityX: 0,
    angularVelocityY: 0,
    angularVelocityZ: 0,
    radius,
    mass,
    restitution: DEFAULT_RESTITUTION,
    friction: DEFAULT_FRICTION,
    dragCoefficient: DRAG_COEFFICIENT,
    lastCollisionTime: 0,
    prevPosition: { x, y, z },
    isResting: false,
    energyLossCounter: 0,
  }
}

// 优化的冲量应用
export function applyImpulse(
  ball: Ball,
  directionVec3: THREE.Vector3,
  force: number,
  spinVec3: THREE.Vector3,
  contactPoint?: THREE.Vector3,
): void {
  const forceVec = directionVec3.clone().normalize().multiplyScalar(force)

  if (contactPoint) {
    const torque = new THREE.Vector3().crossVectors(contactPoint, forceVec)
    const I = computeMomentOfInertia(ball.mass, ball.radius)
    const angularAccel = torque.divideScalar(I)

    // 限制角加速度
    if (angularAccel.length() > MAX_ANGULAR_VELOCITY) {
      angularAccel.normalize().multiplyScalar(MAX_ANGULAR_VELOCITY)
    }

    ball.angularVelocityX += angularAccel.x
    ball.angularVelocityY += angularAccel.y
    ball.angularVelocityZ += angularAccel.z
  }

  ball.vx += forceVec.x / ball.mass
  ball.vy += forceVec.y / ball.mass
  ball.vz += forceVec.z / ball.mass

  ball.angularVelocityX += spinVec3.x
  ball.angularVelocityY += spinVec3.y
  ball.angularVelocityZ += spinVec3.z

  ball.isResting = false
  ball.energyLossCounter = 0
}

export function physicsUpdate(
  balls: Ball[],
  cushions: Cushion[],
  dt: number,
  scene: THREE.Scene,
  spatialGrid: SpatialGrid,
): void {
  // 1. 清空空间网格
  spatialGrid.clear()

  // 2. 保存上一帧位置，更新空间网格，计算最大速度
  let maxSpeed = 0
  for (const ball of balls) {
    ball.prevPosition = { x: ball.x, y: ball.y, z: ball.z }

    if (!ball.isResting) {
      spatialGrid.update(ball)
      // 计算速度大小
      const { vx, vy, vz } = ball
      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz)
      if (speed > maxSpeed)
        maxSpeed = speed

      // 施加外力
      applyForces(ball, dt)
    }
  }

  // 3. 计算子步数，限制范围，避免子步过少或过多
  const minSubsteps = COLLISION_SUBSTEPS
  const maxSubsteps = COLLISION_SUBSTEPS * 4 // 限制最大4倍的子步数避免卡顿
  const ballRadiusHalf = balls[0]?.radius * 0.5 || 1

  let requiredSubsteps = Math.ceil((maxSpeed * dt) / ballRadiusHalf)
  requiredSubsteps = Math.min(Math.max(requiredSubsteps, minSubsteps), maxSubsteps)

  const subDt = dt / requiredSubsteps

  // 4. 子步循环，先更新位置，再处理碰撞，再衰减能量
  for (let step = 0; step < requiredSubsteps; step++) {
    const ballPrevPositions = new Map<number, THREE.Vector3>()

    for (const ball of balls) {
      ballPrevPositions.set(ball.id, new THREE.Vector3(ball.x, ball.y, ball.z))
    }

    // 更新位置
    for (const ball of balls) {
      if (ball.isResting)
        continue
      ball.x += ball.vx * subDt
      ball.y += ball.vy * subDt
      ball.z += ball.vz * subDt
    }

    // 球与球碰撞
    for (let i = 0; i < balls.length; i++) {
      const ball = balls[i]
      if (ball.isResting)
        continue

      const nearbyBalls = spatialGrid.getNearbyBalls(ball)
      for (const otherBall of nearbyBalls) {
        if (otherBall.isResting || ball.id >= otherBall.id)
          continue
        const prevPos1 = ballPrevPositions.get(ball.id)!
        const prevPos2 = ballPrevPositions.get(otherBall.id)!
        collideBallsWithCCD(ball, otherBall, prevPos1, prevPos2, subDt)
      }
    }

    // 球与库边碰撞
    for (const ball of balls) {
      if (ball.isResting)
        continue
      for (const cushion of cushions) {
        resolveCushionCollisionWithCCD(ball, cushion)
      }
    }

    // 应用能量衰减
    applyEnergyDecay(balls, subDt)
  }

  // 5. 更新场景和检测静止状态
  for (const ball of balls) {
    checkRestingState(ball)

    if (ball.isResting) {
      // 确保球完全停止
      ball.vx = 0
      ball.vy = 0
      ball.vz = 0
      ball.angularVelocityX = 0
      ball.angularVelocityY = 0
      ball.angularVelocityZ = 0
      continue
    }

    // 更新三维模型位置和旋转
    const ballMesh = ball.mesh
    if (ballMesh) {
      ballMesh.position.set(ball.x, ball.y, ball.z)
      updateBallRotation(ball, dt)
    }

    // 处理桌面碰撞（y轴）
    if (ball.y - ball.radius < 0) {
      handleTableCollision(ball)
    }
  }
}

// 优化：分离桌面碰撞处理
function handleTableCollision(ball: Ball): void {
  ball.y = ball.radius

  if (ball.vy < 0) {
    ball.vy = -ball.vy * ball.restitution
    ball.energyLossCounter++

    if (ball.energyLossCounter > 3 || Math.abs(ball.vy) < ENERGY_LOSS_THRESHOLD) {
      ball.vy = 0
    }
  }
}

// function checkRestingState(ball: Ball): void {
//   const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2 + ball.vz ** 2)
//   const angularSpeed = Math.sqrt(
//     ball.angularVelocityX ** 2
//     + ball.angularVelocityY ** 2
//     + ball.angularVelocityZ ** 2,
//   )

//   ball.isResting = speed < RESTING_THRESHOLD && angularSpeed < ANGULAR_RESTING_THRESHOLD
// }
function checkRestingState(ball: Ball): void {
  const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2 + ball.vz ** 2)

  // 添加旋转能量检测
  const rotationalEnergy = Math.sqrt(
    ball.angularVelocityX ** 2
    + ball.angularVelocityZ ** 2,
  ) * ball.radius

  // 组合线速度和旋转能量
  const combinedEnergy = speed + rotationalEnergy

  ball.isResting = combinedEnergy < RESTING_THRESHOLD
}

function computeMomentOfInertia(mass: number, radius: number): number {
  return (2 / 5) * mass * radius * radius
}

// 优化的空气阻力
function applyAirResistance(ball: Ball, dt: number): void {
  const speedSquared = ball.vx ** 2 + ball.vy ** 2 + ball.vz ** 2
  if (speedSquared < 0.0001)
    return

  const area = Math.PI * ball.radius ** 2
  const dragMagnitude = 0.5 * 1.2 * speedSquared * ball.dragCoefficient * area
  const dragForce = -dragMagnitude / Math.sqrt(speedSquared)

  ball.vx += (dragForce * ball.vx) / ball.mass * dt
  ball.vy += (dragForce * ball.vy) / ball.mass * dt
  ball.vz += (dragForce * ball.vz) / ball.mass * dt
}

function applyForces(ball: Ball, dt: number): void {
  // 重力
  ball.vy -= 9.81 * dt

  // 空气阻力
  applyAirResistance(ball, dt)
  // 增强摩擦力计算
  const normalForce = ball.mass * 9.81
  const frictionCoefficient = ball.friction

  // 计算接触点相对速度
  const surfaceVelocityX = -ball.angularVelocityZ * ball.radius
  const surfaceVelocityZ = ball.angularVelocityX * ball.radius
  const relativeVelX = ball.vx - surfaceVelocityX
  const relativeVelZ = ball.vz - surfaceVelocityZ
  const slipSpeed = Math.sqrt(relativeVelX ** 2 + relativeVelZ ** 2)

  // 静态摩擦处理
  if (slipSpeed < STATIC_FRICTION_THRESHOLD) {
    if (Math.abs(ball.vx) < STATIC_FRICTION_THRESHOLD
      && Math.abs(ball.vz) < STATIC_FRICTION_THRESHOLD) {
      ball.vx = 0
      ball.vz = 0
      ball.angularVelocityX = 0
      ball.angularVelocityZ = 0
      return
    }
  }

  if (slipSpeed > 0.001) {
    // 滑动摩擦力 (优化计算)
    const frictionMagnitude = normalForce * frictionCoefficient
    const frictionDirX = -relativeVelX / (slipSpeed + 1e-6)
    const frictionDirZ = -relativeVelZ / (slipSpeed + 1e-6)

    // 应用摩擦力
    const fx = frictionDirX * frictionMagnitude
    const fz = frictionDirZ * frictionMagnitude

    ball.vx += fx / ball.mass * dt
    ball.vz += fz / ball.mass * dt

    // 应用力矩 (优化计算)
    const I = computeMomentOfInertia(ball.mass, ball.radius)
    const torqueX = -frictionDirZ * frictionMagnitude * ball.radius
    const torqueZ = frictionDirX * frictionMagnitude * ball.radius

    ball.angularVelocityX += torqueX / I * dt
    ball.angularVelocityZ += torqueZ / I * dt
  }
  else {
    // 增强滚动摩擦
    const rollingFrictionMagnitude = normalForce * ROLLING_FRICTION
    const speed = Math.hypot(ball.vx, ball.vz)

    if (speed > 0) {
      const frictionDirX = -ball.vx / speed
      const frictionDirZ = -ball.vz / speed

      ball.vx += frictionDirX * rollingFrictionMagnitude / ball.mass * dt
      ball.vz += frictionDirZ * rollingFrictionMagnitude / ball.mass * dt
    }

    // 增强角速度衰减
    const angularDamping = 1 - (0.1 * dt) // 增加衰减强度
    ball.angularVelocityX *= angularDamping
    ball.angularVelocityZ *= angularDamping

    // 角速度阈值处理
    if (Math.abs(ball.angularVelocityX) < ANGULAR_RESTING_THRESHOLD)
      ball.angularVelocityX = 0
    if (Math.abs(ball.angularVelocityZ) < ANGULAR_RESTING_THRESHOLD)
      ball.angularVelocityZ = 0
  }
}

// 优化的能量衰减
function applyEnergyDecay(balls: Ball[], dt: number): void {
  const LINEAR_DECAY = 0.98
  const ANGULAR_DECAY = 0.92

  const linearDecay = LINEAR_DECAY ** (dt)
  const angularDecay = ANGULAR_DECAY ** (dt)

  for (const ball of balls) {
    if (ball.isResting)
      continue

    // // 线速度衰减
    // ball.vx *= LINEAR_DECAY
    // ball.vy *= LINEAR_DECAY
    // ball.vz *= LINEAR_DECAY
    ball.vx *= linearDecay
    ball.vy *= linearDecay
    ball.vz *= linearDecay

    // // 角速度衰减
    // ball.angularVelocityX *= ANGULAR_DECAY
    // ball.angularVelocityY *= ANGULAR_DECAY
    // ball.angularVelocityZ *= ANGULAR_DECAY
    ball.angularVelocityX *= angularDecay
    ball.angularVelocityY *= angularDecay
    ball.angularVelocityZ *= angularDecay

    // 清除微小速度
    if (Math.abs(ball.vx) < 1e-6)
      ball.vx = 0
    if (Math.abs(ball.vy) < 1e-6)
      ball.vy = 0
    if (Math.abs(ball.vz) < 1e-6)
      ball.vz = 0
    if (Math.abs(ball.angularVelocityX) < 1e-6)
      ball.angularVelocityX = 0
    if (Math.abs(ball.angularVelocityY) < 1e-6)
      ball.angularVelocityY = 0
    if (Math.abs(ball.angularVelocityZ) < 1e-6)
      ball.angularVelocityZ = 0
  }
}

function collideBallsWithCCD(
  b1: Ball,
  b2: Ball,
  prevPos1: THREE.Vector3,
  prevPos2: THREE.Vector3,
  dt: number,
): void {
  const relPos = new THREE.Vector3().subVectors(b2, b1)
  const relVel = new THREE.Vector3(b2.vx - b1.vx, b2.vy - b1.vy, b2.vz - b1.vz)
  const radiusSum = b1.radius + b2.radius

  const a = relVel.dot(relVel)
  const b = 2 * relVel.dot(relPos)
  const c = relPos.dot(relPos) - radiusSum * radiusSum
  const discriminant = b * b - 4 * a * c

  if (discriminant < 0 || a === 0)
    return

  const sqrtDisc = Math.sqrt(discriminant)
  const t = (-b - sqrtDisc) / (2 * a)
  if (t < 0 || t > dt)
    return

  const t1 = t / dt
  const b1Pos = new THREE.Vector3().lerpVectors(prevPos1, new THREE.Vector3(b1.x, b1.y, b1.z), t1)
  const b2Pos = new THREE.Vector3().lerpVectors(prevPos2, new THREE.Vector3(b2.x, b2.y, b2.z), t1)

  const normal = new THREE.Vector3().subVectors(b2Pos, b1Pos).normalize()
  const relVelocity = new THREE.Vector3(b2.vx - b1.vx, b2.vy - b1.vy, b2.vz - b1.vz)
  const velocityAlongNormal = relVelocity.dot(normal)
  if (velocityAlongNormal > 0)
    return

  const restitution = Math.min(b1.restitution, b2.restitution)
  const invMass1 = 1 / b1.mass
  const invMass2 = 1 / b2.mass
  const impulseScalar = -(1 + restitution) * velocityAlongNormal / (invMass1 + invMass2)
  const impulse = normal.clone().multiplyScalar(impulseScalar)

  b1.vx -= impulse.x * invMass1
  b1.vy -= impulse.y * invMass1
  b1.vz -= impulse.z * invMass1
  b2.vx += impulse.x * invMass2
  b2.vy += impulse.y * invMass2
  b2.vz += impulse.z * invMass2

  // 在碰撞响应后添加能量损失
  b1.vx *= POST_COLLISION_DAMPING
  b1.vz *= POST_COLLISION_DAMPING
  b2.vx *= POST_COLLISION_DAMPING
  b2.vz *= POST_COLLISION_DAMPING

  b1.angularVelocityX *= POST_COLLISION_DAMPING
  b1.angularVelocityZ *= POST_COLLISION_DAMPING
  b2.angularVelocityX *= POST_COLLISION_DAMPING
  b2.angularVelocityZ *= POST_COLLISION_DAMPING

  // 防止重叠
  const correction = normal.clone().multiplyScalar((radiusSum - b1Pos.distanceTo(b2Pos)) * 0.8)
  const totalMass = b1.mass + b2.mass
  const weight1 = b2.mass / totalMass
  const weight2 = b1.mass / totalMass
  b1.x -= correction.x * weight1
  b1.y -= correction.y * weight1
  b1.z -= correction.z * weight1
  b2.x += correction.x * weight2
  b2.y += correction.y * weight2
  b2.z += correction.z * weight2

  b1.lastCollisionTime = performance.now()
  b2.lastCollisionTime = performance.now()
  b1.isResting = false
  b2.isResting = false
}

export function resolveCushionCollisionWithCCD(ball: Ball, cushion: Cushion): void {
  // 预计算库边 AABB（只需一次）
  if (!cushion.worldAABB) {
    cushion.mesh.geometry.computeBoundingBox()
    cushion.worldAABB = cushion.mesh.geometry.boundingBox!.clone().applyMatrix4(cushion.mesh.matrixWorld).expandByScalar(ball.radius)
  }

  // 球当前包围盒
  const ballBox = new THREE.Box3(
    new THREE.Vector3(ball.x - ball.radius, ball.y - ball.radius, ball.z - ball.radius),
    new THREE.Vector3(ball.x + ball.radius, ball.y + ball.radius, ball.z + ball.radius),
  )

  if (!cushion.worldAABB.intersectsBox(ballBox))
    return // 快速 AABB 剔除

  // 使用 CCD 射线检测
  const from = new THREE.Vector3(ball.prevPosition.x, ball.prevPosition.y, ball.prevPosition.z)
  const to = new THREE.Vector3(ball.x, ball.y, ball.z)
  const direction = new THREE.Vector3().subVectors(to, from)
  const length = direction.length()

  if (length < 1e-6)
    return
  direction.normalize()

  const raycaster = new THREE.Raycaster(from, direction, 0, length + ball.radius)
  const intersects = raycaster.intersectObject(cushion.mesh, true)

  if (intersects.length === 0)
    return

  const hit = intersects[0]
  const hitPoint = hit.point
  const hitNormal = hit.face!.normal.clone().applyMatrix3(
    new THREE.Matrix3().getNormalMatrix(cushion.mesh.matrixWorld),
  ).normalize()

  // 球是否正在离开
  const velocity = new THREE.Vector3(ball.vx, ball.vy, ball.vz)
  const velocityAlongNormal = velocity.dot(hitNormal)
  if (velocityAlongNormal >= 0)
    return

  // 弹性响应
  velocity.addScaledVector(hitNormal, -(1 + ball.restitution) * velocityAlongNormal)

  // 摩擦处理
  const tangent = velocity.clone().sub(hitNormal.clone().multiplyScalar(velocity.dot(hitNormal)))
  const tangentSpeed = tangent.length()
  if (tangentSpeed > 1e-3) {
    const frictionImpulse = tangent.normalize().multiplyScalar(-ball.friction * tangentSpeed)
    velocity.add(frictionImpulse)
  }

  // 更新速度
  ball.vx = velocity.x
  ball.vy = velocity.y
  ball.vz = velocity.z

  // 位置修正（避免嵌入）
  const contactToBall = new THREE.Vector3(ball.x, ball.y, ball.z).sub(hitPoint)
  const penetration = ball.radius - contactToBall.dot(hitNormal)
  if (penetration > 0) {
    ball.x += hitNormal.x * penetration
    ball.y += hitNormal.y * penetration
    ball.z += hitNormal.z * penetration
  }

  ball.lastCollisionTime = performance.now()
  ball.isResting = false
}

// 优化的旋转更新
export function updateBallRotation(ball: Ball, dt: number): void {
  if (!ball.mesh)
    return

  const angularSpeed = Math.hypot(
    ball.angularVelocityX,
    ball.angularVelocityY,
    ball.angularVelocityZ,
  )

  if (angularSpeed < 0.001)
    return

  const axis = new THREE.Vector3(
    ball.angularVelocityX,
    ball.angularVelocityY,
    ball.angularVelocityZ,
  ).normalize()

  const angle = angularSpeed * dt
  const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle)
  ball.mesh.quaternion.multiply(quaternion).normalize()
}

export function createCushion(
  mesh: THREE.Mesh,
  restitution = 0.8,
  friction = 0.2,
  rollingFriction = 0.05,
): Cushion {
  mesh.updateMatrixWorld(true)
  return {
    mesh,
    restitution,
    friction,
    rollingFriction,
  }
}

// 优化的球袋检测
export function checkPocketCollision(balls: Ball[], pockets: THREE.Vector3[], pocketRadius = 0.1): number[] {
  const pocketedBalls: number[] = []
  const pocketRadiusSq = pocketRadius * pocketRadius

  for (const ball of balls) {
    if (ball.isResting)
      continue

    for (const pocket of pockets) {
      const dx = ball.x - pocket.x
      const dy = ball.y - pocket.y
      const dz = ball.z - pocket.z
      const distSq = dx * dx + dy * dy + dz * dz

      if (distSq < pocketRadiusSq) {
        pocketedBalls.push(ball.id)
        ball.isResting = true
        ball.vx = ball.vy = ball.vz = 0
        ball.angularVelocityX = ball.angularVelocityY = ball.angularVelocityZ = 0
        break
      }
    }
  }

  return pocketedBalls
}
