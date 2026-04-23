/**
 * Traços no-op por defeito — evita dependência obrigatória de OpenTelemetry em desenvolvimento.
 * Substituir por SDK real quando `OTEL_ENABLED=true` e pacotes estiverem instalados.
 */
type Span = {
  setAttribute(_key: string, _value: string | number): void
  setStatus(_status: { code: number; message?: string }): void
  recordException(_err: unknown): void
  end(): void
}

const noopSpan: Span = {
  setAttribute() {},
  setStatus() {},
  recordException() {},
  end() {}
}

export const tracer = {
  startSpan(_name: string): Span {
    return noopSpan
  }
}
