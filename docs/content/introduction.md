# Introduction

RANT is the Robotics Automation Networking Toolkit. It consists of a small pub sub middleware library and a set of powerful and easy to use tooling built around it to make development as easy as possible.

## Install

**Linux & MacOS**
```sh
curl -fsSL https://get.rantlib.dev | sh
```

**Windows**
```powershell
irm https://get.rantlib.dev | iex
```

## Start your first node

If this is your first time using RANT it will be useful to see an example. We will create a new rant project with the template workspace:

```sh
rant new workspace --python
```

This will initialize the current directory with a workspace template. We will use python, but you may use cpp, or csharp as well.
Now lets see what exists here:

```sh
rant ls nodes --all
```

This will list all rant nodes in the workspace and will also show a list of online nodes if there are any.
You should see two: `talker` and `listener`

Now 