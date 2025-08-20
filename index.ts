type ValidationResult<T> = { success: true; value: T } | { success: false; error: string[] };
type CheckResult<T> = {status: "RETURN", value: ValidationResult<T>} | {status: "CONTINUE", value: unknown} 


export class Validator {
  static readonly _version = "0.2.0";

  /**
   * Creates a StringSchema to validate string values.
   * Can be chainend with methods like min, max, length, email, etc. to define constraints.
   *
   * @returns A StringSchema instance for string validation.
   * @example
   * const schema = v.string().min(5).max(20).email();
   *
   * result = schema.validate("mail@tld.com")
   * // result = { success: true, value: "mail@tld.com" }
   * // value is typed as string
   */
  static string() {
    return new StringSchema();
  }

  /**
   * Creates a NumberSchema to validate number values.
   * Can be chained with methods like int, positive, negative, min, max, etc. to define constraints.
   *
   * @returns A NumberSchema instance for number validation.
   * @example
   * const schema = v.number().positive().int().min(0).max(100);
   * result = schema.validate(50);
   * // result = { success: true, value: 50 }
   * // value is typed as number
   */
  static number() {
    return new NumberSchema();
  }

  /**
   * Creates a BooleanSchema to validate boolean values.
   * Can be chained with methods like truthy, falsy, etc. to define constraints.
   *
   * @returns A BooleanSchema instance for boolean validation.
   * @example
   * const schema = v.boolean().truthy();
   * result = schema.validate(1);
   * // result = { success: true, value: true }
   * // value is typed as boolean
   */
  static boolean() {
    return new BooleanSchema();
  }

  /**
   * Creates a DateSchema to validate date values.
   * can be chained with methods like before, after, etc. to define constraints.
   *
   * @returns A DateSchema instance for date validation.
   * @example
   * const schema = v.date().before('2024-01-01').after('2023-01-01');
   * result = schema.validate('2023-12-31');
   */
  static date() {
    return new DateSchema();
  }
  
  /**
   * Creates a LiteralSchema to validate if the value is equal to the provided literal value.
   *
   * @param value - The literal value to be validated against.
   * @returns A LiteralSchema instance for literal validation.
   * @example
   * const schema = v.literal("Hello World");
   * result = schema.validate("Hello World");
   * // result = { success: true, value: "Hello World" }
   * // value is typed as string
   */
  static literal<const T>(value: T) {
    return new LiteralSchema(value);
  }

  /**
   * Creates an EnumSchema to validate if the value matches one of the defined enum values.
   *
   * @param enumValues - The array of valid enum values.
   * @returns An EnumSchema instance for enum validation.
   * @example
   * const schema = v.enum(["A", "B", "C"]);
   * result = schema.validate("B");
   * // result = { success: true, value: "B" }
   * // value is typed as "A" | "B" | "C"
   */
  static enum<const T extends string | number>(enumValues: T[] = []) {
    return new EnumSchema(enumValues);
  }

  /**
   * Creates an ArraySchema to validate arrays with a defined element schema.
   *
   * @param schema - The schema to be used for validating each element in the array.
   * @returns An ArraySchema instance for array validation.
   * @example
   * const notesArray = v.array(v.object({
   *  title: v.string().max(32),
   *  content: v.string()
   * }));
   * result = notesArray.validate([
   *  { title: "soft egg recipe", content: "cook egg for 3 minutes in boiling water" }]);
   * // result = { success: true, value: [{ title: "soft egg recipe", content: "cook egg for 3 minutes in boiling water" }] }
   * // value is typed as { title: string; content: string; }[]
   */
  static array<T>(schema: Schema<T>) {
    return new ArraySchema(schema);
  }

  /**
   * Creates an ObjectSchema to validate objects with a defined shape.
   *
   * @param shape - An object defining the expected shape of the object to be validated.
   * @returns An ObjectSchema instance for object validation.
   * @example
   * const UserSchema = v.object({
   *   name: v.string(),
   *   age: v.number().positive().int(),
   * });
   * result = UserSchema.validate({ name: "John", age: 30 });
   * // result = { success: true, value: { name: "John", age: 30 } }
   * // value is typed as { name: string; age: number; }
   */
  static object<T extends Record<string, Schema<any>>>(shape: T): ObjectSchema<T> {
    return new ObjectSchema(shape);
  }
}

// #region Schema<T>
abstract class Schema<T> {
  protected _nullable: boolean = false;
  protected _nullish: boolean = false;
  protected _prefault: boolean = false;
  protected _default: boolean = false;
  protected _defaultValue!: T;
  protected _catch: boolean = false;
   _isOptional: boolean = false;

  /**
   * Sets the schema to strictly allow null values.  
   * *Note: strictNullChecks are required in tsconfig to show union types with Null*  
   * 
   * @returns the current schema with a widened type to include null.
   */
  nullable(): Schema<T | null> {
    this._nullable = true;
    return this as Schema<T | null>;
  }

  /**
   * Sets the schema to allow nullish values (null or undefined).  
   * *Note: strictNullChecks are required in tsconfig to show union types with Null*  
   * 
   * @returns the current schema with a widened type to include null.
   */
  nullish(): Schema<T | null> {
    this._nullish = true;
    return this as Schema<T | null>;
  }

  /**
   * Sets the schema to use a default value when a nullish value was provided for validation.
   * *Note:* use `catch()` to use the default value upon a failed validation.
   *
   * @param value the fallback value
   * @returns the current schema to allow method chaining
   */
  default(value: T): this {
    this._default = true;
    this._defaultValue = value;
    return this;
  }
  /**
   * Sets the schema to use a default value when the validation failed.
   * @name catch
   * @param value the fallback value
   * @returns the current schema to allow method chaining
   */
  catch(value: T): this {
    this._catch = true;
    this._defaultValue = value;
    return this;
  }
  defaultCatch = this.catch

  /**
   * Sets the schema to be optional meaning the value will be set to undefinded if the validation failed.
   * Within an object or array schema this will remove the optional elements alltogether.
   * @returns the current schema to allow method chaining
   */
  optional(): this {
    this._isOptional = true;
    return this;
  }

  /**
   * internal function to act upon a null or undefinded given values
   */
  protected preValidationCheck(value: unknown): CheckResult<T>{
    if (value === null || value === undefined) {
      if (this._default) { // default() to act upon null or undefined values
        return { status: "RETURN", value: {success: true, value: this._defaultValue}};
      }
      if (this._nullish) {
        return { status: "RETURN", value: {success: true, value: null as any as T}};
      }
      if (this._nullable && value === null) {
        return { status: "RETURN", value: {success: true, value: null as any as T}};
      }
      if (this._catch) { // catch() to act upon failed validation, therefore nullish and nullable takes precedence
        return { status: "RETURN", value: {success: true, value: this._defaultValue }};
      }
      if (this._isOptional) return { status: "RETURN", value: {success: true, value: undefined as T }};
    }
    return { status: "CONTINUE", value: value };
  }
  /**
   * internal function to act upon a failed validation
   * either returns the error result or a success result with a default/undefined
   */
  protected postValidationCheck(result: ValidationResult<T>): ValidationResult<T> {
    if (result.success) return result;
    if (this._catch) return { success: true, value: this._defaultValue };
    if (this._isOptional) return { success: true, value: undefined as T };
    return result;
  }

  abstract validate(value: unknown): ValidationResult<T>;
}
// #endregion

// #region StringSchema
/**
 * A schema for validating string values with various constraints.
 *
 * This class provides methods to define validation rules for strings, such as
 * minimum/maximum length, exact length, email format, and base64 format. It also
 * includes a `validate` method to check if a given value satisfies the defined rules.
 */
export class StringSchema extends Schema<string> {
  private _coerce: boolean = false;
  private _min: number = NaN;
  private _max: number = NaN;
  private _length: number = NaN;
  private _email: boolean = false;
  private _base64: boolean = false;
  private _startsWith?: string
  private _endsWith?: string

