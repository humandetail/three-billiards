import * as THREE from 'three'
import { PARAMETERS } from './config'
import Layout from './lib/Layout'

import Table from './lib/Table'
import { getConnerPocketRadius, getPoints } from './utils'
import './style.css'

function main() {
  const layout = new Layout(document.querySelector('#main-canvas') as HTMLCanvasElement)

  // const geometry = new THREE.BoxGeometry(1, 1, 1)
  // const material = new THREE.MeshBasicMaterial({ color: 0x00FF00 })
  // const cube = new THREE.Mesh(geometry, material)
  // cube.position.set(0, 5, 0)
  // layout.addObject(cube)

  // cube.castShadow = true
  // cube.receiveShadow = true

  // const tableBoard = new THREE.Mesh(
  //   new THREE.BoxGeometry(PARAMETERS.TABLE_WIDTH, PARAMETERS.TABLE_HEIGHT, PARAMETERS.TABLE_THICKNESS),
  //   new THREE.MeshPhongMaterial({ color: 'deepskyblue', side: THREE.DoubleSide }),
  // )
  // tableBoard.position.set(0, 4, 0)
  // tableBoard.rotation.x = THREE.MathUtils.degToRad(-90)

  // tableBoard.castShadow = true
  // tableBoard.receiveShadow = true

  // layout.addObject(tableBoard)
  const table = new Table(layout)
  table.makeTable()
  setTimeout(() => {
    layout.render()
  })
}

main()

