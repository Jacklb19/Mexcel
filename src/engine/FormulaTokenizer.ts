/**
 * FormulaTokenizer — Converts a formula string into a stream of tokens.
 *
 * Supports: cell references (A1-ZZ9999), numbers, operators (+,-,*,/),
 * parentheses, function names, commas, colons (ranges), comparison operators,
 * and string literals.
 */

export type TokenType =
  | 'NUMBER'
  | 'CELL_REF'
  | 'OPERATOR'
  | 'PAREN_OPEN'
  | 'PAREN_CLOSE'
  | 'FUNCTION_NAME'
  | 'COMMA'
  | 'COLON'
  | 'STRING'
  | 'COMPARISON'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

const FUNCTIONS = new Set([
  'SUM', 'AVERAGE', 'AVG', 'MAX', 'MIN', 'COUNT', 'IF',
  'ABS', 'ROUND', 'INT', 'MOD', 'POWER', 'SQRT',
]);

const CELL_REF_REGEX = /^[A-Z]{1,3}[0-9]{1,5}$/;

export class FormulaTokenizer {
  private readonly _input: string;
  private _pos: number;
  private _tokens: Token[];

  constructor(input: string) {
    // Remove leading '=' if present
    this._input = input.startsWith('=') ? input.substring(1) : input;
    this._pos = 0;
    this._tokens = [];
  }

  /**
   * Tokenize the entire input and return an array of tokens.
   */
  tokenize(): Token[] {
    this._pos = 0;
    this._tokens = [];

    while (this._pos < this._input.length) {
      this.skipWhitespace();
      if (this._pos >= this._input.length) break;

      const ch = this._input[this._pos];

      if (ch === '"') {
        this.readString();
      } else if (this.isDigit(ch) || (ch === '.' && this.isDigit(this.peek(1)))) {
        this.readNumber();
      } else if (this.isAlpha(ch)) {
        this.readIdentifier();
      } else if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
        this._tokens.push({ type: 'OPERATOR', value: ch, position: this._pos });
        this._pos++;
      } else if (ch === '(') {
        this._tokens.push({ type: 'PAREN_OPEN', value: ch, position: this._pos });
        this._pos++;
      } else if (ch === ')') {
        this._tokens.push({ type: 'PAREN_CLOSE', value: ch, position: this._pos });
        this._pos++;
      } else if (ch === ',') {
        this._tokens.push({ type: 'COMMA', value: ch, position: this._pos });
        this._pos++;
      } else if (ch === ':') {
        this._tokens.push({ type: 'COLON', value: ch, position: this._pos });
        this._pos++;
      } else if (ch === '<' || ch === '>' || ch === '=') {
        this.readComparison();
      } else {
        // Skip unknown characters
        this._pos++;
      }
    }

    this._tokens.push({ type: 'EOF', value: '', position: this._pos });
    return this._tokens;
  }

  private skipWhitespace(): void {
    while (this._pos < this._input.length && this._input[this._pos] === ' ') {
      this._pos++;
    }
  }

  private isDigit(ch: string | undefined): boolean {
    if (!ch) return false;
    return ch >= '0' && ch <= '9';
  }

  private isAlpha(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  private isAlphaNumeric(ch: string): boolean {
    return this.isAlpha(ch) || this.isDigit(ch);
  }

  private peek(offset: number = 0): string | undefined {
    return this._input[this._pos + offset];
  }

  private readNumber(): void {
    const start = this._pos;
    let hasDecimal = false;

    while (this._pos < this._input.length) {
      const ch = this._input[this._pos];
      if (this.isDigit(ch)) {
        this._pos++;
      } else if (ch === '.' && !hasDecimal) {
        hasDecimal = true;
        this._pos++;
      } else {
        break;
      }
    }

    this._tokens.push({
      type: 'NUMBER',
      value: this._input.substring(start, this._pos),
      position: start,
    });
  }

  private readString(): void {
    const start = this._pos;
    this._pos++; // skip opening quote

    while (this._pos < this._input.length && this._input[this._pos] !== '"') {
      this._pos++;
    }

    if (this._pos < this._input.length) {
      this._pos++; // skip closing quote
    }

    // Value excludes the quotes
    this._tokens.push({
      type: 'STRING',
      value: this._input.substring(start + 1, this._pos - 1),
      position: start,
    });
  }

  private readIdentifier(): void {
    const start = this._pos;

    while (this._pos < this._input.length && this.isAlphaNumeric(this._input[this._pos])) {
      this._pos++;
    }

    const value = this._input.substring(start, this._pos).toUpperCase();

    // Check if it's a function name followed by '('
    if (FUNCTIONS.has(value) && this._pos < this._input.length && this._input[this._pos] === '(') {
      this._tokens.push({ type: 'FUNCTION_NAME', value, position: start });
    } else if (CELL_REF_REGEX.test(value)) {
      this._tokens.push({ type: 'CELL_REF', value, position: start });
    } else if (FUNCTIONS.has(value)) {
      // Function name without parens — still treat as function
      this._tokens.push({ type: 'FUNCTION_NAME', value, position: start });
    } else {
      // Treat unknown identifiers as cell references (they'll fail at eval time with #REF!)
      this._tokens.push({ type: 'CELL_REF', value, position: start });
    }
  }

  private readComparison(): void {
    const start = this._pos;
    let value = this._input[this._pos];
    this._pos++;

    if (this._pos < this._input.length) {
      const next = this._input[this._pos];
      if ((value === '<' && (next === '=' || next === '>')) || (value === '>' && next === '=')) {
        value += next;
        this._pos++;
      }
    }

    this._tokens.push({ type: 'COMPARISON', value, position: start });
  }
}