  private _locale: string = "en-US";
  private _alpha: boolean = false;
  private _alphanumeric: boolean = false;
  private _numeric: boolean = false;
  private _ISO31661Alpha2: boolean = false;
  private _IBAN: boolean = false;
  private _BIC: boolean = false;
  private _postal: boolean = false;
  private _ipVersion: false | 4 | 6 = false;

  private _transformRules: {(param:string): string;}[] = [] 

  /**
   * Coerces the value into a String using the JS-built-in String() function
   * ***Note:** this will treat undefined or null as a literal string i.e. "null"*
   
   */
  coerce() {
    this._coerce = true;
    return this;
  }

  /**
   * Sets the minimum value for validation.
   *
   * @param value The minimum value to be set.
   */
  min(value: number) {
    if (isNaN(value)) throw new Error(`StringSchema Constraint Error: min(${value}) parameter is not a number`)
    this._min = value;
    return this;
  }
  /**
   * Sets the maximum value for validation.
   *
   * @param value The maximum value to be set.
   */
  max(value: number) {
    if (isNaN(value)) throw new Error(`StringSchema Constraint Error: max(${value}) parameter is not a number`)
    this._max = value;
    return this;
  }
  /**
   * Sets the exact length for validation.
   *
   * @param value The exact length to be set.
   */
  length(value: number) {
    if (isNaN(value)) throw new Error(`StringSchema Constraint Error: length(${value}) parameter is not a number`)

    this._length = value;
    return this;
  }
  /**
   * Sets the schema to validate only non-empty strings.  
   * **Note:** this will overwrite a minimum value of 0
   
   */
  nonEmpty() {
    if (isNaN(this._min) || this._min === 0) this._min = 1;
    return this;
  }
  /**
   * Sets the schema to validate if a string starts with the given value.
   *
   * @param value The value that the string should start with.
   * @returns The current schema to allow method chaining.
   */
  startsWith(value: string) {
    if (typeof value !== "string") throw new Error(`StringSchema Constraint Error: startsWith(${value}) parameter is not a string`)
    this._startsWith = value;
    return this;
  }

  /**
   * Sets the schema to validate if a string ends with the given value.
   *
   * @param value The value that the string should end with.
   * @returns The current schema to allow method chaining.
   */
  endsWith(value: string) {
    if (typeof value !== "string") throw new Error(`StringSchema Constraint Error: endsWith(${value}) parameter is not a string`)
    this._endsWith = value;
    return this;
  }
  /**
   * Sets the schema to validate an alphabetic string.
   * use alpha("de-DE") to allow german umlaut during validation
   * @param locale The locale to be used for validation.
   */
  alpha(locale: keyof typeof alpha = "en-US") {
    this._alpha = true;
    this._locale = locale;
    return this;
  }

  /**
   * Sets the schema to validate an alphanumeric string.
   * use alphanumeric("de-DE") to allow german umlaut during validation
   * @param locale The locale to be used for validation.
   */
  alphanumeric(locale: keyof typeof alphanumeric = "en-US") {
    this._alphanumeric = true;
    this._locale = locale;
    return this;
  }

  /**
   * Sets the schema to validate an numeric string.
   */
  numeric() {
    this._numeric = true;
    return this;
  }
/**
   * Sets the schema to validate email format.
   
   */
  email() {
    this._email = true;
    return this;
  }
  /**
   * Sets the schema to validate base64 format.  
   * **Note:** Empty strings are valid base64 and in compliance with rfc4648.  
   * Use base64().NonEmpty() instead where applicable
   */
  base64() {
    this._base64 = true;
    return this;
  }
  /**
   * Sets the schema to validate a postal code.
   * This will validate for the german postal codes by default
   * For available patterns see: {@link https://github.com/validatorjs/validator.js/blob/master/src/lib/isPostalCode.js}
   * @param locale the ISO 3166-1 alpha-2 country code to be used for validation.
   */
  postal(locale: keyof typeof postal = "DE") {
    this._postal = true;
    this._locale = locale;
    return this;
  }

  /**
   * Sets the schema to validate an ISO 3166-1 alpha-2 country code.
   */
  ISO31661Alpha2() {
    this._ISO31661Alpha2 = true;
    return this;
  }

  /**
   * Sets the schema to validate an IBAN.
   * @param locale the ISO 3166-1 alpha-2 country code to be used for validation.
   */
  IBAN(locale: keyof typeof ibanRegexThroughCountryCode = "DE") {
    this._IBAN = true;
    this._locale = locale;
    return this;
  }

  /**
   * Sets the schema to validate a BIC.
   */
  BIC() {
    this._BIC = true;
    return this;
  }

  ip(version: 4 | 6 = 4) {
    this._ipVersion = version;
    return this;
  }

  /**
   * Adds a custom transformation function to the schema.  
   * The function will be applied right after a basic js type validation/coercion but before all other validation.  
   * The function should expect a string as parameter and return a string.
   *
   * @param transformFn The transformation function to be applied.
   * @returns The current schema to allow method chaining.
   * @throws Error if the provided parameter is not a function.
   */
  transform(transformFn: {(param:string): string;}) {
    if (typeof transformFn !== "function") {
      throw new Error(`StringSchema Transform Error: transform() parameter must be a function`);
    }
    this._transformRules.push(transformFn);
    return this;
  }
  /// Transform methods
  /**
   * Sets the schema to trim whitespace from the start and end of the string.  
   * This will be applied after a basic type validation/coercion but before any other validation.
   */
  trim() {
    this._transformRules.push( (value):string => {
      if (typeof value === "string") {
        return value.trim();
      } else {
        throw new Error(`StringSchema Transform Error: trim() can only be applied to string values`);
      }
    });
    return this;
  }
  /**
   * Sets the schema to lowercase the string.  
   * This will be applied after a basic type validation/coercion but before any other validation.
   */
  toLowerCase() {
    this._transformRules.push( (value):string => {
      if (typeof value === "string") {
        return value.toLowerCase();
      } else {
        throw new Error(`StringSchema Transform Error: toLowerCase() can only be applied to string values`);
      }
    });
    return this;
  }

  toUpperCase() {
    this._transformRules.push( (value):string => {
      if (typeof value === "string") {
        return value.toUpperCase()
      } else {
        throw new Error(`StringSchema Transform Error: toUpperCase() can only be applied to string values`);
      }
    });
    return this;
  }

  capitalized() {
    this._transformRules.push( (value):string => {
      if (typeof value === "string") {
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
      } else {
        throw new Error(`StringSchema Transform Error: capitalized() can only be applied to string values`);
      }
    });
    return this;
  }

