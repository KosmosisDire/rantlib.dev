# Configuration

rant finds the programs in a workspace by itself, so most projects need very little
configuration. This page walks through the few files there are, using the `Example`
workspace from the [Introduction](/introduction).

## The workspace

`workspace.rant` marks the root of a workspace. It starts out empty, which is fine.

## Groups

A group is a list of nodes that run together, and the normal way to start a system.
`Example.run` holds:

```hcl
description = "The talker and the listener"

node "talker" {}
node "listener" {}
```

`rant run Example` starts both. Make another group with `rant new group drive`, which
writes `Drive.run`.

A group can take settings, called params, and pass them to its programs:

```hcl
param "fps" {
  type    = int
  default = 30
}

node "camera" {
  args = "--fps ${param.fps}"
}
```

Then `rant run Camera fps=60` picks the value, and `rant run Camera --help` lists
the params.

A node that should come back when it exits sets `restart`:

```hcl
restart = "on-failure"   # or "always", "never" by default

node "camera" {}
```

It goes at the top of a group, on an `include` or on a `node`, and the innermost wins.
`rant stop` stops such a node for good.

## Packages

A package is a folder with a build file that uses Rant: `CMakeLists.txt`, `pyproject.toml`
or a `.csproj`. `rant build` builds every package, and each program in one becomes a node.

Add a `package.rant` only to change something, such as how it builds, or a program rant
cannot find by itself:

```hcl
build = "npm run build"

node "dashboard" {
  run = "npm run serve"
}
```

## Names

- Nodes are snake_case and named after their file: `arm_controller.py`.
- Topics and other entities are PascalCase: `FrontLidar/JointState`.
- Groups are PascalCase: `Nav`. Names match case exactly, so the group `Nav` and the node
  `nav` stay apart.
