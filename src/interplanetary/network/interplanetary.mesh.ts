// src/interplanetary/network/interplanetary.mesh.ts

export interface PlanetaryNode {
  id: string
  planet: string
  latencyIndex: number
  autonomyLevel: number
}

export class InterplanetaryMesh {
  private nodes: PlanetaryNode[] = []

  register(node: PlanetaryNode) {
    this.nodes.push(node)
  }

  routeDecision(targetPlanet: string) {
    const candidates = this.nodes.filter(
      n => n.planet === targetPlanet
    )

    return candidates.sort(
      (a, b) =>
        b.autonomyLevel - a.autonomyLevel -
        (a.latencyIndex - b.latencyIndex)
    )[0]
  }

  synchronize() {
    return this.nodes.map(n => ({
      id: n.id,
      planet: n.planet,
      status: "synchronized"
    }))
  }
}