  /** MARK: StringValidation
   * Validates the given value against the defined string constraints.
   *
   * @param value The value to be validated.
   * @returns An object containing the validation result and the validated value or error messages.
   * @example
   * const schema = new StringSchema().min(5).max(20).email();
   *
   * result = schema.validate("mail@tld.com")
   * // result = { success: true, value: "mail@tld.com" }
   * // value is typed as string
   */
  validate(value: unknown): ValidationResult<string> {
    const preValidationResult = this.preValidationCheck(value);
    if (preValidationResult.status === "RETURN") return preValidationResult.value;
    else {value = preValidationResult.value}

    const givenValue = value
    if (this._coerce) {
      value = String(value);
      if (value === "[object Object]") {
        return this.postValidationCheck({
          success: false,
          error: [`must be a string, given was an object`],
        });
      }
    }

    if (typeof value !== "string") {
      return this.postValidationCheck({
        success: false,
        error: [`must be a string, given was ${typeof givenValue}`],
      });
    }
    
    ///transform the value before continuing with the validation
    if (this._transformRules.length > 0) {
      for (const transform of this._transformRules) {
          <string>value == transform(value as string);
      }
    }

    if (!Number.isNaN(this._min) && value.length < this._min) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a string with ${this._min} or more characters, given was a length of ${value.length}`],
      });
    }
    if (!Number.isNaN(this._max) && value.length > this._max) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a string with ${this._max} or fewer characters, given was a length of ${value.length}`],
      });
    }
    if (!Number.isNaN(this._length) && value.length !== this._length) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a string with exactly ${this._length} characters, given was a length of ${value.length}`],
      });
    }

    if (this._startsWith && !value.startsWith(this._startsWith)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a string that starts with "${this._startsWith}". String started with "${value.slice(0,this._startsWith.length)}"`],
      });
    }

    if (this._endsWith && !value.endsWith(this._endsWith)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a string that ends with "${this._endsWith}". String ended with "${value.slice(-this._endsWith.length)}"`],
      });
    }

    //from zod/src/types.ts
    const emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
    if (this._email && !emailRegex.test(value)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a valid email address, given was ${givenValue}`],
      });
    }

    //from zod/src/types.ts
    const base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    if (this._base64 && !base64Regex.test(value)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a valid base64 string.`],
      });
    }

    if (this._alpha && !alpha[this._locale as keyof typeof alpha].test(value)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be an alphabetic string, given was ${givenValue}`],
      });
    }

    if (this._alphanumeric && !alphanumeric[this._locale as keyof typeof alphanumeric].test(value)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be an alphanumeric string, given was ${givenValue}`],
      });
    }

    const numericRegex = /^[0-9]+$/i;
    if (this._numeric && !numericRegex.test(value)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a numerical string, given was ${givenValue}`],
      });
    }

    if (this._postal && !postal[this._locale as keyof typeof postal].test(value)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a valid postal code, given was ${givenValue}`],
      });
    }

    if (this._ISO31661Alpha2 && !validISO31661Alpha2CountriesCodes.has(value)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a valid ISO 3166-1 alpha-2 country code, given was ${givenValue}`],
      });
    }

    if (this._IBAN && !ibanRegexThroughCountryCode[this._locale as keyof typeof ibanRegexThroughCountryCode].test(value)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a valid ${[this._locale]}-IBAN, given was ${givenValue}`],
      });
    }

    if (this._BIC && !isBICReg.test(value)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a valid BIC, given was ${value}`],
      });
    }

    if (this._ipVersion) {
      const ipRegex = this._ipVersion === 4 ? IPv4AddressRegExp : IPv6AddressRegExp;
      if (!ipRegex.test(value)) {
        return this.postValidationCheck({
          success: false,
          error: [`must be a valid IPv${this._ipVersion} address, given was ${givenValue}`],
        });
      }
    }

    return this.postValidationCheck({ success: true, value: value });
  }
}
// #endregion

// #region NumberSchema
/**
 * A schema for validating number values with various constraints.
 *
 * This class provides methods to define validation rules for numbers, such as
 * integer, positive, negative, minimum, and maximum values. It also includes a
 * `validate` method to check if a given value satisfies the defined rules.
 */
export class NumberSchema extends Schema<number> {
  private _coerce: boolean = false;
  private _transform: boolean = false;
  private _int: boolean = false;
  private _positive: boolean = false;
  private _negative: boolean = false;
  private _min: number = NaN;
  private _max: number = NaN;
  private _multipleOf: number = NaN;

  /**
   * Coerces the value into a Number using the JS-built-in Number() function  
   * ***Note:** this will treat null or boolean values as a numerical value*  
   */
  coerce() {
    this._coerce = true;
    return this;
  }

  /**
   * Allows the shemata to transform the given value to fit in the given constraints if possible.  
   * i.e. truncate floating points, clamp the number to min/max, or reverse the number sign  
   * @deprecated NYI
   */
  transform() {
    this._transform = true
    return this
  }

  /**
   * Sets the schema to validate integer values.
   */
  int() {
    this._int = true;
    return this;
  }

  /**
   * Sets the schema to validate positive (greater than 0) values.  
   * ***Careful:** Mathematicaly 0 is neither positive nor negative.  
   * Use `min(0)` for a non-negative validation.*  
   */
  positive() {
    this._positive = true;
    return this;
  }
  /**
   * Sets the schema to validate negative (less than 0) values.  
   * ***Careful:** Mathematicaly 0 is neither positive nor negative.  
   * Use `max(0)` for a non-positive validation.*  
   */
  negative() {
    this._negative = true;
    return this;
  }

  /**
   * Sets the minimum value for a *greater-than-equal* validation.
   *
   * @param value The minimum value to be set.
   */
  min(value: number) {
    if (isNaN(value)) throw new Error(`NumberSchema Constraint Error: min(${value}) parameter is not a number`)
    this._min = value;
    return this;
  }

  /**
   * Sets the maximum value for a *lower-than-equal* validation.
   *
   * @param value The maximum value to be set.
   */
  max(value: number) {
    if (isNaN(value)) throw new Error(`NumberSchema Constraint Error: max(${value}) parameter is not a number`)
    this._max = value;
    return this;
  }

  /**
   * Sets the schema to validate whether a number is a multiple of the given value
   * @param Of the Of-value which the validated number must be a multiple of
   * @returns 
   */
  multipleOf(Of: number) {
    if (isNaN(Of)) throw new Error(`NumberSchema Constraint Error: multipleOf(${Of}) parameter is not a number`)

    this._multipleOf = Of;
    return this;
  }
  step = this.multipleOf;

  /**
   * Validates the given value against the defined number constraints.
   *
   * @param value The value to be validated.
   * @returns An object containing the validation result and the validated value or error messages.
   * @example
   * const schema = v.number().positive().int().min(0).max(100);
   * result = schema.validate(50);
   * // result = { success: true, value: 50 }
   * // value is typed as number
   */
  validate(value: unknown): ValidationResult<number> {
    const preValidationResult = this.preValidationCheck(value);
    if (preValidationResult.status === "RETURN") return preValidationResult.value;
    else {value = preValidationResult.value}

    const givenValue = value
    if (this._coerce) {
      value = Number(value);
    }
    if (typeof value !== "number" || Number.isNaN(value)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a number, given was ${typeof givenValue}`],
      });
    }

    if (this._int && !Number.isInteger(value)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be an integer, given was ${givenValue}`],
      });
    }


    if (this._positive && !(value > 0)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a positive number, given was ${givenValue}`],
      });
    }
    if (this._negative && !(value < 0)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a negative number, given was ${givenValue}`],
      });
    }
    if (!Number.isNaN(this._min) && !(value >= this._min)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be greater than or equal ${this._min}, given was ${givenValue}`],
      });
    }
    if (!Number.isNaN(this._max) && !(value <= this._max)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be less than or equal ${this._max}, given was ${givenValue}`],
      });
    }
    //we check for truthy 
    if (this._multipleOf && !(value % this._multipleOf === 0)) {
      return this.postValidationCheck({
        success: false,
        error: [`must a multiple of ${this._multipleOf}, given was ${givenValue}`],
      });
    }
    return this.postValidationCheck({ success: true, value: value });
  }
}
// #endregion

// #region BooleanSchema
/**
 * A schema for validating boolean values with various constraints.
 *
 * 
 * This class provides methods to define validation rules for booleans, such as
 * strict, truthy, and falsy values. It also includes a `validate` method to check
 * if a given value satisfies the defined rules.
 *
 * The `boolish` method allows for coercion to boolean from string or number values that are often used with external APIs.
 */
export class BooleanSchema extends Schema<boolean> {
  private _coerce: boolean = false;
  private _truthy: boolean = false;
  private _falsy: boolean = false;
  private _useCustomCoercion: boolean = false;

  private _customCoercion = { 
      truthy: new Set(["true", "1", "yes", "on", "y", "enabled", "ja", "j", "wahr"]),
      falsy: new Set(["false","0", "no", "off", "n", "disabled", "nein", "falsch"])};
  /**
   * Sets the schema to coerce values to boolean using JS truthy/falsy rules.
   * use `boolish()` to use our custom coercion logic.
   */
  coerce() {
    this._coerce = true;
    return this;
  }

