# Run groups

A run group is a list of nodes or other run groups which need to run together. You should almost always start up a system by running groups, not nodes.
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

A group can start another group with `include`:

```hcl
include "Arm" {
  side        = "left"     # sets a param of Arm
  node_prefix = "left"     # its nodes become left/..., so two arms can run
  expose      = ["speed"]  # Arm's speed becomes a param of this group
}
```

`expose = true` passes up every param of Arm left unset here. An include also takes
`domain`, `prefix` and `restart`. `rant run` takes the same keys: `rant run Arm side=left domain=3`.

A node's names can move with `remap`, so a filter can stand between a node and its readers:

```hcl
node "ft_sensor" {
  remap = { "Wrench" = "Wrench/Raw" }   # the sensor now publishes Wrench/Raw
}
node "wrench_filter" {}                 # reads Wrench/Raw, publishes Wrench
```

A node that should come back when it exits sets `restart`:

```hcl
restart = "on-failure"   # or "always", "never" by default

node "camera" {}
```

It goes at the top of a group, on an `include` or on a `node`, and the innermost wins.
`rant stop` stops such a node for good.