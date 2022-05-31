# import_maps_codemod

Code modification script for automatically adding and removing import map
usage in a codebase.

## Quick start

At the root of your project, run:

#### Remove all bare imports
```
deno run --allow-all --no-check https://deno.land/x/import_maps_codemod@0.1.1/mod.ts remove
```

#### Restore import map imports
```
deno run --allow-all --no-check https://deno.land/x/import_maps_codemod@0.1.1/mod.ts add
```

## Usage

```
Usage: 
    deno run --allow-all --no-check https://deno.land/x/import_maps_codemod/mod.ts
    [add|remove] [pattern]

The commands are:
    add      parse an import map and apply the bare imports to the codebase
    remove   parse an import map and remove all bare imports from the codebase

The options are:
    pattern  regex pattern to determine which files to modify (default: "/\.[tj]sx?$/")
```
