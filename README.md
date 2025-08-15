# POVts
Plain Old Validator Schematas for JS/TS

The Goal of this Validator is to work without any external dependencies or node modules. This way this script also works in custom locked down typescript-based-envrioments where the developer might not has access to install dependencies like zod.
In Addition the Validator is written as a single script file and does not split up business logic into different components this allows for easier updating and transfer of the validation script within such a locked down envrioment.

Update Changelog with `npx git-cliff@latest`
