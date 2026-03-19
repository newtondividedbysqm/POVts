import { describe, expect, test } from '@eip/testing';
import {
  v,
  StringSchema,
  NumberSchema,
  BooleanSchema,
  DateSchema,
  ObjectSchema,
  ArraySchema,
  LiteralSchema,
  EnumSchema,
  } from './';

type ValidationResultLike<T> =
  | { success: true; value: T }
  | { success: false; error: string[] };

  /** Type safe helper to access the validatedResult value */
const validatedValue = <T>(result: ValidationResultLike<T>): T =>
  result.success ? result.value : (undefined as T);

describe('Validator', () => {
  test('Creates the correct Schema Instances for validation', () => {
    const stringSchema = v.string()
    const numberSchema = v.number()
    const booleanSchema = v.boolean()
    const dateSchema = v.date()
    const arraySchema = v.array(v.string())
    const objectShema = v.object({
      name: v.string(),
      age: v.number(),
      notes: v.array(v.object({title: v.string(), content: v.string()}))
    })
    const literalSchema = v.literal("test")
    const enumSchema = v.enum(["test", "test2", "test3"])

    expect( stringSchema instanceof StringSchema , "should create a StringSchema instance").toBeTrue()
    expect( numberSchema instanceof NumberSchema, "should create a NumberSchema instance" ).toBeTrue()
    expect( booleanSchema instanceof BooleanSchema, "should create a BooleanSchema instance" ).toBeTrue()
    expect( dateSchema instanceof DateSchema, "should create a DateSchema instance" ).toBeTrue()
    expect( arraySchema instanceof ArraySchema, "should create an ArraySchema instance" ).toBeTrue()
    expect( arraySchema instanceof ArraySchema, "should create an ArraySchema instance" ).toBeTrue()
    expect( literalSchema instanceof LiteralSchema, "should create a LiteralSchema instance for literal" ).toBeTrue()
    expect( enumSchema instanceof EnumSchema, "should create a LiteralSchema instance for enum" ).toBeTrue()
    expect( objectShema instanceof ObjectSchema, "should create an ObjectSchema instance").toBeTrue()
    expect( objectShema instanceof ObjectSchema && JSON.stringify(objectShema._shape) === JSON.stringify({
      name: v.string(),
      age: v.number(),
      notes: v.array(v.object({title: v.string(), content: v.string()}))
    }), "should create an ObjectSchema that matches with the complex data structure provided").toBeTrue()


  });

  test('Holds the correct value', () => {
     const stringSchema = v.string()
    const numberSchema = v.number()
    const booleanSchema = v.boolean()
    const dateSchema = v.date()
    const arraySchema = v.array(v.string())
    const objectShema = v.object({
      name: v.string(),
      age: v.number(),
      notes: v.array(v.object({title: v.string(), content: v.string()}))
    })
    const literalSchema = v.literal("test")
    const enumSchema = v.enum(["test", "test2", "test3"])

    const testString = "Lorem Ipsum Dolar Sit Amet"
    const testNumber = 123456789
    const testBoolean = true
    const testDate = new Date("2023-10-01")
    const testArray = ["Lorem", "Ipsum", "Dolar", "Sit", "Amet"]
    const testObject = {
      name: "John Doe",
      age: 30,
      notes: [
        { title: "Note 1", content: "Content of note 1" },
        { title: "Note 2", content: "Content of note 2" }
      ]
    }
    const testLiteral = "test"
    const testEnum = "test2"

    expect( validatedValue(stringSchema.validate(testString)), "should hold the string value" ).toBe(testString)
    expect( validatedValue(numberSchema.validate(testNumber)), "should hold the number value" ).toBe(testNumber)
    expect( validatedValue(booleanSchema.validate(testBoolean)), "should hold the boolean value" ).toBe(testBoolean)
    expect( validatedValue(dateSchema.validate(testDate)), "should hold the date value" ).toEqual(testDate)
    expect( validatedValue(arraySchema.validate(testArray)), "should hold the array  value" ).toEqual(testArray)
    expect( validatedValue(objectShema.validate(testObject)), "should hold the object  value" ).toEqual(testObject)
    expect( validatedValue(literalSchema.validate(testLiteral)), "should hold the literal  value" ).toBe(testLiteral)
    expect( validatedValue(enumSchema.validate(testEnum)), "should hold the enum value" ).toBe(testEnum)
  });

  test('nullable schemas', () => {
    const nullableSchema = v.string().nullable()
   
    expect( nullableSchema.validate(null).success, "should validate a null value" ).toBeTrue()
    expect( validatedValue(nullableSchema.validate(null)), "should hold null when given null" ).toBeNull()
    expect( nullableSchema.validate(undefined).success, "should NOT validate undefined value" ).toBeFalse()
    expect( nullableSchema.validate(1234).success, "should NOT validate a failed schema" ).toBeFalse()
  });

  test('nullish schemas', () => {
      const nullishShema = v.string().nullish()
    
      expect( nullishShema.validate(null).success, "should validate a null value" ).toBeTrue()
      expect( validatedValue(nullishShema.validate(null)), "should hold null when given null" ).toBeNull()
      expect( nullishShema.validate(undefined).success, "should validate an undefined value" ).toBeTrue()
      expect( validatedValue(nullishShema.validate(undefined)), "should hold null when given undefined" ).toBeNull()
      expect( nullishShema.validate(1234).success, "should NOT validate a failed schema" ).toBeFalse()
  });

  test('default schemas', () => {
    const defaultValue = "Default Value"
      const defaultSchema = v.string().default(defaultValue)

      expect( defaultSchema.validate(null).success, "should validate a null value" ).toBeTrue()
      expect( defaultSchema.validate(undefined).success, "should validate an undefined value" ).toBeTrue()
      expect( validatedValue(defaultSchema.validate(undefined)), "should return the default when given undefined" ).toBe(defaultValue)
      expect( validatedValue(defaultSchema.validate(null)), "should return the default when given null" ).toBe(defaultValue)
      expect( defaultSchema.validate(1234).success, "should NOT validate a failed validation" ).toBeFalse()
  });

  test('catch schemas', () => {
      const catchValue = "Catch Value"
      const catchSchema = v.string().catch(catchValue)
      
      expect( catchSchema.validate(null).success, "should validate a null value" ).toBeTrue()
      expect( catchSchema.validate(undefined).success, "should validate an undefined value" ).toBeTrue()
      expect( validatedValue(catchSchema.validate(undefined)), "should return the default when given undefined" ).toBe(catchValue)
      expect( validatedValue(catchSchema.validate(null)), "should return the default when given null" ).toBe(catchValue)
      expect( catchSchema.validate(1234), "should validate a failed validation and hold the catch value" ).toEqual({success: true, value: catchValue})
  });

  test('optional schemas', () => {
      const optionalSchema = v.string().optional()
    
      expect( validatedValue(optionalSchema.validate(1234)), "should remove the value of failed validations" ).toBeUndefined()
      expect( optionalSchema.validate(1234).success, "should validate when failed" ).toBeTrue()
  });

});
/*
..######..########.########..####.##....##..######..
.##....##....##....##.....##..##..###...##.##....##.
.##..........##....##.....##..##..####..##.##.......
..######.....##....########...##..##.##.##.##...####
.......##....##....##...##....##..##..####.##....##.
.##....##....##....##....##...##..##...###.##....##.
..######.....##....##.....##.####.##....##..######..
*/
describe('String Validation', () => {
  const testString = "Lorem Ipsum Dolar Sit Amet"

  test('StringSchema without constriants', () => {
    const strSchema = v.string()
    const NotAString = 123456789


    expect( strSchema.validate(testString).success, "should validate a string value" ).toBeTrue()
    expect( strSchema.validate(NotAString).success, "should NOT validate a numeric value" ).toBeFalse()
    expect( strSchema.validate(null).success, "should NOT validate null" ).toBeFalse()
    expect( strSchema.validate(undefined).success, "should NOT validate undefined").toBeFalse()
  });

  test('StringSchema with min(5) and max(5) constriants', () => {
    const strSchemaWithMinMaxConstraints = v.string().min(5).max(5)

    const fourCharacters = "abcd"
    const sixCharacters = "abcdef"
    const fiveCharacters = "abcde"


    expect( strSchemaWithMinMaxConstraints.validate(fourCharacters).success, "should NOT validate a 4 character string" ).toBeFalse()
    expect( strSchemaWithMinMaxConstraints.validate(sixCharacters).success, "should NOT validate a 6 character string" ).toBeFalse()
    expect( strSchemaWithMinMaxConstraints.validate(fiveCharacters).success, "SHOULD validate a 5 character string" ).toBeTrue()
  });

  test('StringSchema with length(5) constriants', () => {
    const strSchemaWithExactLength = v.string().length(5)

    const fourCharacters = "abcd"
    const sixCharacters = "abcdef"
    const fiveCharacters = "abcde"


    expect( strSchemaWithExactLength.validate(fourCharacters).success, "should NOT validate a 4 character string" ).toBeFalse()
    expect( strSchemaWithExactLength.validate(sixCharacters).success, "should NOT validate a 6 character string" ).toBeFalse()
    expect( strSchemaWithExactLength.validate(fiveCharacters).success, "should validate 5 character string" ).toBeTrue()
  });

  test('StringSchema with nonEmpty() constriants', () => {
    const strSchemaNonEmpty = v.string().nonEmpty()
    const emptyString = ""

    expect( strSchemaNonEmpty.validate(emptyString).success, "should NOT validate an empty string" ).toBeFalse()
    expect( strSchemaNonEmpty.validate(testString).success, "should validate a non-empty string" ).toBeTrue()
  });

  test('StringSchema with startsWith("Lorem Ipsum") constriants', () => {
    const strSchemaStartsWith = v.string().startsWith("Lorem Ipsum")
    const reversedString = "temA tiS raloD muspI meroL"

    expect( strSchemaStartsWith.validate(reversedString).success, "should NOT validate an unrelated string" ).toBeFalse()
    expect( strSchemaStartsWith.validate(testString).success, "should validate a matching string" ).toBeTrue()
  });

  test('StringSchema with endsWith("Sit Amet") constriants', () => {
    const strSchemaEndsWith = v.string().endsWith("Sit Amet")
    const reversedString = "temA tiS raloD muspI meroL"


    expect( strSchemaEndsWith.validate(reversedString).success, "should NOT validate an unrelated string" ).toBeFalse()
    expect( strSchemaEndsWith.validate(testString).success, "should validate a matching string" ).toBeTrue()
  });
  
  test('StringSchema with alpha constriants', () => {
    const strSchemaAlpha = v.string().alpha()
    const strSchemaAlphaDE = v.string().alpha("de-DE")
    const alphabeticString = "LoremIpsumDolarSitAmet"
    const testStrWithGermanUmlaute = "LöremIpsümDölörSitÄmet"
    const numericString = "12345"

    expect( strSchemaAlpha.validate(alphabeticString).success, "should validate a valid alphabetic string" ).toBeTrue()
    expect( strSchemaAlphaDE.validate(testStrWithGermanUmlaute).success, "should validate a valid alpha(\"de-DE\") string with german umlaute" ).toBeTrue()
    expect( strSchemaAlpha.validate(numericString).success, "should NOT validate a numeric string" ).toBeFalse()
    expect( strSchemaAlpha.validate(testString).success, "should NOT validate a alphabetic string with whitespaces" ).toBeFalse()

  });

  test('StringSchema with alphanumeric constriants', () => {
    const strSchemaAlphanumeric = v.string().alphanumeric()
    const alphanumericString = "LoremIpsumDolarSitAmet123456789"
    const stringWithSpecialChars = "Lorem Ipsum Dolar Sit Amet!@#$%^&*()_+"

    expect( strSchemaAlphanumeric.validate(alphanumericString).success, "should validate a alphanumeric string" ).toBeTrue()
    expect( strSchemaAlphanumeric.validate(stringWithSpecialChars).success, "should NOT validate a string with whitespaces & special chars" ).toBeFalse()
    expect( strSchemaAlphanumeric.validate(testString).success, "should NOT validate a alphabetic string with whitespaces" ).toBeFalse()
  });

  test('StringSchema with numeric constriants', () => {
    const strSchemaNumeric = v.string().numeric()
    const validNumericString = "1234567890"

    expect( strSchemaNumeric.validate(validNumericString).success, "should validate a numeric string" ).toBeTrue()
    expect( strSchemaNumeric.validate(testString).success, "should NOT validate a alphabetic string" ).toBeFalse()
  });

  test('StringSchema with email constriants', () => {
    const strSchemaEmail = v.string().email()
    const validEmail = "mail@domain.tld"

    const listOfValidEmails = [
      'email@example.com',
      'firstname.lastname@example.com',
      'email@subdomain.example.com',
      'firstname+lastname@example.com',
      'email@123.123.123.123',
      'email@[123.123.123.123]',
      '"email"@example.com',
      '1234567890@example.com',
      'email@example-one.com',
      '_______@example.com',
      'email@example.name',
      'email@example.museum',
      'email@example.co.jp',
      'firstname-lastname@example.com',
      'much.”more\ unusual”@example.com',
      'very.unusual.”@”.unusual.com@example.com',
      'very.”(),:;<>[]”.VERY.”very@\\ "very”.unusual@strange.example.com',
    ]

    listOfValidEmails.forEach(email => {
      expect( strSchemaEmail.validate(email).success, `should validate the email: ${email}` ).toBeTrue()
    })
    expect( strSchemaEmail.validate(validEmail).success, "should validate an email formatted string" ).toBeTrue()
    expect( strSchemaEmail.validate(testString).success, "should NOT validate a non-email string" ).toBeFalse()
  });

  test('StringSchema with base64 constriants', () => {
    const strSchemaBase64 = v.string().base64()
    const validBase64 = "SGVsbG8sIFdvcmxkIQ=="

    expect( strSchemaBase64.validate(validBase64).success, "should validate a valid base64 string" ).toBeTrue()
    expect( strSchemaBase64.validate(testString).success, "should NOT validate an invalid base64 string" ).toBeFalse()

  });

  test('StringSchema with postal constriants', () => {
    const strSchemaPostal = v.string().postal()
    const strSchemaPostalBritish = v.string().postal("GB")
    const germanPostalCode = "10117"
    const britishPostalCode = "SW5 9RD"
    const austriaPostalCode = "1010"


    expect( strSchemaPostal.validate(germanPostalCode).success, "should validate a german postal code with default locale" ).toBeTrue()
    expect( strSchemaPostal.validate(britishPostalCode).success, "should NOT validate a british postal code with default locale" ).toBeFalse()
    expect( strSchemaPostal.validate(austriaPostalCode).success, "should NOT validate an austria postal code with default locale" ).toBeFalse()
    expect( strSchemaPostalBritish.validate(germanPostalCode).success, "should NOT validate a german postal code with british locale configuration" ).toBeFalse()
    expect( strSchemaPostalBritish.validate(britishPostalCode).success, "should validate a british postal code with british locale configuration" ).toBeTrue()
  });

  test('StringSchema with base64 constriants', () => {
    const strSchemaBase64 = v.string().base64()
    const validBase64 = "SGVsbG8sIFdvcmxkIQ=="

    expect( strSchemaBase64.validate(validBase64).success, "should validate a valid base64 string" ).toBeTrue()
    expect( strSchemaBase64.validate(testString).success, "should NOT validate an common string" ).toBeFalse()

  });

  test('StringSchema with ISO31661Alpha2 constriants', () => {
    const strSchemaISO31661Alpha2 = v.string().ISO31661Alpha2()
    const GermanyAsISO31661Alpha2 = "DE"
    const GermanyAsISO31661Alpha3 = "DEU"
    const USAAsISO31661Alpha2 = "US"

    expect( strSchemaISO31661Alpha2.validate(GermanyAsISO31661Alpha2).success, "should validate \"DE\"" ).toBeTrue()
    expect( strSchemaISO31661Alpha2.validate(USAAsISO31661Alpha2).success, "should validate \"US\"" ).toBeTrue()
    expect( strSchemaISO31661Alpha2.validate(GermanyAsISO31661Alpha3).success, "should NOT validate \"DEU\"" ).toBeFalse()
  });

  test('StringSchema with IBAN constriants', () => {
    const strSchemaIBANGB = v.string().IBAN("GB")
    const strSchemaIBAN = v.string().IBAN()
    const strSchemaIBANAllowlist = v.string().IBAN({ allowlist: ["DE", "GB"] })
    const strSchemaIBANBlocklist = v.string().IBAN({ blocklist: ["DE"] })
    const germanIBAN = "DE91100000000123456789"
    const ukIBAN = "GB33BUKB20201555555555"
    const ukIBANWithUnknownBIC = "GB94BARC10201530093459"
    const listOfInvalidIBANs = {
      "GB94BARC20201530093459": "Invalid IBAN check digits",
      "GB96BARC202015300934591": "Invalid IBAN length",
      "GB02BARC20201530093451": "Invalid account number",
      "GB68CITI18500483515538": "Invalid account number",
      "GB24BARC20201630093459": "Bank code not found and invalid account",
      "GB12BARC20201530093A59": "Invalid account structure",
      "GB78BARCO0201530093459": "Bank code not found and invalid bank code structure",
      "GB2LABBY09012857201707": "Invalid IBAN checksum and IBAN structure",
      "GB01BARC20714583608387": "Invalid IBAN checksum",
      "GB00HLFX11016111455365": "Invalid IBAN checksum",
      "GB64SVBKUS6S3300958879": "Country does not seem to support IBAN!",
    }


    expect( strSchemaIBAN.validate(germanIBAN).success, "should validate a valid german IBAN with default locale param" ).toBeTrue()
    expect( strSchemaIBAN.validate(ukIBAN).success, "should validate a valid IBAN from any supported country by default" ).toBeTrue()
    expect( strSchemaIBANGB.validate(ukIBAN).success, "should validate an fully compatibly uk IBAN with british locale param" ).toBeTrue()
    expect( strSchemaIBANGB.validate(ukIBANWithUnknownBIC).success, "should validate a uk IBAN (Bank code was not found) with british locale param" ).toBeTrue()
    expect( strSchemaIBANAllowlist.validate(germanIBAN).success, "should validate a allowlisted german IBAN" ).toBeTrue()
    expect( strSchemaIBANAllowlist.validate(ukIBAN).success, "should validate a allowlisted uk IBAN" ).toBeTrue()
    expect( strSchemaIBANBlocklist.validate(germanIBAN).success, "should NOT validate a blocklisted german IBAN" ).toBeFalse()
    expect( strSchemaIBANGB.validate(testString).success, "should NOT validate a common string" ).toBeFalse()
    Object.entries(listOfInvalidIBANs).forEach(([iban, errorMessage]) => {
      expect( strSchemaIBANGB.validate(iban).success, `should NOT validate the british IBAN: ${iban} - ${errorMessage}` ).toBeFalse()
    })
  });

  test ('StringSchema with BIC constriants', () => {
    const strSchemaBIC = v.string().BIC()
    const barclaysBIC = "BARCGB22"
    const berSparkasseBIC = "BELADEBEXXX"
    const eightCharactersNumeric = "12345678"
    const eightCharactersAlpha = "ABCDEFGH" // regex-valid format but invalid country code EF
    const lowercaseBIC = "barcgb22"
    const bicWithWhitespace = "  BARCGB22  "

    expect( strSchemaBIC.validate(barclaysBIC).success, "should validate the 8 characters barclays BIC" ).toBeTrue()
    expect( strSchemaBIC.validate(berSparkasseBIC).success, "should validate the berliner spaarkasse BIC with branch code" ).toBeTrue()
    expect( strSchemaBIC.validate(lowercaseBIC).success, "should validate a lowercase BIC after normalisation" ).toBeTrue()
    expect( strSchemaBIC.validate(bicWithWhitespace).success, "should validate a BIC surrounded by whitespace after normalisation" ).toBeTrue()
    expect( strSchemaBIC.validate(testString).success, "should NOT validate a common string" ).toBeFalse()
    expect( strSchemaBIC.validate(eightCharactersNumeric).success, "should NOT validate a 8 character long numerical string" ).toBeFalse()
    expect( strSchemaBIC.validate(eightCharactersAlpha).success, "should NOT validate an alpha string with an invalid country code" ).toBeFalse()
  });

});

