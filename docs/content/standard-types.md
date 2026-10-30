# Standard types

Rant comes with types for common data, so two programs that both mean "a pose" use the
same name and the same bytes. Every name below works in any schema, as a topic type or as
a field:

```
Waypoint { at: Transform, when: Timestamp, tag: Color }
```

Open a type to see its fields and their units.

## Units and frames

- Physical values are SI: meters, seconds, newtons and radians.
- A 3D frame is right handed with z up. A 2D frame is its top view: x right, y up.
- An image frame starts at the top left corner: x right, y down, in pixels.
- An angle turns from +x toward +y.
- `m or px` means meters in a physical frame and pixels in an image frame.
- Time is in microseconds (`us`). A `Timestamp` counts from the Unix epoch in UTC.

## Vectors and matrices

```types
Float2 Float3 Float4
Double2 Double3 Double4
Int2 Int3 Int4
Matrix3x3 Matrix4x4
Covariance3 Covariance6
```

## Position and orientation

```types
Pose Pose2D
Transform Transform2D
Quaternion
GeoPoint
PoseWithCovariance
```

## Motion and force

```types
Twist Twist2D
Accel Accel2D
Wrench Wrench2D
TwistWithCovariance
Odometry
```

## 3D shapes

```types
AlignedBox OrientedBox Plane Segment Ray Sphere Capsule Cylinder Cone Polygon Prism
Polyline Path
```

## 2D shapes

```types
AlignedBox2D OrientedBox2D Plane2D Segment2D Ray2D Circle Capsule2D Polygon2D
Polyline2D Path2D
```

## Sensors

```types
CameraIntrinsics DistortionModel
Imu LaserScan
RangeReading RangeKind
GnssFix GnssStatus
Detection2D Detection3D
```

## Robots

```types
JointState JointNames
JointTrajectory JointTrajectoryPoint
Inertia
```

## Point clouds, meshes and grids

```types
PointCloud PointField Mesh
Grid GridField
ScalarKind Tensor
```

## Images and video

```types
Image ImageFormat
VideoFrame VideoCodec
ExternalVideoStream VideoStreamKind
```

## Time and ids

```types
Timestamp Duration Uuid
```

## Other

```types
Color Uri File Empty
```
