---
layout: default
---

# Source-Inspector: Locating source code

## Overview

[Source-inspector](https://github.com/yuyic/source-inspector) is a tool used for tracing source code by linking it to corresponding HTML tags. I originally obtained this idea through discussions with a counterpart from ByteDance, and then I implemented it for Webpack and Vite. Although now another repository [code-inspector](https://github.com/zh-lx/code-inspector) has implemented a more robust solution, I still believe the implementation of this project is worth sharing.

## Challenges

Sometimes, tracing front-end source code is difficult due to a cumbersome historical codebase. This is especially true for programmers who have just taken over a monolithic application. Bug fixes can be time-consuming due to the difficulty of tracing the source code.

## Solutions

We can retrieve source code information, such as column and row numbers, as well as the file path, when loading source files during the compilation stage and insert this information into HTML tags using a data attribute. Then users can open the relevant source file and navigate to the exact location in the source code by clicking the HTML tag.

### parsing AST

We can use SWC or Babel to parse the AST of React or Vue files. I am using Babel in this project.

- **Parsing the AST of React files is as follows:**

```javascript
// react-dataset.js

/**
 * Checks if an identifier is `undefined`
 */
function isUndefinedIdentifier(identifier) {
    return (
        t.isIdentifier(identifier) &&
        identifier.name === "undefined" &&
        identifier.loc.identifierName === "undefined"
    );
}

/**
 * Determines if a node represents a `React.createElement` call
 */
function isCreateElementExpression(node) {
    const callee = node.callee;
    return (
        node.type === "CallExpression" && // Ensure it's a function call
        callee.type === "MemberExpression" && // Ensure it's `React.createElement`
        callee.object.type === "Identifier" &&
        callee.object.name === "React" &&
        callee.property.type === "Identifier" &&
        callee.property.name === "createElement"
    );
}

/**
 * Extracts basic information from an AST node (name, line, column)
 */
function parseNodeInfo(node) {
    const { name, loc } = node;
    return {
        name: name?.name || "unknown", // Get node name, default to unknown
        line: loc.start?.line || 0, // Get start line number
        column: loc.start?.column || 0, // Get start column number
    };
}

/**
 * Babel plugin to process React code and add dataset attributes
 * @param {string} source - Input React source code
 * @param {{
 *   filename: string,
 *   factory: (line: number, column: number, displayName: string) => { key: string, value: string }
 * }} options - Configuration options with a factory method to create data attributes.
 * @returns {string} - Transformed code
 */
module.exports = function reactDataset(source, options) {
    const ast = parseModule(source); // Parse source code into AST

    let reactLocalName; // Stores the local import name of `react`
    let fragmentLocalName; // Stores the local import name of `Fragment`

    traverse(ast, {
        // Process `import React from 'react'`
        ImportDefaultSpecifier: {
            enter(path) {
                if (path.parent?.source?.value === "react") {
                    reactLocalName = path.node.local?.name; // Get React local import name
                }
            },
        },
        // Process `import { Fragment } from 'react'`
        ImportSpecifier: {
            enter(path) {
                if (
                    path.parent?.source?.value === "react" &&
                    path.node.imported.name === "Fragment"
                ) {
                    fragmentLocalName = path.node.local?.name; // Get Fragment local import name
                }
            },
        },
        // Process `React.createElement` calls
        CallExpression: {
            enter(path) {
                if (isCreateElementExpression(path.node)) {
                    const { line, column, name } = parseNodeInfo(path.node);
                    const { key, value } = options.factory(line, column, name);
                    const property = t.objectProperty(
                        t.stringLiteral(key),
                        t.stringLiteral(value)
                    );
                    const args = path.node.arguments;
                    // Ensure the second argument (props object) exists
                    if (
                        !args[1] ||
                        t.isNullLiteral(args[1]) ||
                        isUndefinedIdentifier(args[1])
                    ) {
                        args[1] = t.objectExpression([]);
                    }
                    args[1].properties.push(property); // Insert dataset attribute
                }
            },
        },
        // Process JSX elements
        JSXOpeningElement: {
            enter(path, state) {
                // Exclude `React.Fragment` or `Fragment`
                if (fragmentLocalName || reactLocalName) {
                    const nodeName = path.node?.name;
                    if (nodeName?.name === fragmentLocalName) {
                        return;
                    } else if (t.isJSXMemberExpression(nodeName)) {
                        if (
                            nodeName.object.name === reactLocalName &&
                            nodeName.property.name === "Fragment"
                        ) {
                            return;
                        }
                    }
                }
                const { line, column, name } = parseNodeInfo(path.node);
                const { key, value } = options.factory(line, column, name);
                const attr = t.jsxAttribute(
                    t.jsxIdentifier(key),
                    t.stringLiteral(value)
                );
                path.node.attributes.push(attr); // Insert dataset attribute into JSX element
            },
        },
        // Process object literals with `__open_editor__` comments
        ObjectExpression: {
            enter(path) {
                if (
                    path.node.innerComments?.some(
                        (comment) =>
                            String.prototype.trim.call(comment.value) ===
                            "__open_editor__"
                    )
                ) {
                    const { line, column, name } = parseNodeInfo(path.node);
                    const { key, value } = options.factory(line, column, name);
                    const property = t.objectProperty(
                        t.stringLiteral(key),
                        t.stringLiteral(value)
                    );
                    path.node.properties.push(property);
                }
            },
        },
    });
    return generateCode(ast); // Generate transformed code
};

```

- **Parsing the AST of vue files is as follows:**

```javascript
//vue-dataset.js

const { parse, transform } = require("@vue/compiler-dom"); 
const MagicString = require("magic-string"); 
/**
 * Vue plugin to process templates and add dataset attributes.
 * @param {string} source - Input Vue template source code.
 * @param {{
 *   filename: string,
 *   factory: (line: number, column: number, displayName: string) => { key: string, value: string }
 * }} options - Configuration options with a factory method to create data attributes.
 * @returns {string} - Transformed code.
 */
module.exports = function vueDataset(source, options) {
    const ast = parse(source); // Parse source code into AST
    const magic = new MagicString(source); // Create a modifiable string with position tracking
    
    // Find the <template> tag in the parsed AST
    const templateAst = ast.children.find((item) => item.tag === "template");

    if (templateAst) {
        transform(templateAst, {
            nodeTransforms: [
                (node) => {
                    // Process standard HTML elements inside the template (excluding <template> itself)
                    if (
                        node.type === 1 && // Ensure it's an element node
                        node.tagType === 0 && // Ensure it's a regular HTML tag
                        node.tag !== "template"
                    ) {
                        const { start } = node.loc; // Get node's position in the source code
                        const { key, value } = options.factory(
                            start.line,
                            start.column,
                            node.tag
                        );
                        const attribute = ` ${key}="${value}" `; // Create dataset attribute
                        const insertIdx = start.offset + node.tag.length + 1; 
                        magic.appendLeft(insertIdx, attribute); // Insert attribute into the tag
                    }
                },
            ],
        });
    }

    return magic.toString();
};

```

- **Implement relevant plugins in webpack or vite**

## Results

This tool has been successfully used in multiple large projects. It performed well and significantly enhanced the development experience.