/*
.##....##.##.....##.##.....##.########..########.########.
.###...##.##.....##.###...###.##.....##.##.......##.....##
.####..##.##.....##.####.####.##.....##.##.......##.....##
.##.##.##.##.....##.##.###.##.########..######...########.
.##..####.##.....##.##.....##.##.....##.##.......##...##..
.##...###.##.....##.##.....##.##.....##.##.......##....##.
.##....##..#######..##.....##.########..########.##.....##
*/ 
describe('Number Validation', () => {
  const integer = 123
  const negativeInt = -123
  const float = 123.45
  const bigInt = BigInt(12345678901234567890)

  test('NumberSchema without constriants', () => {
    const numSchema = v.number()
    const testString = "123456789"

    expect( numSchema.validate(integer).success, "should validate an integer value" ).toBeTrue()
    expect( numSchema.validate(float).success, "should validate a float value" ).toBeTrue()
    expect( numSchema.validate(bigInt).success, "should validate a bigInt value" ).toBeTrue()
    expect( numSchema.validate(negativeInt).success, "should validate a negative value" ).toBeTrue()
    expect( numSchema.validate(testString).success, "should NOT validate a string value" ).toBeFalse()
    expect( numSchema.validate(null).success, "should NOT validate null" ).toBeFalse()
    expect( numSchema.validate(undefined).success, "should NOT validate undefined").toBeFalse()
  });

  test('NumberSchema with min(5) and max(5) constriants', () => {
    const numSchemaWithMinMaxConstraints = v.number().min(5).max(5)

    const four = 4
    const six = 6
    const five = 5
    const negativeFive = -5

    expect( numSchemaWithMinMaxConstraints.validate(four).success, "should NOT validate a four when min(5).max(5)" ).toBeFalse()
    expect( numSchemaWithMinMaxConstraints.validate(six).success, "should NOT validate a six when min(5).max(5)" ).toBeFalse()
    expect( numSchemaWithMinMaxConstraints.validate(negativeFive).success, "should NOT validate a negative five when min(5).max(5)" ).toBeFalse()
    expect( numSchemaWithMinMaxConstraints.validate(five).success, "should validate a five when min(5).max(5)" ).toBeTrue()
  });

  test('NumberSchema with integer constriants', () => {
    const numSchemaInt = v.number().int()

    
    expect( numSchemaInt.validate(integer).success, "should validate a integer" ).toBeTrue()
    expect( numSchemaInt.validate(negativeInt).success, "should validate a negative integer" ).toBeTrue()
    expect( numSchemaInt.validate(bigInt).success, "should validate a BigInt number" ).toBeFalse()
    expect( numSchemaInt.validate(float).success, "should NOT validate a float number" ).toBeFalse()
  });

  test('NumberSchema with positive constriants', () => {
    const numSchemaPositive = v.number().positive()
    const negativeBigInt = BigInt(-12345678901234567890)
    
    expect( numSchemaPositive.validate(integer).success, "should validate a positive integer" ).toBeTrue()
    expect( numSchemaPositive.validate(float).success, "should validate a positive float" ).toBeTrue()
    expect( numSchemaPositive.validate(bigInt).success, "should validate a positive BigInt number" ).toBeFalse()
    expect( numSchemaPositive.validate(negativeInt).success, "should NOT validate a negative int number" ).toBeFalse()
    expect( numSchemaPositive.validate(negativeBigInt).success, "should NOT validate a negative BigInt number" ).toBeFalse()
    expect( numSchemaPositive.validate(0).success, "should NOT validate a zero" ).toBeFalse()
  });

   test('NumberSchema with negative constriants', () => {
    const numSchemaNegative = v.number().negative()
    const negativeBigInt = BigInt(-12345678901234567890)

    expect( numSchemaNegative.validate(negativeInt).success, "should validate a negative integer" ).toBeTrue()
    expect( numSchemaNegative.validate(negativeBigInt).success, "should validate a negative BigInt" ).toBeTrue()  

    expect( numSchemaNegative.validate(integer).success, "should NOT validate a integer" ).toBeFalse()
    expect( numSchemaNegative.validate(bigInt).success, "should NOT validate a positive BigInt number" ).toBeFalse()
    expect( numSchemaNegative.validate(float).success, "should NOT validate a float number" ).toBeFalse()
    expect( numSchemaNegative.validate(0).success, "should NOT validate a zero" ).toBeFalse()

  });

  test('NumberSchema with multipleOf constriants', () => {
    const numSchemaMultipleOf5 = v.number().multipleOf(5)
    const negativeMultipleOf5 = -25
    const multipleOf5 = 15


    expect( numSchemaMultipleOf5.validate(integer).success, "should NOT validate 123 as a multiple of 5" ).toBeFalse()
    expect( numSchemaMultipleOf5.validate(float).success, "should NOT validate 123.45 multiple of 5" ).toBeFalse()  
    expect( numSchemaMultipleOf5.validate(multipleOf5).success, "should validate 15 as a multiple of 5" ).toBeTrue()
    expect( numSchemaMultipleOf5.validate(negativeMultipleOf5).success, "should validate -25 as a multiple of 5" ).toBeTrue()
  });


});

