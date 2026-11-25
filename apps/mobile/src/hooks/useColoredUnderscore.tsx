/**
 * File Name: useColoredUnderscore.tsx
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 28/11/2025
 * Description: This is the useColoredUnderscore.tsx
 * Copyright (c) 2025 Epitech
 * Version: 1.0.0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { useMemo } from "react";

function getRandomColor() {
    const colors = [
        "#FF0000", // red
        "#00FF00", // green
        "#FFFF00", // yellow
        "#FF00FF", // magenta
        "#00FFFF", // cyan
        "#FFA500", // orange
        "#800080", // purple
        "#A52A2A", // brown
        "#808080", // gray
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

export function useColoredUnderscore() {
    // Memoize color so it doesn't change on every render
    const color = useMemo(() => getRandomColor(), []);

    return {
        underscore: "_",
        color,
    };
}
