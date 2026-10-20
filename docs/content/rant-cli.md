# Rant Cli

`rant` is the command that makes, builds, runs and inspects Rant projects. `rant --help`
lists every command, and `rant <command> --help` explains one.

## Every day

```sh
rant new workspace --lang python   # start a project, or --lang cpp, csharp
rant build                         # build it
rant run ExampleGroup              # start a group of nodes
rant ls                            # see what is running
rant log ExampleGroup -f           # follow what the nodes print
rant restart ExampleGroup          # rebuild and start again
rant stop ExampleGroup             # stop them
```

## Look at the mesh

```sh
rant sub Pose        # watch a topic
rant info Pose       # what it is and who uses it
rant explore         # open the visual debugger
```

## Install packages

```sh
rant ls packages --available   # what there is
rant install explorer          # the visual debugger
rant remove explorer
```

[pack.rantlib.dev](https://pack.rantlib.dev) shows every package with its README.

## Keep it current

```sh
rant update          # the CLI, installed packages and your packages' Rant
rant setup           # tab completion for your shell
rant uninstall       # remove it all, workspaces stay
```
