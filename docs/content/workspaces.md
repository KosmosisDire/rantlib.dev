# Workspaces

You can create a workspace with the `rant new workspace` cli command. It creates a workspace out of the current working directory. It does not create its own directory.
The `workspace.rant` marks the root of a workspace. 

Here is an example of a `workspace.rant` file with all configureations:
```hcl
logs        = "logs"              # where node output goes, logs by default
ignore      = ["third_party/**"]  # folders rant skips when it looks for packages
domain      = 7                   # the domain every node here joins, 0 to 65535
prefix      = "Cell1"             # goes in front of every entity name: Cell1/Arm/JointState
node_prefix = "cell1"             # goes in front of every node name: cell1/arm

service "Hmi" {                   # a group rant run starts, and every boot once enabled
  project = "line-hmi"            # its param values
}
```

If you run any rant command from within the workspace it will use this configuration.