# Tools
From the repository root, run `python3 design-system/tools/validate.py` to check baseline and selected references. `--manifest <relative path>` validates a different selection. `--release` fails unless all selected modules and tokens are approved. It does not replace browser QA. No production build or deployment is invoked.

The catalog allows selection and JSON export of existing source variants only; these are references, not composable production modules. Use exported selection as an integration brief.
