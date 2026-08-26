declare module 'bible-passage-reference-parser/cjs/es_bcv_parser.js' {
  interface BcvPoint {
    b: string
    c: number
    v: number
  }

  interface BcvEntity {
    start?: BcvPoint
    end?: BcvPoint
    entities?: BcvEntity[]
  }

  interface BcvResult {
    osis(): string
    parsed_entities(): BcvEntity[]
  }

  export class bcv_parser {
    constructor(language?: unknown)
    parse(text: string): BcvResult
  }
}
