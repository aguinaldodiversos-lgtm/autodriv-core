import { bootstrap } from "@/app/bootstrap"
import { logger } from "@/infrastructure/logger/logger"

async function startWorker() {

  const app = await bootstrap(process.env)

  logger.info("🧠 Event Worker started")

  // Aqui futuramente conectar fila Redis/Kafka

}

startWorker()