/*
.########...#######...#######..##.......########....###....##....##
.##.....##.##.....##.##.....##.##.......##.........##.##...###...##
.##.....##.##.....##.##.....##.##.......##........##...##..####..##
.########..##.....##.##.....##.##.......######...##.....##.##.##.##
.##.....##.##.....##.##.....##.##.......##.......#########.##..####
.##.....##.##.....##.##.....##.##.......##.......##.....##.##...###
.########...#######...#######..########.########.##.....##.##....##
*/
describe('Boolean Validation', () => {
  const wahr = "wahr"
  const falsch = "falsch"
  const zero = 0
  const one = 1

  test('BooleanSchema with no constraints', () => {
    const boolSchema = v.boolean()

    expect( boolSchema.validate(true).success, "should validate true as a boolean" ).toBeTrue()
    expect( boolSchema.validate(false).success, "should validate false as a boolean" ).toBeTrue()
    expect( boolSchema.validate(wahr).success, "should NOT validate a string as a boolean" ).toBeFalse()
    expect( boolSchema.validate(zero).success, "should NOT validate a 0 as a boolean" ).toBeFalse()
    expect( boolSchema.validate(one).success, "should NOT validate a 1 as a boolean" ).toBeFalse()
    expect( boolSchema.validate(null).success, "should NOT validate null" ).toBeFalse()
    expect( boolSchema.validate(undefined).success, "should NOT validate undefined").toBeFalse()
  });

  test('BooleanSchema with true constraints', () => {
    const boolSchema = v.boolean().true()

    expect( boolSchema.validate(true).success, "should validate true as true" ).toBeTrue()
    expect( boolSchema.validate(false).success, "should NOT validate false as true" ).toBeFalse()
    expect( boolSchema.validate(wahr).success, "should NOT validate a string as a true" ).toBeFalse()
    expect( boolSchema.validate(one).success, "should NOT validate a number as a true" ).toBeFalse()
  });
   test('BooleanSchema with false constraints', () => {
    const boolSchema = v.boolean().false()

    expect( boolSchema.validate(true).success, "should NOT validate true as false" ).toBeFalse()
    expect( boolSchema.validate(false).success, "should validate false as false" ).toBeTrue()
    expect( boolSchema.validate(falsch).success, "should NOT validate a string as a false" ).toBeFalse()
    expect( boolSchema.validate(zero).success, "should NOT validate a number as a false" ).toBeFalse()
  });

  test('BooleanSchema with truthy constraints using JS coercion', () => {
    const boolSchema = v.boolean().truthy()
    const testString = "Lorem Ipsum Dolar Sit Amet"
    const emptyString = ""


    expect( boolSchema.validate(true).success, "should validate true as truthy" ).toBeTrue()
    expect( boolSchema.validate(false).success, "should NOT validate false as truthy" ).toBeFalse()
    expect( boolSchema.validate(testString).success, "should validate a \"wahr\" as truthy" ).toBeTrue()
    expect( boolSchema.validate(testString).success, "should validate a common string as truthy" ).toBeTrue()
    expect( boolSchema.validate(one).success, "should validate a 1 as a truthy" ).toBeTrue()
    expect( boolSchema.validate(zero).success, "should NOT validate zero as truthy" ).toBeFalse()
    expect( boolSchema.validate(null).success, "should NOT validate null as truthy" ).toBeFalse()
    expect( boolSchema.validate(undefined).success, "should NOT validate undefined as truthy" ).toBeFalse()
    expect( boolSchema.validate(NaN).success, "should NOT validate NaN as truthy" ).toBeFalse()
    expect( boolSchema.validate(emptyString).success, "should NOT validate an empty string as truthy" ).toBeFalse()
  });
   test('BooleanSchema with falsy constraints using JS coercion', () => {
    const boolSchema = v.boolean().falsy()
    const testString = "Lorem Ipsum Dolar Sit Amet"
    const emptyString = ""

    expect( boolSchema.validate(true).success, "should NOT validate true as falsy" ).toBeFalse()
    expect( boolSchema.validate(false).success, "should validate false as falsy" ).toBeTrue()
    expect( boolSchema.validate(testString).success, "should NOT validate a \"wahr\" as falsy" ).toBeFalse()
    expect( boolSchema.validate(testString).success, "should NOT validate a common string as falsy" ).toBeFalse()
    expect( boolSchema.validate(one).success, "should NOT validate a 1 as a falsy" ).toBeFalse()
    expect( boolSchema.validate(zero).success, "should validate zero as falsy" ).toBeTrue()
    expect( boolSchema.validate(null).success, "should validate null as falsy" ).toBeTrue()
    expect( boolSchema.validate(undefined).success, "should validate undefined as falsy" ).toBeTrue()
    expect( boolSchema.validate(NaN).success, "should validate NaN as falsy" ).toBeTrue()
    expect( boolSchema.validate(emptyString).success, "should validate an empty string as falsy" ).toBeTrue()
  });
});

