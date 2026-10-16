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

## Keep it current

```sh
rant update          # the CLI, the explorer and your packages' Rant
rant setup           # tab completion for your shell
rant uninstall       # remove it all, workspaces stay
```
