# Configuration

Rant finds the programs in a workspace automatically, so most projects need very little
configuration. Workspaces, packages, and run groups are the main 3 files you will configure when working with rant.

Configuration files are written in a configuration language called HCL. It was chosen because it is easy to read and write (much more so than xml, or json) while being quite powerful.

## Naming Convention

- Nodes are snake_case and named after their file: `arm_controller.py`.
- Topics and other entities are PascalCase: `FrontLidar/JointState`.
- Groups are PascalCase: `Nav`. Names match without case or underscores, so the group `Nav`
  and the node `nav` are one name and the group wins. `rant stop node nav` stops the node
  alone.
