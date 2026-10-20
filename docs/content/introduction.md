# Introduction

RANT is the Robotics Automation Networking Toolkit. It consists of a small pub sub middleware library and a set of powerful and easy to use tooling built around it to make development as easy as possible.

## Install

**Linux & MacOS**
```sh
curl -fsSL https://get.rantlib.dev | sh
```

**Windows**
```sh
irm https://get.rantlib.dev | iex
```

## Start your first node

If this is your first time using RANT it will be useful to see an example. We will create a new rant project with the template workspace:

```sh
mkdir Example
cd Example
rant new workspace --lang python
```

This will initialize the current directory with a workspace template. We will use python, but you may use cpp, or csharp as well.
Now lets see what exists here. This will list all rant nodes in the workspace and will also show a list of online nodes if there are any.
You should see two: `talker` and `listener`:

```console
$ rant ls nodes
[1mNODES[0m
[38;2;100;100;100m  (none)[0m

[1mNOT RUNNING[0m
  Example/listener  [38;2;154;154;154mpython[0m  [38;2;154;154;154msrc/listener.py[0m
  Example/talker    [38;2;154;154;154mpython[0m  [38;2;154;154;154msrc/talker.py[0m
```

The example includes one group file `Example.run`. This defines a node group that runs together.
Start it:

```console
$ rant run Example
[1mExample/Example[0m

  [38;2;55;136;95m●[0m talker    started  [38;2;154;154;154mpid 26788   logs/talker.log[0m
  [38;2;55;136;95m●[0m listener  started  [38;2;154;154;154mpid 62548   logs/listener.log[0m

2 started, all running after 2 s
```

Now that both nodes are running we can list what is active on the network:

```console
$ rant ls nodes
[1mNODES[0m
  [38;2;100;100;100mExample/Example:[0m
    [38;2;55;136;95m●[0m talker      [38;2;55;136;95m●[0m listener

[1mNOT RUNNING[0m
[38;2;100;100;100m  (none)[0m

$ rant ls entities
[1mENTITIES[0m
  Pose  [38;2;154;154;154mtopic[0m
```


As you can see our two nodes are running, and there is a topic named `Pose`. Lets see what data is on it:

```console
$ rant sub Pose
[1mPose[0m  [38;2;100;100;100mfrom talker     2.0 Hz  9 messages[0m
[38;2;154;154;154mposition[0m[38;2;100;100;100m:[0m
  [38;2;154;154;154mx[0m[38;2;100;100;100m:[0m -0.82
  [38;2;154;154;154my[0m[38;2;100;100;100m:[0m  0.57
[38;2;154;154;154mangle[0m[38;2;100;100;100m:[0m     16.67
```

This is great but it is not very visual. So lets open the explorer:

```sh
rant explorer
```

now we can see the list of topics (just Pose). Click on `Pose` to show it's value:

![Topics screen of rant explorer showing a "Pose" topic](explorer-visualizer.png)
