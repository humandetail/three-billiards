import * as THREE from 'three'
import Layout from './Layout'

export default class Cue {
  // 击球力度
  force = 10

  // 击球角度
  angle = 0

  constructor(public layout: Layout) {
    this.init()
  }

  init() {
    const cueGeometry = new THREE.CylinderGeometry(0.8, 1, 100, 32);
    const cueMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 }) // 木质棕色
    const cue = new THREE.Mesh(cueGeometry, cueMaterial)
    cue.position.set(0, 85, 0) // 初始位置
    cue.rotation.z = Math.PI / 2 // 横放

    this.layout.addObject('cue', cue)
    this.layout.cue = cue
  }
}