/*
.########.....###....########.########
.##.....##...##.##......##....##......
.##.....##..##...##.....##....##......
.##.....##.##.....##....##....######..
.##.....##.#########....##....##......
.##.....##.##.....##....##....##......
.########..##.....##....##....########
*/
describe('Date Validation', () => {
  const isValidDate = (date: unknown) => date && Object.prototype.toString.call(date) === "[object Date]" && !isNaN(date as number);



  test('DateSchema without constriants', () => {
    const dateSchema = v.date()
    const testString = "Lorem Ipsum Dolar Sit Amet"

    const dateStr = "2011-09-17"
    const timestampString = "1886-05-04T20:30:00.000Z"
    const timestampAsNumber = -2640051000000
    const dateObject = new Date(dateStr)
    const timestampObject = new Date(timestampString)


    expect( dateSchema.validate(dateObject).success, "should validate a date object without timestmap" ).toBeTrue()
    expect( validatedValue(dateSchema.validate(dateObject)), "should hold a the date object" ).toEqual(dateObject)
    expect( dateSchema.validate(timestampObject).success, "should validate a date object with timestamp" ).toBeTrue()
    expect( dateSchema.validate(dateStr).success, "should validate a date string" ).toBeTrue()
    expect( dateSchema.validate(timestampString).success, "should validate a timestamp string" ).toBeTrue()
    expect( dateSchema.validate(timestampAsNumber).success, "should validate timestamp as number" ).toBeTrue()
    expect( dateSchema.validate(testString).success, "should NOT validate a common string" ).toBeFalse()
    expect( dateSchema.validate(null).success, "should NOT validate null" ).toBeFalse()
    expect( dateSchema.validate(undefined).success, "should NOT validate undefined" ).toBeFalse()
  });

  test('DateSchema with after and before constraints', () => {
    const merkelEraStart = new Date("2005-11-22")
    const merkelEraEnd = new Date("2021-12-08")
    const dateSchemaWithConstraints = v.date().after(merkelEraStart).before(merkelEraEnd)
    const beforeMinDate = new Date("2005-11-21")
    const afterMaxDate = new Date("2021-12-09")
    const obamaInauguration = new Date("2009-01-20")

    expect( dateSchemaWithConstraints.validate(beforeMinDate).success, "should NOT validate a date before the given constraint" ).toBeFalse()
    expect( dateSchemaWithConstraints.validate(afterMaxDate).success, "should NOT validate a date after the given constraint" ).toBeFalse()
    expect( dateSchemaWithConstraints.validate(obamaInauguration).success, "should validate a date within the given constraint" ).toBeTrue() 
    expect( validatedValue(dateSchemaWithConstraints.validate(obamaInauguration)), "should hold the given value of the validated date" ).toEqual(obamaInauguration)    
   
  });

  test('DateSchema enforced coercion', () => {
    const dateSchemaThatFallbacks = v.date().populate()
    const oneYearInMilliseconds = 365 * 24 * 60 * 60 * 1000
    const oneYearAgo = new Date(Date.now() - oneYearInMilliseconds)
    const obamaInauguration = new Date("2009-01-20")
    const dateSchemaFallbacksToConstraint = v.date().before(obamaInauguration).after(obamaInauguration).populate()

    expect( isValidDate(validatedValue(dateSchemaThatFallbacks.validate(""))), "should generate a Date object" ).toBeTrue()
    expect( (validatedValue(dateSchemaThatFallbacks.validate("")) >= oneYearAgo), "should generate a Date Object that is no later than oneYearAgo" ).toBeTrue()
    expect( validatedValue(dateSchemaThatFallbacks.validate(obamaInauguration)), "should validate and hold the given date object" ).toEqual(obamaInauguration)
    expect( validatedValue(dateSchemaFallbacksToConstraint.validate("")), "should generate a Date object that is before and after the given constraint" ).toEqual(obamaInauguration)
  
  });
});

