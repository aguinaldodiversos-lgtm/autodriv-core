/**
 * Tipos da instância unica (implementação em `localAI.service.js` apenas).
 * Nao duplique a logica de pipeline aqui.
 */

export type LocalAIClassificationToken = {
  label: string;
  score: number;
};

type LocalAIPublic = {
  init(): Promise<void>;
  classify(
    text: string,
    timeout?: number
  ): Promise<LocalAIClassificationToken[]>;
  embed(text: string, timeout?: number): Promise<unknown>;
};

declare const localAI: LocalAIPublic;
export = localAI;