  /**
   * Sets the schema to coerce using our custom coercion logic.  
   * This will result in "true", "1", "yes", "on", "y", "enabled", "ja", "j", "wahr" to be coerced to true,  
   * while "false","0", "no", "off", "n", "disabled", "nein", "falsch" will be coerced to false.  
   *   
   * To customize the turthy and falsy values, use the `customCoercion` parameter.
   * The custom coercion is case-insensitive; all values are trimmed and lowercased.
   * 
   * @param customCoercion an object with two arrays of define custom truthy and falsy values
   * @example
   * const schema = v.boolean().boolish({
   *   truthy: ["true", "1", "yes", "on", "y", "enabled"],
   *   falsy: ["false", "0", "no", "off", "n", "disabled"],
   * });
   */
  boolish(customCoercion?: {truthy: string[], falsy: string[]}) {
    this._coerce = true;
    this._useCustomCoercion = true;
    if (customCoercion) {
      this._customCoercion = {
        truthy: new Set(customCoercion.truthy.map((v) => String(v).trim().toLowerCase())),
        falsy: new Set(customCoercion.falsy.map((v) => String(v).trim().toLowerCase()))
      }
    }

    return this;
  }

  /**
   * Sets the schema to validate against truthy values.
   * This method will coerce the value to boolean using JS truthy/falsy rules.
   * alias for coerce().true()
   */
  truthy() {
    this._coerce = true;
    this._truthy = true;
    this._falsy = false;
    return this;
  }

  /**
   * Sets the schema to validate against true values.
   */
  true() {
    this._truthy = true;
    this._falsy = false;
    return this;
  }

  /**
   * Sets the schema to validate against falsy values.
   * This method will coerce the value to boolean using JS truthy/falsy rules.
   * alias for coerce().false()
   */
  falsy() {
    this._coerce = true;
    this._falsy = true;
    this._truthy = false;
    return this;
  }

  /**
   * Sets the schema to validate against false values.
   */
  false() {
    this._falsy = true;
    this._truthy = false;
    return this;
  }

  private _coerceFromBoolish(value: unknown): boolean | undefined {
    let normalizedValue = (value !== null && value !== undefined) ? String(value).trim().toLowerCase() : "";
    
    if (this._customCoercion.truthy?.has(normalizedValue)) {
      return true;
    }
    if (this._customCoercion.falsy?.has(normalizedValue)) {
      return false;
    }
    
    return undefined
  }

  /**
   * Validates the given value against the defined boolean constraints.
   *
   * @param value The value to be validated.
   * @returns An object containing the validation result and the validated value or error messages.
   * @example
   * const schema = v.boolean().truthy();
   * result = schema.validate(1);
   * // result = { success: true, value: true }
   * // value is typed as boolean
   */
  validate(value: unknown): ValidationResult<boolean> {
    const preValidationResult = this.preValidationCheck(value);
    if (preValidationResult.status === "RETURN") return preValidationResult.value;
    else {value = preValidationResult.value}


    let coercedValue: boolean | undefined;
    if (this._coerce) {
      //coerce the value
      if (this._useCustomCoercion) {
        coercedValue = this._coerceFromBoolish(value);
      } else {
        coercedValue = Boolean(value);
      }

      //overwrite the value with our coerced value
      if (typeof coercedValue !== "boolean") {
        if (this._useCustomCoercion)
          return this.postValidationCheck({ success: false, error: [`must be a boolish value, given was ${value}`] });
        return this.postValidationCheck({
          success: false,
          error: [`must be a truthy/falsy value, given was ${value}`],
        });
      } else {
        value = coercedValue;
      }
    }

    if (typeof value !== "boolean") {
      return this.postValidationCheck({ success: false, error: [`must be a boolean, given was ${value}`] });
    }

    if (this._truthy && !value) {
      return this.postValidationCheck({ success: false, error: [`must be truthy, given was ${value}`] });
    }
    if (this._falsy && value) {
      return this.postValidationCheck({ success: false, error: [`must be falsy, given was ${value}`] });
    }

    return this.postValidationCheck({ success: true, value: value });
  }
}
// #endregion

// #region DateSchema
type Year = `${number}${number}${number}${number}`;
type Month = `0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` | `1${0 | 1 | 2}`;
type Day = `0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` | `${1 | 2}${number}` | `30` | `31`;

type DateString = `${Year}-${Month}-${Day}`;

/**
 * A schema for validating date values.
 *
 * This class provides a `validate` method to check if a given value is a valid Date object.
 */
export class DateSchema<T = Date> extends Schema<T> {
  private _coerce: boolean = true;
  private _shouldGenerateRandomDate: boolean = false;
  private _before?: Date;
  private _after?: Date;
  private _generateBefore?: Date;
  private _generateAfter?: Date;


  /**
   * The schema will return the raw value as it was provided, if it passes validation.
   * This way you can validate a date string or Date in ms without converting it to a Date instance.
   * i.e. "2011-09-17" will be returned as it is, if the validation passes.
   */
  raw() {
    this._coerce = false;
    return this as DateSchema<string | number | Date>;
  }

  /**
   * Sets the schema to fallback on a randomly generated date.  
   * *NOTE:* If the validation fails, this will generate a random date within the given constraints
   * If BOTH  `before` or `after` are unset, a random date within the last year from today will be created.
   * If EITHER `before` or `after` is unset, a random date within one year before/after that given date will be created.
   */
  populate() {
    this._shouldGenerateRandomDate = true;
    const oneYearInMilliseconds = 365 * 24 * 60 * 60 * 1000;

    //if only one of the two constraints is set, we create a generationConstraint one year before/after the given date
    if (this._before && !this._after) {
      this._generateBefore = new Date(this._before.getTime());
      this._generateAfter = new Date(this._before.getTime() - oneYearInMilliseconds);

    }
    if (!this._before && this._after) {
      this._generateBefore = new Date(this._after.getTime() + oneYearInMilliseconds);
      this._generateAfter = new Date(this._after.getTime());

    }
    //if none of the two constraints is set, we create a generationConstraint that is within the last year
    if (!this._before && !this._after) {
      this._generateBefore = new Date(Date.now());
      this._generateAfter = new Date(Date.now() - oneYearInMilliseconds);
    }
    if (this._before && this._after) {
      this._generateBefore = new Date(this._before.getTime());
      this._generateAfter = new Date(this._after.getTime());
    }
    return this;
  }
  enforce = this.populate;
  

  /**
   * Sets the schema to validate dates before a given date.
   *
   * @param date - The date to be set as the upper limit.
   */
  before(date: Date | DateString ) {
    this._before = new Date(date);
    return this;
  }
  /**
   * Sets the schema to validate dates after a given date.
   *
   * @param date - The date to be set as the lower limit.
   */
  after(date: Date | DateString) {
    this._after = new Date(date);
    return this;
  }

  /**
   * Validates the given value against the defined date constraints.
   *
   * @param value The value to be validated.
   * @returns An object containing the validation result and the validated value or error messages.
   * @example
   * const schema = v.date().before('2024-01-01').after('2023-01-01');
   * result = schema.validate('2023-12-31');
   * // result = { success: true, value: new Date('2023-12-31') }
   * // value is created with the Date constructor and is typed as Date
   */
  validate(value: any): ValidationResult<T> {
    const preValidationResult = this.preValidationCheck(value);
    if (preValidationResult.status === "RETURN") return preValidationResult.value;
    else {value = preValidationResult.value}

    
    //the js Date constructor will return an 1970-01-01 if the value is null, so we filter that out
    if (value === null) {
      return this.postValidationCheck({
        success: false,
        error: [`must be a valid Date representation, given was null`],
      });
    }
    const date = new Date(value);
    if (this._coerce) {
        value = date;
    }

    if (isValidDateObject(date)) {
      if (this._before && date > this._before) {
        return this.postValidationCheck({
          success: false,
          error: [`must be before ${this._before}, given was ${value}`],
        });
      }

      if (this._after && date < this._after) {
        return this.postValidationCheck({
          success: false,
          error: [`must be after ${this._after}, given was ${value}`],
        });
      }

      if (this._before && this._after && (date < this._after || date > this._before)) {
        return this.postValidationCheck({
          success: false,
          error: [`must be between ${this._after} and ${this._before}, given was ${value}`],
        });
      }

      return this.postValidationCheck({ success: true, value: value });
    } else {
      
      if (this._shouldGenerateRandomDate) {
        //create a new random date object within the schemata constraints
        const randomDate = new Date(this._generateBefore.getTime() + Math.random() * (this._generateAfter.getTime() - this._generateBefore.getTime()));
        return this.postValidationCheck({ success: true, value: randomDate });
      }

      return this.postValidationCheck({
        success: false,
        error: [`must be a valid Date, given was ${value}`],
      });
    }
  }
}

