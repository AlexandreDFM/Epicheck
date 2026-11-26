/**
 * File Name: setDefaultFontFamily.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 01/12/2025
 * Description: Set default font family for all Text components
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

import { Text as RNText, TextInput as RNTextInput } from "react-native";

// Text and TextInput are forwardRef components: their render function exists
// at runtime but is not part of the public typings.
type ForwardRefComponent = {
    render?: (this: unknown, props: any, ref: any) => any;
};
const Text = RNText as unknown as ForwardRefComponent;
const TextInput = RNTextInput as unknown as ForwardRefComponent;

export const setDefaultFontFamily = () => {
    // Store the original render functions
    const TextRender = Text.render;
    const TextInputRender = TextInput.render;

    // Override Text render to add default font
    const defaultTextStyle = { fontFamily: "IBMPlexSans" };

    if (TextRender) {
        Text.render = function render(props: any, ref: any) {
            return TextRender.call(
                this,
                {
                    ...props,
                    style: [defaultTextStyle, props.style],
                },
                ref,
            );
        };
    }

    // Override TextInput render to add default font
    if (TextInputRender) {
        TextInput.render = function render(props: any, ref: any) {
            return TextInputRender.call(
                this,
                {
                    ...props,
                    style: [defaultTextStyle, props.style],
                },
                ref,
            );
        };
    }
};
