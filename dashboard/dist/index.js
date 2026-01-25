#!/usr/bin/env node
import { jsx as _jsx } from "react/jsx-runtime";
import { render } from 'ink';
import { Readable } from 'stream';
import { App } from './App.js';
const isTTY = process.stdin.isTTY ?? false;
// For non-TTY environments, create a dummy stdin that won't try raw mode
const stdin = isTTY ? process.stdin : new Readable({ read() { } });
render(_jsx(App, { isTTY: isTTY }), {
    stdin: stdin,
    stdout: process.stdout,
    exitOnCtrlC: isTTY,
});