// #endregion

// #region LiteralSchema
/**
 * A schema for validating literals with a specific value.
 *
 */
export class LiteralSchema<T> extends Schema<T> {
  private readonly literalValue?: T;

  constructor(value: T) {
    super();
    this.literalValue = value
  }

  /**
   * Validates the given value against the defined literal value.
   *
   * @param value The value to be validated.
   * @returns An object containing the validation result and the validated value or error messages.
   * @example
   * const schema = v.literal("hello");
   * result = schema.validate("hello");
   * // result = { success: true, value: "hello" }
   * // value is typed as "hello"
   */
  validate(value: T): ValidationResult<T> {
    const preValidationResult = this.preValidationCheck(value);
    if (preValidationResult.status === "RETURN") return preValidationResult.value;
    else {value = preValidationResult.value}


    if (value === this.literalValue) {
      return this.postValidationCheck({ success: true, value: value });
    } else {
      return this.postValidationCheck({ success: false, error: [`must be ${this.literalValue}, given was ${value}`] });
    }
  }
}
// #endregion

// #region EnumSchema
/**
 * A schema for validating a value to be part of a set of values.
 *
 */
export class EnumSchema<T extends string | number> extends Schema<T> {
  private _enumValues: readonly T[];

  constructor(values: readonly T[]) {
    super();
    this._enumValues = values
  }

  /**
   * Sets the schemata to validate for Seasons i.e. "spring", "summer", "autumn", "winter"
   */
  seasons() {
    const values = ["spring", "summer", "autumn", "winter"] as const;
    return new EnumSchema(values);
  }
  }

  /**
   * Validates the given value against the defined enum values.
   *
   * @param value The value to be validated.
   * @returns An object containing the validation result and the validated value or error messages.
   * @example
   * const schema = v.enum(["red", "green", "blue"]);
   * result = schema.validate("red");
   * // result = { success: true, value: "red" }
   * // value is typed as "red" | "green" | "blue"
   */
  validate(value: unknown): ValidationResult<T> {
    const preValidationResult = this.preValidationCheck(value);
    if (preValidationResult.status === "RETURN") return preValidationResult.value;
    else {value = preValidationResult.value}

    if (this._enumValues.includes(value as T)) {
      return this.postValidationCheck({ success: true, value: value as T});
    } else {
      return this.postValidationCheck({
        success: false,
        error: [`must be one of ${this._enumValues.join(", ")}, given was ${value}`],
      });
    }
  }
}
// #endregion


// #region ObjectSchema
// Utility type to extract the structure of the object based on the schema definitions contained in the shape
// GenericObjectT is constrained to be a Record/Object where each key is a string, and each value is an instance of the Schema class (or a subclass of it)
//
//this uses a conditional type to infer the type of each key within the given object
type OptionalKeys<T extends Record<string, Schema<any>>> = {
  [K in keyof T]: T[K] extends { _isOptional: true } ? K : never;
}[keyof T];

type RequiredKeys<T extends Record<string, Schema<any>>> = Exclude<keyof T, OptionalKeys<T>>;

type InferShape<T extends Record<string, Schema<any>>> = {
  [K in RequiredKeys<T>]: T[K] extends Schema<infer V> ? V : never;
} & {
  [K in OptionalKeys<T>]?: T[K] extends Schema<infer V> ? V : never;
};

/**
 * A schema for validating objects with a defined shape.
 *
 * This class allows for the validation of objects based on a specified shape, where each key in the object
 * corresponds to a schema that defines the expected type and constraints for that key's value.
 * @example
 * const UserSchema = v.object({
 *   name: v.string(),
 *   profile: v.object({
 *    age: v.number().positive().int(),
 *    email: v.string().email(),
 *   }),
 * });
 */
export class ObjectSchema<T extends Record<string, Schema<any>>> extends Schema<InferShape<T>> {
  //the type of the object must match a key-value pair where the key is a string and the value is one of our schema
  //the object schema is extended with a type argument that is built from our utility type InferShape (see above)
  constructor(private shape: T) {
    super();
  }
  private _nonEmpty: boolean = false;

  /**
   * Sets the schema to validate the object has at least one key-value pair.
   
   */
  nonEmpty() {
    this._nonEmpty = true;
    return this;
  }