/*
..#######..########........##.########..######..########
.##.....##.##.....##.......##.##.......##....##....##...
.##.....##.##.....##.......##.##.......##..........##...
.##.....##.########........##.######...##..........##...
.##.....##.##.....##.##....##.##.......##..........##...
.##.....##.##.....##.##....##.##.......##....##....##...
..#######..########...######..########..######.....##...
*/
describe('Object Validation', () => {
  const testDateStr = "2011-09-17"
  const testTimestampString = "1886-05-04T20:30:00.000Z"
  const testTimestampAsNumber = -2640051000000



});

/*
....###....########..########.....###....##....##
...##.##...##.....##.##.....##...##.##....##..##.
..##...##..##.....##.##.....##..##...##....####..
.##.....##.########..########..##.....##....##...
.#########.##...##...##...##...#########....##...
.##.....##.##....##..##....##..##.....##....##...
.##.....##.##.....##.##.....##.##.....##....##...
*/
describe('Array Validation', () => {
  const testDateStr = "2011-09-17"
  const testTimestampString = "1886-05-04T20:30:00.000Z"
  const testTimestampAsNumber = -2640051000000



});

/*
..######...#######..########.########...######..####..#######..##....##
.##....##.##.....##.##.......##.....##.##....##..##..##.....##.###...##
.##.......##.....##.##.......##.....##.##........##..##.....##.####..##
.##.......##.....##.######...########..##........##..##.....##.##.##.##
.##.......##.....##.##.......##...##...##........##..##.....##.##..####
.##....##.##.....##.##.......##....##..##....##..##..##.....##.##...###
..######...#######..########.##.....##..######..####..#######..##....##
*/
describe('Coercion', () => {
  const testNum = 123456789
  const testNumStr = "123456789"
  const testBoolStr = "0"
  const testCustomBool = "wahr"
  const testDateStr = "2011-09-17"
  const testTimestampString = "1886-05-04T20:30:00.000Z"
  const testTimestampAsNumber = -2640051000000
  
  test('should coerce the values', () => {
    const strSchema = v.string().coerce()
    const numSchema = v.number().coerce()
    const boolSchema = v.boolean().coerce()
    const customBoolSchema = v.boolean().boolish()
    const dateSchema = v.date()

    expect( validatedValue(strSchema.validate(testNum)), "string().coerce() should coerce to a string" ).toBe(String(testNum))
    expect( validatedValue(numSchema.validate(testNumStr)), "number().coerce() should coerce to a number" ).toBe(Number(testNumStr))
    expect( validatedValue(boolSchema.validate(testBoolStr)), "boolean().coerce() should coerce to a bool" ).toBe(Boolean(testBoolStr))
    expect( validatedValue(customBoolSchema.validate(testCustomBool)), "boolean().boolish() should coerce \"wahr\" to a true" ).toBeTrue()
    expect( validatedValue(dateSchema.validate(testDateStr)), "date() should coerce a date string to a Date object" ).toEqual(new Date(testDateStr))
    expect( validatedValue(dateSchema.validate(testTimestampString)), "date() should coerce a timestamp string to a Date object" ).toEqual(new Date(testTimestampString))
    expect( validatedValue(dateSchema.validate(testTimestampAsNumber)), "date() should coerce a timestamp number to a Date object" ).toEqual(new Date(testTimestampAsNumber))
  });
});