// src/infrastructure/datalake/data.mesh.ts

import Redis from "ioredis"

export class DataLakeMesh {
  private redis: Redis

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl)
  }

  async registerNode(nodeId: string, datasets: string[]) {
    await this.redis.hset(
      "data_mesh:nodes",
      nodeId,
      JSON.stringify(datasets)
    )
  }

  async findDataset(dataset: string) {
    const nodes = await this.redis.hgetall(
      "data_mesh:nodes"
    )

    for (const [node, sets] of Object.entries(nodes)) {
      const list = JSON.parse(sets as string)
      if (list.includes(dataset)) return node
    }

    return null
  }
}
