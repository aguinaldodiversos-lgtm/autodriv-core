export abstract class BaseRepository<T> {
  constructor(protected db: DatabaseClient) {}

  abstract save(entity: T): Promise<void>
  abstract findById(id: string): Promise<T | null>
}
