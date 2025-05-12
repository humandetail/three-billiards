import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js'
import { setGeometryColor } from '../utils'

export interface CompoundItem {
  width: number
  height: number
  depth: number
  x: number
  y: number
  z: number
  color: THREE.Color
}

interface CompoundOptions {
  mass: number
  meshPosition: THREE.Vector3
  bodyPosition: CANNON.Vec3
}
export default class Compound {
  items: CompoundItem[] = []

  constructor(public options: CompoundOptions) {}

  add(item: CompoundItem) {
    this.items.push(item)
  }

  generate() {
    const body = new CANNON.Body({
      mass: this.options.mass,
    })
    body.position.copy(this.options.bodyPosition)

    const geometries: THREE.BoxGeometry[] = []

    this.items.forEach(({ width, height, depth, x, y, z, color }) => {
      const geometry = Compound.createBoxGeometry({ width, height, depth, x, y, z })
      setGeometryColor(geometry, color)
      geometries.push(geometry)

      const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2))
      body.addShape(shape, new CANNON.Vec3(x, y, z))
    })

    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, false)
    const mesh = new THREE.Mesh(
      mergedGeometry,
      new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
    )
    mesh.position.copy(this.options.meshPosition)
    return {
      mesh,
      body,
    }
  }

  static createBoxGeometry(item: Pick<CompoundItem, 'width' | 'height' | 'depth' | 'x' | 'y' | 'z'>): THREE.BoxGeometry {
    const { width, height, depth, x, y, z } = item
    const geometry = new THREE.BoxGeometry(width, height, depth)
    const matrix = new THREE.Matrix4()
    matrix.makeTranslation(x, y, z)
    geometry.applyMatrix4(matrix)
    return geometry
  }
}
