import Cannon from 'cannon'
import * as THREE from 'three'
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js'

export interface CompoundItem {
  width: number
  height: number
  depth: number
  x: number
  y: number
  z: number
  color: THREE.Color
}

export default class Compound {
  items: CompoundItem[] = []

  constructor(public mass: number, public px: number, public py: number, public pz: number) {}

  add(item: CompoundItem) {
    this.items.push(item)
  }

  generate() {
    const body = new Cannon.Body({
      mass: this.mass,
    })
    body.position.set(this.px, this.py, this.pz)

    const geometries: THREE.BoxGeometry[] = []

    this.items.forEach(({ width, height, depth, x, y, z, color }) => {
      const geometry = Compound.createBoxGeometry({ width, height, depth, x, y, z })
      const colors: Float32Array = new Float32Array(geometry.attributes.position.count * 3)
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = color.r
        colors[i + 1] = color.g
        colors[i + 2] = color.b
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometries.push(geometry)

      const shape = new Cannon.Box(new Cannon.Vec3(width / 2, height / 2, depth / 2))
      body.addShape(shape, new Cannon.Vec3(x, y, z))
    })

    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, false)
    const mesh = new THREE.Mesh(
      mergedGeometry,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
    )
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
