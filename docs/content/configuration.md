# Configuration

Workspaces are described in HCL.

## Workspace

```hcl
workspace "demo" {
  node "camera" {
    path    = "nodes/camera"
    restart = true
    env = {
      FPS = 30
    }
  }
}
```