function createCanvas(width = 400, height = 300, canvas?: HTMLCanvasElement) {
  const c = canvas ?? document.createElement('canvas')

  c.style.width = `${width}px`
  c.style.height = `${height}px`

  const dpr = window.devicePixelRatio ?? 1

  c.width = Math.floor(dpr * width)
  c.height = Math.floor(dpr * height)

  c.getContext('2d')!.scale(dpr, dpr)

  return c
}
function test() {
  // 台面内尺寸 2540mm × 1270mm （≈8.33英尺 × 4.17英尺）
  // 外框尺寸 2830mm × 1550mm 含库边宽度（通常单边库宽≈15cm）
  // 高度 850mm ± 10mm 地面到台面高度
  const scale = 2 / 10

  const outerWidth = 2830 * scale
  const outerHeight = 1550 * scale
  const tableWidth = 2540 * scale
  const tableHeight = 1270 * scale

  // 橡胶条核心：5~8厘米（提供弹性反弹）。
  // 木质支撑层：3~5厘米（稳定结构）。
  // 外包台呢：1~2厘米（与台面同材质覆盖）。
  const rubberWidth = 70 * scale
  const woodWidth = 40 * scale
  const clothWidth = 15 * scale

  // 中袋直径 90
  // 角袋直径 85
  // 球直径 57.15
  const middlePocketRadius = 90 * scale / 2
  const cornerPocketRadius = getConnerPocketRadius(85, rubberWidth) * scale
  const ballRadius = 57.15 * scale / 2

  const withWoodWidth = tableWidth + woodWidth * 2
  const withWoodHeight = tableHeight + woodWidth * 2

  const PARAMETERS = {
    /** 台面内尺寸 */
    tableWidth: 25.4,
    /** 台面高度 */
    tableHeight: 12.7,
    /** 木质支撑层尺寸 */
    woodWidth: 4,
    /** 外包台呢尺寸 */
    clothWidth: 1.5,
    /** 橡胶条尺寸 */
    rubberWidth: 7,
    /** 中袋半径 */
    middlePocketRadius: 4.5,
    /** 角袋半径 */
    cornerPocketRadius: 4.25,
    /** 球半径 */
    ballRadius: 2.8575,
    /** 台面外框宽度 */
    get withWoodWidth() {
      return this.tableWidth + this.woodWidth * 2
    },
    get withWoodHeight() {
      return this.tableHeight + this.woodWidth * 2
    },

    get outerWidth() {
      return this.tableWidth + this.rubberWidth * 2 + this.woodWidth * 2 + this.clothWidth * 2
    },
    get outerHeight() {
      return this.tableHeight + this.rubberWidth * 2 + this.woodWidth * 2 + this.clothWidth * 2
    },
  }

  const canvas = createCanvas(outerWidth, outerHeight, document.querySelector('#main-canvas') as HTMLCanvasElement)
  const ctx = canvas.getContext('2d')!

  ctx.save()
  ctx.translate(outerWidth / 2, outerHeight / 2)

  function drawTable() {
    ctx.beginPath()
    ctx.rect(-tableWidth / 2, -tableHeight / 2, tableWidth, tableHeight)
    ctx.stroke()
  }
  drawTable()

  // 橡胶条
  function drawRubber() {
    // ctx.beginPath()
    // ctx.strokeStyle = 'green'
    // const width = tableWidth - rubberWidth * 2
    // const height = tableHeight - rubberWidth * 2
    // ctx.rect(-width / 2, -height / 2, width, height)
    // ctx.stroke()

    createRubber()
  }
  drawRubber()

  function drawWood() {
    // ctx.beginPath()
    // ctx.strokeStyle = 'brown'
    // const width = tableWidth + woodWidth * 2
    // const height = tableHeight + woodWidth * 2
    // ctx.rect(-width / 2, -height / 2, width, height)
    // ctx.stroke()

    const horizontalPositions = [
      { x: -withWoodWidth / 2 + cornerPocketRadius * 2, y: -withWoodHeight / 2 },
      { x: middlePocketRadius, y: -withWoodHeight / 2 },
      { x: -withWoodWidth / 2 + cornerPocketRadius * 2, y: withWoodHeight / 2 - woodWidth },
      { x: middlePocketRadius, y: withWoodHeight / 2 - woodWidth },
    ]

    horizontalPositions.forEach(({ x, y }) => {
      const width = withWoodWidth / 2 - cornerPocketRadius * 2 - middlePocketRadius
      const height = woodWidth

      ctx.beginPath()
      ctx.strokeStyle = 'brown'
      ctx.rect(x, y, width, height)
      ctx.stroke()
    })

    const verticalPositions = [
      { x: -withWoodWidth / 2, y: -withWoodHeight / 2 + cornerPocketRadius * 2 },
      { x: withWoodWidth / 2 - woodWidth, y: -withWoodHeight / 2 + cornerPocketRadius * 2 },
    ]

    verticalPositions.forEach(({ x, y }) => {
      const width = woodWidth
      const height = withWoodHeight - cornerPocketRadius * 4

      ctx.beginPath()
      ctx.strokeStyle = 'brown'
      ctx.rect(x, y, width, height)
      ctx.stroke()
    })

    // 角袋包边
    const cornerPocketPositions = [
      { x: -withWoodWidth / 2 + cornerPocketRadius, y: -withWoodHeight / 2 + cornerPocketRadius },
      { x: withWoodWidth / 2 - cornerPocketRadius, y: -withWoodHeight / 2 + cornerPocketRadius },
      { x: -withWoodWidth / 2 + cornerPocketRadius, y: withWoodHeight / 2 - cornerPocketRadius },
      { x: withWoodWidth / 2 - cornerPocketRadius, y: withWoodHeight / 2 - cornerPocketRadius },
    ]

    cornerPocketPositions.forEach(({ x, y }, i) => {
      ctx.beginPath()
      ctx.strokeStyle = 'brown'
      switch (i) {
        case 0:
          ctx.arc(x, y, cornerPocketRadius, Math.PI / 2, Math.PI * 2, false)
          ctx.lineTo(x + cornerPocketRadius, y - cornerPocketRadius)
          ctx.lineTo(x - cornerPocketRadius, y - cornerPocketRadius)
          ctx.lineTo(x - cornerPocketRadius, y + cornerPocketRadius)
          ctx.closePath()
          break
        case 1:
          ctx.arc(x, y, cornerPocketRadius, Math.PI, Math.PI / 2, false)
          ctx.lineTo(x + cornerPocketRadius, y + cornerPocketRadius)
          ctx.lineTo(x + cornerPocketRadius, y - cornerPocketRadius)
          ctx.lineTo(x - cornerPocketRadius, y - cornerPocketRadius)
          ctx.closePath()
          break
        case 2:
          ctx.arc(x, y, cornerPocketRadius, Math.PI * 1.5, Math.PI * 2, true)
          ctx.lineTo(x + cornerPocketRadius, y + cornerPocketRadius)
          ctx.lineTo(x - cornerPocketRadius, y + cornerPocketRadius)
          ctx.lineTo(x - cornerPocketRadius, y - cornerPocketRadius)
          ctx.closePath()
          break
        case 3:
          ctx.arc(x, y, cornerPocketRadius, Math.PI * 1.5, Math.PI, false)
          ctx.lineTo(x - cornerPocketRadius, y + cornerPocketRadius)
          ctx.lineTo(x + cornerPocketRadius, y + cornerPocketRadius)
          ctx.lineTo(x + cornerPocketRadius, y - cornerPocketRadius)
          ctx.closePath()
          break
      }
      ctx.stroke()
    })

    const middlePocketPositions = [
      { x: 0, y: -withWoodHeight / 2 + middlePocketRadius },
      { x: 0, y: withWoodHeight / 2 - middlePocketRadius },
    ]

    middlePocketPositions.forEach(({ x, y }, i) => {
      ctx.beginPath()
      ctx.strokeStyle = 'brown'
      switch (i) {
        case 0:
          ctx.arc(x, y, middlePocketRadius, Math.PI, Math.PI * 2)
          ctx.lineTo(x + middlePocketRadius, y - middlePocketRadius)
          ctx.lineTo(x - middlePocketRadius, y - middlePocketRadius)
          ctx.closePath()
          break
        case 1:
          ctx.arc(x, y, middlePocketRadius, Math.PI, Math.PI * 2, true)
          ctx.lineTo(x + middlePocketRadius, y + middlePocketRadius)
          ctx.lineTo(x - middlePocketRadius, y + middlePocketRadius)
          ctx.closePath()
          break
      }
      ctx.stroke()
    })
  }
  drawWood()

  function drawCloth() {
    ctx.beginPath()
    ctx.strokeStyle = 'gray'
    const width = tableWidth + woodWidth * 2 + clothWidth * 2
    const height = tableHeight + woodWidth * 2 + clothWidth * 2
    ctx.rect(-width / 2, -height / 2, width, height)
    ctx.stroke()
  }
  drawCloth()

  function drawBall() {
    ctx.beginPath()
    ctx.fillStyle = 'black'
    ctx.arc(0, 0 - tableHeight / 2 + rubberWidth, ballRadius, 0, Math.PI * 2)
    ctx.fill()
  }
  drawBall()

  function drawMiddlePocket() {
    const pos = [
      { x: 0, y: -withWoodHeight / 2 + middlePocketRadius },
      { x: 0, y: withWoodHeight / 2 - middlePocketRadius },
    ]

    pos.forEach(({ x, y }) => {
      ctx.beginPath()
      ctx.strokeStyle = 'blue'
      ctx.arc(x, y, middlePocketRadius, 0, Math.PI * 2)
      ctx.stroke()
    })
  }
  // drawMiddlePocket()

  function drawCornerPocket() {
    const pos = [
      { x: -withWoodWidth / 2 + cornerPocketRadius, y: -withWoodHeight / 2 + cornerPocketRadius },
      { x: withWoodWidth / 2 - cornerPocketRadius, y: -withWoodHeight / 2 + cornerPocketRadius },
      { x: -withWoodWidth / 2 + cornerPocketRadius, y: withWoodHeight / 2 - cornerPocketRadius },
      { x: withWoodWidth / 2 - cornerPocketRadius, y: withWoodHeight / 2 - cornerPocketRadius },
    ]

    pos.forEach(({ x, y }) => {
      ctx.beginPath()
      ctx.strokeStyle = 'blue'
      ctx.arc(x, y, cornerPocketRadius, 0, Math.PI * 2)
      ctx.stroke()
    })
  }
  // drawCornerPocket()

  function createRubber() {
    const horizontalPositions = [
      { x: -withWoodWidth / 2 + cornerPocketRadius * 2 + rubberWidth, y: -tableHeight / 2 },
      { x: middlePocketRadius + rubberWidth, y: -tableHeight / 2 },
      { x: -withWoodWidth / 2 + cornerPocketRadius * 2 + rubberWidth, y: tableHeight / 2 - rubberWidth },
      { x: middlePocketRadius + rubberWidth, y: tableHeight / 2 - rubberWidth },
    ]
    // 左上
    horizontalPositions.forEach(({ x, y }, i) => {
      ctx.save()

      const width = withWoodWidth / 2 - cornerPocketRadius * 2 - middlePocketRadius - rubberWidth * 2
      const height = rubberWidth

      ctx.beginPath()
      ctx.strokeStyle = 'green'
      ctx.rect(x, y, width, height)
      ctx.stroke()

      if (i < 2) {
        ctx.beginPath()
        ctx.arc(x, y, rubberWidth, Math.PI, Math.PI / 2, true)
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(x + width, y, rubberWidth, Math.PI / 2, 0, true)
        ctx.stroke()
      }
      else {
        ctx.beginPath()
        ctx.arc(x, y + rubberWidth, rubberWidth, Math.PI, Math.PI * 1.5, false)
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(x + width, y + rubberWidth, rubberWidth, Math.PI * 1.5, 0, false)
        ctx.stroke()
      }

      ctx.restore()
    })

    const verticalPositions = [
      { x: -tableWidth / 2, y: -withWoodHeight / 2 + cornerPocketRadius * 2 + rubberWidth },
      { x: tableWidth / 2 - rubberWidth, y: -withWoodHeight / 2 + cornerPocketRadius * 2 + rubberWidth },
    ]
    verticalPositions.forEach(({ x, y }, i) => {
      ctx.save()

      const width = rubberWidth
      const height = withWoodHeight - cornerPocketRadius * 4 - rubberWidth * 2

      ctx.beginPath()
      ctx.strokeStyle = 'green'
      ctx.rect(x, y, width, height)
      ctx.stroke()
      ctx.restore()

      if (i === 0) {
        ctx.beginPath()
        ctx.strokeStyle = 'green'
        ctx.arc(x, y, rubberWidth, Math.PI * 1.5, 0, false)
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(x, y + height, rubberWidth, Math.PI / 2, 0, true)
        ctx.stroke()
      }
      else {
        ctx.beginPath()
        ctx.strokeStyle = 'green'
        ctx.arc(x + width, y, rubberWidth, Math.PI, Math.PI * 1.5, false)
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(x + width, y + height, rubberWidth, Math.PI / 2, Math.PI, false)
        ctx.stroke()
      }
    })
  }

  ctx.restore()
}

// test()
