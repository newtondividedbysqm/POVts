# POVts
Plain Old Validator Schematas for JS/TS

The Goal of this Validator is to work without any external dependencies or node modules. This way this script also works in custom locked down typescript-based-envrioments where the developer might not has access to install dependencies like zod.
In Addition the Validator is written as a single script file and does not split up business logic into different components this allows for easier updating and transfer of the validation script within such a locked down envrioment.

Update Changelog with `npx git-cliff@latest`  
Run tests with `npm test`

## Development
### philosophies and patterns
This validator aims to provide detailed documentation via JSDoc.  
We use Semantic Versioning and Conventional Commits .

The schema classes make use of commutative method chaining. Meaning constriant methods can be used in any call order without affecting the validation logic. This keeps usage expressive and ensures a predictable output.

### Tests & Coverage report
This project runs in a custom locked down environment, so the original internal test library is not publicly available. For local development we use a lightweight mock test runner that mirrors the familiar `describe`, `test`, and `expect` APIs.  
Coverage is collected with [c8](https://github.com/bcoe/c8), which uses V8 runtime coverage from Node.js, the coverage output is written to the `coverage/` directory.


#### ts-node / JIT Compiler
We are using ts-node to run our typescript files.
ts-node runs a just-in-time (JIT) Compiler, so we can run our `.ts` scripts directly withot prcompiling to `.js` and polluting our project repository.

#### Available scripts:

- `npm test`  
**Runs the test suite and writes the standard covergae report**
- `npm run test:transpile-only`  
Runs the test suite without coverage and without typechecking, using an alternative faster tsc compiler moder. Runtime errors will still be catched but all type-errors are dismissed
- `npm run test:coverage`  
Runs the test suite without typechecking and writes the standard coverage report.
- `npm run test:coverall`  
Runs the test suite without typechecking but also prints the detailed per-file coverage table.


> Hint: when using npm scripts, you can pass runtime args after `--` so they reach `process.argv`. 


## Usage example
import the validator file directly via `import {v} from './index'` and change the path accordingly

```ts
import {v} from './index'

let rawData = /** some external unknown data */
let exampleSchema = v.object({
    id: v.number().positive(),
    username: v.string().nonEmpty()
})

let validationResult = exampleSchema.validate(rawData)

if(validationResult.success) {
    var validatedData = validationResult.value
} else {
    var responseError = validationResult.error
}
```
see `usage.ts` for more detailed usage Examples