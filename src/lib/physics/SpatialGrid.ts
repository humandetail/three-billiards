import type { Ball } from './PhysicsSystem'

export const SPATIAL_GRID_SIZE = 0.6 // 网格大小
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
