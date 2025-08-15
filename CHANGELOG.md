## [unreleased]

### 🚀 Features

- Add ip-address validation to string schemata
- Add transform methods to StringSchema
- Add param to boolean().boolish() to be used as a custom set of boolish values for the customCoercion

### 🐛 Bug Fixes

- Prevent plain objects from being coerced to string
- Seperate default & catch logic during preValidationCheck
- Return nullable and nullish schemas with a widened type

### 🚜 Refactor

- Refactor _coerceFromBoolish to use a normalized string
- Refactor boolish coercion to use a set of values over switch-statement
- Use protected properties over private for base schema make them accessible for extended schemas
- Prevalidationchecks to return validationResult as a value or the given value
- Pipe sucessfull validations through postValidationCheck
## [0.2.0] - 2025-07-02

### 🚀 Features

- Allow date schema to pass raw values instead of a date object
- Add support for custom predefined enums

### 🐛 Bug Fixes

- Use const generic in v.literal and v.enum for correct type inference in objects and arrays
- Missing negation for number min/max/positive/negative check
- Date schema should return a proper date object
- Type nullable and nullish schematas as a union type of the schema and null
- Prevent dateSchema from validating null dates
- Prevent dateSchema.validation from changing the date constraints when using the schema validation a second time
- Remove double assertion
- Preserve type assertion throughout validation of literalSchemas

### 💼 Other

- Edit comment to clarify usage with empty base64 strings
- Remove newline at EOF
- Remove unreachable code
- Make public static property readonly
- Use keyof available locales over string for string constraint parameters
- Remove deprecated functions for upcoming breaking release
- Add startsWith & endsWith methods to stringSchema AND reorder existing string schema
- Update README.md
- Remove deprecated classes for upcoming breaking release
- Rename dateSchema.enforce() to dateSchema.populate()
- Version bump

### 🚜 Refactor

- Refactor DateObject Validation into seperate arrow function
## [0.1.2] - 2025-05-23

### 🐛 Bug Fixes

- Fix missing negation of regex.test for base64, alpha, alphanumeric, numeric

### 💼 Other

- Initial commit
- Initial commit
- Update comments
- Deduplicate code by using this.catch as a reference within base schema
- Version bump
