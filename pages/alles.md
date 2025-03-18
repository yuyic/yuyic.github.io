---
layout: default
---

# Alles Rust-WASM: Handle Intensive Computation

## Overview

Alles is an AI annotation tool integrated with [Cyclone RPA](https://en.cyclone-robotics.com/), responsible for recognizing hotspot areas from screenshots. These hotspot areas are displayed as irregularly shaped strokes in an HTML Canvas, which are editable, movable, and groupable.

## Challenges

The challenge arose with rendering performance, especially when handling tens of thousands of shapes. Every edit triggered collision detection between shapes, leading to intensive computation and significant performance bottlenecks.

## Solutions

To address this issue, I utilized Rust-WASM to handle the data changes of shapes, leaving JavaScript solely responsible for rendering the results. This solution was implemented through `wasm_bindgen`.

### CollisionShape Implementation

The logic of the `CollisionShape` is as follows:

```rust
/// collision_shape.rs

#[wasm_bindgen]
#[derive(Debug)]
pub struct CollisionShape {
    edges: Vec<Edge>,          // List of edges connecting vertices
    shape_points: Vec<Point>,  // Original points defining the shape
    vertices: Vec<Point>,      // Transformed vertices for collision detection
    bounds: Bounds,            // Bounding box for optimization
}

impl CollisionShape {
    /// Creates a new collision shape from a list of vertices.
    pub fn new(vertices: Vec<Point>) -> Self {
        let mut shape_points: Vec<Point> = vec![];
        let mut edges: Vec<Edge> = vec![];

        for i in 0..vertices.len() {
            shape_points.push(vertices[i].clone());
            edges.push(Edge(i, if i + 1 == vertices.len() { 0 } else { i + 1 }));
        }

        let mut shape = CollisionShape {
            edges,
            shape_points,
            vertices,
            bounds: Bounds::empty(),
        };
        shape.update(None);
        shape
    }

    /// Checks if the bounding boxes of two shapes intersect.
    pub fn intersects_aabb(&self, shape: &CollisionShape) -> bool {
        self.bounds.intersects(&shape.bounds)
    }

    /// Checks if two edges intersect.
    pub fn intersects_edges(
        &self,
        a: &Point,
        b: &Point,
        e: &Point,
        f: &Point,
        as_segment: bool,
    ) -> bool {
        let a1 = b.1 - a.1;
        let a2 = f.1 - e.1;
        let b1 = a.0 - b.0;
        let b2 = e.0 - f.0;
        let denom = (a1 * b2) - (a2 * b1);

        if denom == 0.0 {
            return false;
        }

        if as_segment {
            let uc = (f.1 - e.1) * (b.0 - a.0) - (f.0 - e.0) * (b.1 - a.1);
            let ua = (((f.0 - e.0) * (a.1 - e.1)) - (f.1 - e.1) * (a.0 - e.0)) / uc;
            let ub = (((b.0 - a.0) * (a.1 - e.1)) - ((b.1 - a.1) * (a.0 - e.0))) / uc;

            return ua >= 0.0 && ua <= 1.0 && ub >= 0.0 && ub <= 1.0;
        }

        true
    }
}
```

### Fabric Implementation

- A FabricObject handles collision detection between irregular shapes.

```rust
/// fabric.rs

#[wasm_bindgen]
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct FabricObject {
    contour: CollisionShape,
    id: String,
}

impl FabricObject {
    pub fn new(arr: Vec<f64>, id: &str) -> Self {
        FabricObject {
            contour: CollisionShape::from_flat_array(arr),
            id: id.to_owned(),
        }
    }

    pub fn rect(&self) -> Rectangle {
        self.contour.rect()
    }
}

impl Collision<FabricObject> for FabricObject {
    fn contains(&self, another: &FabricObject) -> bool {
        self.contour.contains(&another.contour)
    }
    fn intersects(&self, another: &FabricObject) -> bool {
        self.contour.intersects(&another.contour)
    }
}
```

- The Fabric struct manages a collection of FabricObjects and exposes functionality to JavaScript.

```rust
#[wasm_bindgen]
pub struct Fabric {
    objects: Vec<FabricObject>,
}

#[wasm_bindgen]
impl Fabric {
    /// Creates a new `Fabric` instance from a JSON value.
    pub fn new(objects: JsValue) -> Fabric {
        let mut objects: Vec<FabricObject> = serde_wasm_bindgen::from_value(objects).unwrap();
        objects.sort_by(|a, b| b.contour.area().partial_cmp(&a.contour.area()).unwrap());

        Fabric { objects }
    }

    /// Returns the list of objects as a JSON value.
    pub fn get_objects(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.objects).unwrap()
    }

    /// Generates a hierarchical tree structure and returns it as a JSON value.
    pub fn generate_tree(&self) -> JsValue {
        let tree = &self.generate_tree_raw();
        serde_wasm_bindgen::to_value(&tree).unwrap()
    }
}
```

## Results

1. Rendering performance improved by 300 times compared to a pure JavaScript implementation.

2. The system can now handle up to 50,000 shapes without performance degradation.

3. The Rust-WASM implementation made the codebase more modular and easier to maintain.

## Conclusion

By leveraging Rust-WASM for intensive computation tasks, I successfully addressed the performance bottlenecks in a web app with intensive computation. This refactoring not only improved the tool's efficiency but also enhanced the overall user experience.
