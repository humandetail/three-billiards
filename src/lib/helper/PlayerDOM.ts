import type Player from '../../central-control/Player'

interface PlayerElements {
  avatar: HTMLElement
  name: HTMLElement
  score: HTMLElement
  targetBalls: HTMLElement
  container: HTMLElement
  clock: HTMLElement
}

export default class PlayerDOM {
  private container: HTMLElement

  private elements = new Map<string, PlayerElements>()

  private keys = new Map<string, 'player1' | 'player2'>()

  constructor() {
    this.container = document.querySelector<HTMLElement>('#players-container')!
    this.init()
  }

  private init() {
    this.container.innerHTML = Array.from({ length: 2 }).reduce((acc, _, index) => {
      return `${acc}
        <section class="player" id="player-${index + 1}">
          <div class="player-info">
            <div class="player-avatar" id="player-${index + 1}-avatar">
              <div class="player-clock" id="player-${index + 1}-clock"></div>
            </div>
            <div class="player-name" id="player-${index + 1}-name"></div>
            <div class="player-score" id="player-${index + 1}-score"></div>
          </div>
          <ul class="target-balls" id="player-${index + 1}-target-balls">
            ${Array.from({ length: 7 }).map(() => {
              return `
                <li class="target-ball"></li>
              `
            }).join('')}
          </ul>
        </section>
      `
    }, '') as string

    this.elements.set('player1', {
      avatar: document.querySelector<HTMLElement>('#player-1-avatar')!,
      name: document.querySelector<HTMLElement>('#player-1-name')!,
      score: document.querySelector<HTMLElement>('#player-1-score')!,
      targetBalls: document.querySelector<HTMLElement>('#player-1-target-balls')!,
      container: document.querySelector<HTMLElement>('#player-1')!,
      clock: document.querySelector<HTMLElement>('#player-1-clock')!,
    })

    this.elements.set('player2', {
      avatar: document.querySelector<HTMLElement>('#player-2-avatar')!,
      name: document.querySelector<HTMLElement>('#player-2-name')!,
      score: document.querySelector<HTMLElement>('#player-2-score')!,
      targetBalls: document.querySelector<HTMLElement>('#player-2-target-balls')!,
      container: document.querySelector<HTMLElement>('#player-2')!,
      clock: document.querySelector<HTMLElement>('#player-2-clock')!,
    })
  }

  bind(index: number, id: string) {
    switch (index) {
      case 1:
        this.keys.set(id, 'player1')
        break
      case 2:
        this.keys.set(id, 'player2')
        break
    }
  }

  set(playerId: string, key: keyof PlayerElements, value: string | number) {
    const player = this.keys.get(playerId)
    if (!player) {
      throw new Error(`Player ${playerId} not found`)
    }
    const el = this.elements.get(player)![key]
    if (!el) {
      throw new Error(`Element ${key} not found`)
    }
    el.textContent = value.toString()
  }

  setActive(playerId: string) {
    const player = this.keys.get(playerId)
    if (!player) {
      throw new Error(`Player ${playerId} not found`)
    }
    const el = this.elements.get(player)!.container
    el.classList.add('active')

    this.removeActive([...this.elements.keys()].filter(key => key !== player)[0])
  }

  removeActive(playerId: string) {
    const player = this.keys.get(playerId)
    if (!player) {
      throw new Error(`Player ${playerId} not found`)
    }
    this.elements.get(player)!.container.classList.remove('active')
  }

  setPercentage(playerId: string, percentage: number) {
    const player = this.keys.get(playerId)
    if (!player) {
      throw new Error(`Player ${playerId} not found`)
    }
    this.elements.get(player)!.container.style.setProperty('--percentage', `${percentage}%`)
  }

  setRestTime(playerId: string, restTime: number) {
    const player = this.keys.get(playerId)
    if (!player) {
      throw new Error(`Player ${playerId} not found`)
    }
    const el = this.elements.get(player)!.clock
    el.textContent = restTime <= 0 ? '' : `${Math.round(restTime)}`
    el.style.visibility = restTime <= 0 ? 'hidden' : 'visible'
  }

  setTargetBalls(player: Player) {
    const key = this.keys.get(player.id)
    if (!key) {
      throw new Error(`Player ${player.id} not found`)
    }

    let innerHTML = `${player.targetBalls.map((name) => {
      return `
        <li class="target-ball" data-id="${name}"></li>
      `
    }).join('')}`

    const diff = 7 - player.targetBalls.length
    for (let i = 0; i < diff; i++) {
      innerHTML += '<li class="target-ball"></li>'
    }

    this.elements.get(key)!.targetBalls.innerHTML = innerHTML
  }
}
