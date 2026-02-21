import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node"
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base"
import { trace } from "@opentelemetry/api"

const provider = new NodeTracerProvider()
provider.addSpanProcessor(
  new SimpleSpanProcessor(new ConsoleSpanExporter())
)
provider.register()

export const tracer = trace.getTracer("aip-core")
