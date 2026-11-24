import type { Lifetime } from 'earshot'

declare const worker: { ask(): Promise<string> }

export class Drafts {
  private life: Lifetime | null = null

  async bare(life: Lifetime) {
    await worker.ask()
    await life.guard(worker.ask())
  }

  async rebound() {
    const life = this.life
    if (!life) return
    await life.guard(worker.ask())
    await this.life?.guard(worker.ask())
  }

  async chained(life: Lifetime) {
    await life.guard(worker.ask().then(() => worker.ask()))
  }

  async each(life: Lifetime, asks: AsyncIterable<string>) {
    for await (const answer of asks) void [life, answer]
  }

  async safe() {
    const life = this.life
    if (!life) return
    await life.guard(worker.ask())
    await life.guard(worker.ask())
  }

  later(life: Lifetime, work: Promise<void>, write: () => void) {
    void life
    return work.then(() => write())
  }

  async unowned() {
    await worker.ask()
  }
}
