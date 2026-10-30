# Packages

A package is a folder with a build file that uses Rant: `CMakeLists.txt`, `pyproject.toml`
or a `.csproj`. `rant build` builds every package recursively in the current working directory.

Each executable artifact in a package is automatically discovered as a node.
The `package.rant` file is not required for something to be a package. Rant assumes any build ssytem root is a package. However fi you want to configure the package differently you must add one

Here are all the options available to configure a package:
```hcl
name        = "vision"                         # the build file's name, else the folder's
description = "Finds parts on the conveyor"    # shown by rant info package
build       = ["pip install -e .", "python tools/fetch_models.py"]  # replaces the default build
depend      = ["vision_msgs"]                  # packages built before this one
ignore      = ["tests/**", "**/calibrate*"]    # files and folders that are never nodes
python      = ".venv/bin/python"               # runs its Python nodes, the nearest venv by default
domain      = 7                                # placement, as in workspace.rant
prefix      = "Vision"
node_prefix = "vision"

node "streamer" {                              # a program rant cannot find by itself
  run         = "${path.package}/tools/stream.sh --camera 0"
  expect_mesh = false                          # never joins the mesh, so rant run waits only for it to start
}
```

If you want your package to be installable with the rant package manager, give it a `name` and publish GitHub releases whose files are named by rule:

```
vision-1.2.0-win-x64.tar.gz   # unpacked into ~/.rant/packages/vision, one for each platform
vision-1.2.0.vsix             # put into editors
```

The version is the release tag without its v, such as `v1.2.0` or `1.2.0-beta.1`.