  /**
   * Validates the given value against the defined object shape.
   *
   * @param value The value to be validated.
   * @returns An object containing the validation result and the validated value or error messages.
   * @example
   * const schema = v.object({
   *   name: v.string(),
   *   age: v.number().positive().int(),
   * });
   * result = schema.validate({ name: "John", age: 30 });
   * // result = { success: true, value: { name: "John", age: 30 } }
   * // value is typed as { name: string; age: number; }
   */
  validate(value: unknown): ValidationResult<InferShape<T>> {
    const preValidationResult = this.preValidationCheck(value);
    if (preValidationResult.status === "RETURN") return preValidationResult.value;
    else {value = preValidationResult.value}


    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be an object, given was ${value} of type ${typeof value}`],
      });
    }
    if (this._nonEmpty && Object.keys(value).length === 0) {
      return this.postValidationCheck({
        success: false,
        error: [`must be an object with at least one key-value pair, given was an empty object`],
      });
    }

    const errors: string[] = [];
    const results: any = {};

    for (const key in this.shape) {
      const propertySchema = this.shape[key];
      const propertyResult = propertySchema.validate((value as any)[key]);

      if (propertyResult.success === true) {
        if (propertySchema._isOptional && propertyResult.value === undefined) {
          continue;
        }
        results[key] = propertyResult.value;
      }
      if (propertyResult.success === false) {
        if (propertySchema._isOptional) {
          continue;
        }
        errors.push(`${key}: ${propertyResult.error.join(", ")}`);
      }
    }

    if (errors.length === 0) {
      if (this._nonEmpty && Object.keys(results).length === 0) {
        return this.postValidationCheck({
          success: false,
          error: [`must be an object with at least one valid key-value pair, during validation the object became empty`],
        });
      }
      return this.postValidationCheck({ success: true, value: results });
    } else {
      return this.postValidationCheck({ success: false, error: errors });
    }
  }
}
// #endregion

// #region ArraySchema
/**
 * A schema for validating arrays with a defined element schema.
 *
 * This class allows for the validation of arrays where each element in the array must conform to a specified schema.
 * @example
 * const notesArray = v.array(v.object({
 *  title: v.string().max(32),
 *  content: v.string()
 * }));
 *
 */
export class ArraySchema<T> extends Schema<T[]> {
  private _min: number = NaN;
  private _max: number = NaN;

  constructor(private elementSchema: Schema<T>) {
    super();
  }

  /**
   * Sets the schema to validate arrays with a minimum length.
   *
   * @param value The minimum length to be set.
   */
  min(value: number) {
    if (isNaN(value)) throw new Error(`ArraySchema Constraint Error: min(${value}) parameter is not a number`)

    this._min = value;
    return this;
  }

  /**
   * Sets the schema to validate the array has at least one element.
   * This method is an alias for `min(1)`.
   * *Note:* this will overwrite a minimum value of 0*
   
   */
  nonEmpty() {
    if (isNaN(this._min) || this._min === 0) this._min = 1;
    return this;
  }
  /**
   * Sets the schema to validate arrays with a maximum length.
   *
   * @param value The maximum length to be set.
   */
  max(value: number) {
    if (isNaN(value)) throw new Error(`ArraySchema Constraint Error: max(${value}) parameter is not a number`)

    this._max = value;
    return this;
  }

  /**
   * Validates the given value against the defined array schema.
   *
   * @param value The value to be validated.
   * @returns An object containing the validation result and the validated value or error messages.
   * @example
   * const schema = v.array(v.string());
   * result = schema.validate(["apple", "banana"]);
   * // result = { success: true, value: ["apple", "banana"] }
   * // value is typed as string[]
   */
  validate(value: unknown): ValidationResult<T[]> {
    const preValidationResult = this.preValidationCheck(value);
    if (preValidationResult.status === "RETURN") return preValidationResult.value;
    else {value = preValidationResult.value}


    if (!Array.isArray(value)) {
      return this.postValidationCheck({
        success: false,
        error: [`must be an array, given was ${typeof value}`],
      });
    }

    const errors: string[] = [];
    const results: T[] = [];

    for (const [index, item] of value.entries()) {
      const elementResult = this.elementSchema.validate(item);
      if (elementResult.success === true) {
        if (this.elementSchema._isOptional && elementResult.value === undefined) {
          continue;
        }
        results.push(elementResult.value);
      }
      if (elementResult.success === false) {
        if (this.elementSchema._isOptional) {
          continue;
        }
        errors.push(`${index}: ${elementResult.error.join(", ")}`);
      }
    }
    if (errors.length === 0) {
      if (!isNaN(this._min) && results.length < this._min) {
        return this.postValidationCheck({
          success: false,
          error: [`must be an array with ${this._min} or more elements, given was an array with ${results.length} elements`],
        });
      }
      if (!isNaN(this._max) && results.length > this._max) {
        return this.postValidationCheck({
          success: false,
          error: [`must be an array with ${this._max} or fewer elements, given was an array with ${results.length} elements`],
        });
      }
      return this.postValidationCheck({ success: true, value: results });
    } else {
      return this.postValidationCheck({ success: false, error: errors });
    }
  }
}
// #endregion

///////////
export const v = Validator;
///////////

// #region Regex-Patterns

// from https://github.com/validatorjs/validator.js/blob/master/src/lib/isPostalCode.js
// common patterns
const threeDigit = /^\d{3}$/;
const fourDigit = /^\d{4}$/;
const fiveDigit = /^\d{5}$/;
const sixDigit = /^\d{6}$/;

const postal = {
  AD: /^AD\d{3}$/,
  AT: fourDigit,
  AU: fourDigit,
  AZ: /^AZ\d{4}$/,
  BA: /^([7-8]\d{4}$)/,
  BE: fourDigit,
  BG: fourDigit,
  BR: /^\d{5}-?\d{3}$/,
  BY: /^2[1-4]\d{4}$/,
  CA: /^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][\s\-]?\d[ABCEGHJ-NPRSTV-Z]\d$/i,
  CH: fourDigit,
  CN: /^(0[1-7]|1[012356]|2[0-7]|3[0-6]|4[0-7]|5[1-7]|6[1-7]|7[1-5]|8[1345]|9[09])\d{4}$/,
  CO: /^(05|08|11|13|15|17|18|19|20|23|25|27|41|44|47|50|52|54|63|66|68|70|73|76|81|85|86|88|91|94|95|97|99)(\d{4})$/,
  CZ: /^\d{3}\s?\d{2}$/,
  DE: fiveDigit,
  DK: fourDigit,
  DO: fiveDigit,
  DZ: fiveDigit,
  EE: fiveDigit,
  ES: /^(5[0-2]{1}|[0-4]{1}\d{1})\d{3}$/,
  FI: fiveDigit,
  FR: /^(?:(?:0[1-9]|[1-8]\d|9[0-5])\d{3}|97[1-46]\d{2})$/,
  GB: /^(gir\s?0aa|[a-z]{1,2}\d[\da-z]?\s?(\d[a-z]{2})?)$/i,
  GR: /^\d{3}\s?\d{2}$/,
  HR: /^([1-5]\d{4}$)/,
  HT: /^HT\d{4}$/,
  HU: fourDigit,
  ID: fiveDigit,
  IE: /^(?!.*(?:o))[A-Za-z]\d[\dw]\s\w{4}$/i,
  IL: /^(\d{5}|\d{7})$/,
  IN: /^((?!10|29|35|54|55|65|66|86|87|88|89)[1-9][0-9]{5})$/,
  IR: /^(?!(\d)\1{3})[13-9]{4}[1346-9][013-9]{5}$/,
  IS: threeDigit,
  IT: fiveDigit,
  JP: /^\d{3}\-\d{4}$/,
  KE: fiveDigit,
  KR: /^(\d{5}|\d{6})$/,
  LI: /^(948[5-9]|949[0-7])$/,
  LT: /^LT\-\d{5}$/,
  LU: fourDigit,
  LV: /^LV\-\d{4}$/,
  LK: fiveDigit,
  MG: threeDigit,
  MX: fiveDigit,
  MT: /^[A-Za-z]{3}\s{0,1}\d{4}$/,
  MY: fiveDigit,
  NL: /^[1-9]\d{3}\s?(?!sa|sd|ss)[a-z]{2}$/i,
  NO: fourDigit,
  NP: /^(10|21|22|32|33|34|44|45|56|57)\d{3}$|^(977)$/i,
  NZ: fourDigit,
  // https://www.pakpost.gov.pk/postcodes.php
  PK: fiveDigit,
  PL: /^\d{2}\-\d{3}$/,
  PR: /^00[679]\d{2}([ -]\d{4})?$/,
  PT: /^\d{4}\-\d{3}?$/,
  RO: sixDigit,
  RU: sixDigit,
  SA: fiveDigit,
  SE: /^[1-9]\d{2}\s?\d{2}$/,
  SG: sixDigit,
  SI: fourDigit,
  SK: /^\d{3}\s?\d{2}$/,
  TH: fiveDigit,
  TN: fourDigit,
  TW: /^\d{3}(\d{2,3})?$/,
  UA: fiveDigit,
  US: /^\d{5}(-\d{4})?$/,
  ZA: fourDigit,
  ZM: fiveDigit,
};

// from https://github.com/validatorjs/validator.js/blob/master/src/lib/alpha.js
export const alpha = {
  "en-US": /^[A-Z]+$/i,
  "az-AZ": /^[A-VXYZÇƏĞİıÖŞÜ]+$/i,
  "bg-BG": /^[А-Я]+$/i,
  "cs-CZ": /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]+$/i,
  "da-DK": /^[A-ZÆØÅ]+$/i,
  "de-DE": /^[A-ZÄÖÜß]+$/i,
  "el-GR": /^[Α-ώ]+$/i,
  "es-ES": /^[A-ZÁÉÍÑÓÚÜ]+$/i,
  "fa-IR": /^[ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]+$/i,
  "fi-FI": /^[A-ZÅÄÖ]+$/i,
  "fr-FR": /^[A-ZÀÂÆÇÉÈÊËÏÎÔŒÙÛÜŸ]+$/i,
  "it-IT": /^[A-ZÀÉÈÌÎÓÒÙ]+$/i,
  "ja-JP": /^[ぁ-んァ-ヶｦ-ﾟ一-龠ー・。、]+$/i,
  "nb-NO": /^[A-ZÆØÅ]+$/i,
  "nl-NL": /^[A-ZÁÉËÏÓÖÜÚ]+$/i,
  "nn-NO": /^[A-ZÆØÅ]+$/i,
  "hu-HU": /^[A-ZÁÉÍÓÖŐÚÜŰ]+$/i,
  "pl-PL": /^[A-ZĄĆĘŚŁŃÓŻŹ]+$/i,
  "pt-PT": /^[A-ZÃÁÀÂÄÇÉÊËÍÏÕÓÔÖÚÜ]+$/i,
  "ru-RU": /^[А-ЯЁ]+$/i,
  "kk-KZ": /^[А-ЯЁ\u04D8\u04B0\u0406\u04A2\u0492\u04AE\u049A\u04E8\u04BA]+$/i,
  "sl-SI": /^[A-ZČĆĐŠŽ]+$/i,
  "sk-SK": /^[A-ZÁČĎÉÍŇÓŠŤÚÝŽĹŔĽÄÔ]+$/i,
  "sr-RS@latin": /^[A-ZČĆŽŠĐ]+$/i,
  "sr-RS": /^[А-ЯЂЈЉЊЋЏ]+$/i,
  "sv-SE": /^[A-ZÅÄÖ]+$/i,
  "th-TH": /^[ก-๐\s]+$/i,
  "tr-TR": /^[A-ZÇĞİıÖŞÜ]+$/i,
  "uk-UA": /^[А-ЩЬЮЯЄIЇҐі]+$/i,
  "vi-VN": /^[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴĐÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸ]+$/i,
  "ko-KR": /^[ㄱ-ㅎㅏ-ㅣ가-힣]*$/,
  "ku-IQ": /^[ئابپتجچحخدرڕزژسشعغفڤقکگلڵمنوۆھەیێيطؤثآإأكضصةظذ]+$/i,
  ar: /^[ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيًٌٍَُِّْٰ]+$/,
  he: /^[א-ת]+$/,
  fa: /^['آاءأؤئبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهةی']+$/i,
  bn: /^['ঀঁংঃঅআইঈউঊঋঌএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহ়ঽািীুূৃৄেৈোৌ্ৎৗড়ঢ়য়ৠৡৢৣৰৱ৲৳৴৵৶৷৸৹৺৻']+$/,
  eo: /^[ABCĈD-GĜHĤIJĴK-PRSŜTUŬVZ]+$/i,
  "hi-IN": /^[\u0900-\u0961]+[\u0972-\u097F]*$/i,
  "si-LK": /^[\u0D80-\u0DFF]+$/,
};

export const alphanumeric = {
  "en-US": /^[0-9A-Z]+$/i,
  "az-AZ": /^[0-9A-VXYZÇƏĞİıÖŞÜ]+$/i,
  "bg-BG": /^[0-9А-Я]+$/i,
  "cs-CZ": /^[0-9A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]+$/i,
  "da-DK": /^[0-9A-ZÆØÅ]+$/i,
  "de-DE": /^[0-9A-ZÄÖÜẞß]+$/i,
  "el-GR": /^[0-9Α-ω]+$/i,
  "es-ES": /^[0-9A-ZÁÉÍÑÓÚÜ]+$/i,
  "fi-FI": /^[0-9A-ZÅÄÖ]+$/i,
  "fr-FR": /^[0-9A-ZÀÂÆÇÉÈÊËÏÎÔŒÙÛÜŸ]+$/i,
  "it-IT": /^[0-9A-ZÀÉÈÌÎÓÒÙ]+$/i,
  "ja-JP": /^[0-9０-９ぁ-んァ-ヶｦ-ﾟ一-龠ー・。、]+$/i,
  "hu-HU": /^[0-9A-ZÁÉÍÓÖŐÚÜŰ]+$/i,
  "nb-NO": /^[0-9A-ZÆØÅ]+$/i,
  "nl-NL": /^[0-9A-ZÁÉËÏÓÖÜÚ]+$/i,
  "nn-NO": /^[0-9A-ZÆØÅ]+$/i,
  "pl-PL": /^[0-9A-ZĄĆĘŚŁŃÓŻŹ]+$/i,
  "pt-PT": /^[0-9A-ZÃÁÀÂÄÇÉÊËÍÏÕÓÔÖÚÜ]+$/i,
  "ru-RU": /^[0-9А-ЯЁ]+$/i,
  "kk-KZ": /^[0-9А-ЯЁ\u04D8\u04B0\u0406\u04A2\u0492\u04AE\u049A\u04E8\u04BA]+$/i,
  "sl-SI": /^[0-9A-ZČĆĐŠŽ]+$/i,
  "sk-SK": /^[0-9A-ZÁČĎÉÍŇÓŠŤÚÝŽĹŔĽÄÔ]+$/i,
  "sr-RS@latin": /^[0-9A-ZČĆŽŠĐ]+$/i,
  "sr-RS": /^[0-9А-ЯЂЈЉЊЋЏ]+$/i,
  "sv-SE": /^[0-9A-ZÅÄÖ]+$/i,
  "th-TH": /^[ก-๙\s]+$/i,
  "tr-TR": /^[0-9A-ZÇĞİıÖŞÜ]+$/i,
  "uk-UA": /^[0-9А-ЩЬЮЯЄIЇҐі]+$/i,
  "ko-KR": /^[0-9ㄱ-ㅎㅏ-ㅣ가-힣]*$/,
  "ku-IQ": /^[٠١٢٣٤٥٦٧٨٩0-9ئابپتجچحخدرڕزژسشعغفڤقکگلڵمنوۆھەیێيطؤثآإأكضصةظذ]+$/i,
  "vi-VN": /^[0-9A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴĐÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸ]+$/i,
  ar: /^[٠١٢٣٤٥٦٧٨٩0-9ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىيًٌٍَُِّْٰ]+$/,
  he: /^[0-9א-ת]+$/,
  fa: /^['0-9آاءأؤئبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهةی۱۲۳۴۵۶۷۸۹۰']+$/i,
  bn: /^['ঀঁংঃঅআইঈউঊঋঌএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহ়ঽািীুূৃৄেৈোৌ্ৎৗড়ঢ়য়ৠৡৢৣ০১২৩৪৫৬৭৮৯ৰৱ৲৳৴৵৶৷৸৹৺৻']+$/,
  eo: /^[0-9ABCĈD-GĜHĤIJĴK-PRSŜTUŬVZ]+$/i,
  "hi-IN": /^[\u0900-\u0963]+[\u0966-\u097F]*$/i,
  "si-LK": /^[0-9\u0D80-\u0DFF]+$/,
};

// from https://github.com/validatorjs/validator.js/blob/master/src/lib/isISO31661Alpha2.js
// prettier-ignore
const validISO31661Alpha2CountriesCodes = new Set([
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE',
  'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD',
  'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
  'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF',
  'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM', 'HN', 'HR', 'HT', 'HU',
  'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN',
  'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME',
  'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
  'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI',
  'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK',
  'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
]);

// from https://github.com/validatorjs/validator.js/blob/master/src/lib/isIBAN.js
const ibanRegexThroughCountryCode = {
  AD: /^(AD[0-9]{2})\d{8}[A-Z0-9]{12}$/,
  AE: /^(AE[0-9]{2})\d{3}\d{16}$/,
  AL: /^(AL[0-9]{2})\d{8}[A-Z0-9]{16}$/,
  AT: /^(AT[0-9]{2})\d{16}$/,
  AZ: /^(AZ[0-9]{2})[A-Z0-9]{4}\d{20}$/,
  BA: /^(BA[0-9]{2})\d{16}$/,
  BE: /^(BE[0-9]{2})\d{12}$/,
  BG: /^(BG[0-9]{2})[A-Z]{4}\d{6}[A-Z0-9]{8}$/,
  BH: /^(BH[0-9]{2})[A-Z]{4}[A-Z0-9]{14}$/,
  BR: /^(BR[0-9]{2})\d{23}[A-Z]{1}[A-Z0-9]{1}$/,
  BY: /^(BY[0-9]{2})[A-Z0-9]{4}\d{20}$/,
  CH: /^(CH[0-9]{2})\d{5}[A-Z0-9]{12}$/,
  CR: /^(CR[0-9]{2})\d{18}$/,
  CY: /^(CY[0-9]{2})\d{8}[A-Z0-9]{16}$/,
  CZ: /^(CZ[0-9]{2})\d{20}$/,
  DE: /^(DE[0-9]{2})\d{18}$/,
  DK: /^(DK[0-9]{2})\d{14}$/,
  DO: /^(DO[0-9]{2})[A-Z]{4}\d{20}$/,
  DZ: /^(DZ\d{24})$/,
  EE: /^(EE[0-9]{2})\d{16}$/,
  EG: /^(EG[0-9]{2})\d{25}$/,
  ES: /^(ES[0-9]{2})\d{20}$/,
  FI: /^(FI[0-9]{2})\d{14}$/,
  FO: /^(FO[0-9]{2})\d{14}$/,
  FR: /^(FR[0-9]{2})\d{10}[A-Z0-9]{11}\d{2}$/,
  GB: /^(GB[0-9]{2})[A-Z]{4}\d{14}$/,
  GE: /^(GE[0-9]{2})[A-Z0-9]{2}\d{16}$/,
  GI: /^(GI[0-9]{2})[A-Z]{4}[A-Z0-9]{15}$/,
  GL: /^(GL[0-9]{2})\d{14}$/,
  GR: /^(GR[0-9]{2})\d{7}[A-Z0-9]{16}$/,
  GT: /^(GT[0-9]{2})[A-Z0-9]{4}[A-Z0-9]{20}$/,
  HR: /^(HR[0-9]{2})\d{17}$/,
  HU: /^(HU[0-9]{2})\d{24}$/,
  IE: /^(IE[0-9]{2})[A-Z]{4}\d{14}$/,
  IL: /^(IL[0-9]{2})\d{19}$/,
  IQ: /^(IQ[0-9]{2})[A-Z]{4}\d{15}$/,
  IR: /^(IR[0-9]{2})0\d{2}0\d{18}$/,
  IS: /^(IS[0-9]{2})\d{22}$/,
  IT: /^(IT[0-9]{2})[A-Z]{1}\d{10}[A-Z0-9]{12}$/,
  JO: /^(JO[0-9]{2})[A-Z]{4}\d{22}$/,
  KW: /^(KW[0-9]{2})[A-Z]{4}[A-Z0-9]{22}$/,
  KZ: /^(KZ[0-9]{2})\d{3}[A-Z0-9]{13}$/,
  LB: /^(LB[0-9]{2})\d{4}[A-Z0-9]{20}$/,
  LC: /^(LC[0-9]{2})[A-Z]{4}[A-Z0-9]{24}$/,
  LI: /^(LI[0-9]{2})\d{5}[A-Z0-9]{12}$/,
  LT: /^(LT[0-9]{2})\d{16}$/,
  LU: /^(LU[0-9]{2})\d{3}[A-Z0-9]{13}$/,
  LV: /^(LV[0-9]{2})[A-Z]{4}[A-Z0-9]{13}$/,
  MA: /^(MA[0-9]{26})$/,
  MC: /^(MC[0-9]{2})\d{10}[A-Z0-9]{11}\d{2}$/,
  MD: /^(MD[0-9]{2})[A-Z0-9]{20}$/,
  ME: /^(ME[0-9]{2})\d{18}$/,
  MK: /^(MK[0-9]{2})\d{3}[A-Z0-9]{10}\d{2}$/,
  MR: /^(MR[0-9]{2})\d{23}$/,
  MT: /^(MT[0-9]{2})[A-Z]{4}\d{5}[A-Z0-9]{18}$/,
  MU: /^(MU[0-9]{2})[A-Z]{4}\d{19}[A-Z]{3}$/,
  MZ: /^(MZ[0-9]{2})\d{21}$/,
  NL: /^(NL[0-9]{2})[A-Z]{4}\d{10}$/,
  NO: /^(NO[0-9]{2})\d{11}$/,
  PK: /^(PK[0-9]{2})[A-Z0-9]{4}\d{16}$/,
  PL: /^(PL[0-9]{2})\d{24}$/,
  PS: /^(PS[0-9]{2})[A-Z]{4}[A-Z0-9]{21}$/,
  PT: /^(PT[0-9]{2})\d{21}$/,
  QA: /^(QA[0-9]{2})[A-Z]{4}[A-Z0-9]{21}$/,
  RO: /^(RO[0-9]{2})[A-Z]{4}[A-Z0-9]{16}$/,
  RS: /^(RS[0-9]{2})\d{18}$/,
  SA: /^(SA[0-9]{2})\d{2}[A-Z0-9]{18}$/,
  SC: /^(SC[0-9]{2})[A-Z]{4}\d{20}[A-Z]{3}$/,
  SE: /^(SE[0-9]{2})\d{20}$/,
  SI: /^(SI[0-9]{2})\d{15}$/,
  SK: /^(SK[0-9]{2})\d{20}$/,
  SM: /^(SM[0-9]{2})[A-Z]{1}\d{10}[A-Z0-9]{12}$/,
  SV: /^(SV[0-9]{2})[A-Z0-9]{4}\d{20}$/,
  TL: /^(TL[0-9]{2})\d{19}$/,
  TN: /^(TN[0-9]{2})\d{20}$/,
  TR: /^(TR[0-9]{2})\d{5}[A-Z0-9]{17}$/,
  UA: /^(UA[0-9]{2})\d{6}[A-Z0-9]{19}$/,
  VA: /^(VA[0-9]{2})\d{18}$/,
  VG: /^(VG[0-9]{2})[A-Z]{4}\d{16}$/,
  XK: /^(XK[0-9]{2})\d{16}$/,
};

// from https://github.com/validatorjs/validator.js/blob/master/src/lib/isBIC.js
const isBICReg = /^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/;


// from https://github.com/validatorjs/validator.js/blob/master/src/lib/isIP.js
const IPv4SegmentFormat = '(?:[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])';
const IPv4AddressFormat = `(${IPv4SegmentFormat}[.]){3}${IPv4SegmentFormat}`;
const IPv4AddressRegExp = new RegExp(`^${IPv4AddressFormat}$`);

const IPv6SegmentFormat = '(?:[0-9a-fA-F]{1,4})';
const IPv6AddressRegExp = new RegExp('^(' +
  `(?:${IPv6SegmentFormat}:){7}(?:${IPv6SegmentFormat}|:)|` +
  `(?:${IPv6SegmentFormat}:){6}(?:${IPv4AddressFormat}|:${IPv6SegmentFormat}|:)|` +
  `(?:${IPv6SegmentFormat}:){5}(?::${IPv4AddressFormat}|(:${IPv6SegmentFormat}){1,2}|:)|` +
  `(?:${IPv6SegmentFormat}:){4}(?:(:${IPv6SegmentFormat}){0,1}:${IPv4AddressFormat}|(:${IPv6SegmentFormat}){1,3}|:)|` +
  `(?:${IPv6SegmentFormat}:){3}(?:(:${IPv6SegmentFormat}){0,2}:${IPv4AddressFormat}|(:${IPv6SegmentFormat}){1,4}|:)|` +
  `(?:${IPv6SegmentFormat}:){2}(?:(:${IPv6SegmentFormat}){0,3}:${IPv4AddressFormat}|(:${IPv6SegmentFormat}){1,5}|:)|` +
  `(?:${IPv6SegmentFormat}:){1}(?:(:${IPv6SegmentFormat}){0,4}:${IPv4AddressFormat}|(:${IPv6SegmentFormat}){1,6}|:)|` +
  `(?::((?::${IPv6SegmentFormat}){0,5}:${IPv4AddressFormat}|(?::${IPv6SegmentFormat}){1,7}|:))` +
  ')(%[0-9a-zA-Z.]{1,})?$');

// #endregion
