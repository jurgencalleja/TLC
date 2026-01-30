# Complete Beginner Guide

**Never coded before? Coming from Replit? This is your starting point.**

---

## What You Need

Before using TLC, you need to set up your computer for coding:

| Tool | What It Is | Time to Install |
|------|-----------|-----------------|
| VS Code | Where you write code | 5 min |
| Terminal | Where you run commands | Built into VS Code |
| Git | Tracks your code changes | 5 min |
| Node.js | Runs JavaScript | 5 min |
| Claude Code | AI that helps you code | 5 min |
| TLC | Makes sure your code works | 2 min |

**Total setup time: ~20 minutes**

---

## Step-by-Step Setup

### 1. Install VS Code (Your Editor)

VS Code is where you'll write all your code.

1. Go to https://code.visualstudio.com
2. Click the big download button
3. Run the installer
4. Open VS Code when done

**Learn more:** [VS Code Basics](https://code.visualstudio.com/docs/introvideos/basics)

---

### 2. Install Git (Track Your Code)

Git remembers every change you make so you can undo mistakes.

**Windows:**
1. Go to https://git-scm.com/download/win
2. Download and run installer
3. Click Next through everything (defaults are fine)

**Mac:**
1. Open Terminal (Cmd+Space, type "Terminal")
2. Type: `xcode-select --install`
3. Click Install

**Test it works:**
Open VS Code, press `Ctrl+`` (backtick) to open terminal, type:
```
git --version
```
Should show something like `git version 2.40.0`

**Learn more:** [Git for Beginners](https://www.freecodecamp.org/news/learn-the-basics-of-git-in-under-10-minutes-da548267cc91/)

---

### 3. Install Node.js (Run JavaScript)

Node.js lets you run JavaScript on your computer.

1. Go to https://nodejs.org
2. Download the **LTS** version (the safer option)
3. Run the installer

**Test it works:**
```
node --version
npm --version
```

**Learn more:** [Node.js Introduction](https://nodejs.dev/en/learn/)

---

### 4. Install Claude Code (Your AI Assistant)

Claude Code is the AI that helps you write code.

**Requirements:** You need either:
- Claude Max subscription ($20/month), OR
- Anthropic API key (pay per use)

**Install it:**
```
npm install -g @anthropic-ai/claude-code
```

**Start it:**
```
claude
```

First time will ask you to log in.

**Learn more:** [Claude Code Documentation](https://docs.anthropic.com/claude-code)

---

### 5. Install TLC (Test-Led Coding)

TLC makes sure your code actually works.

```
npx tlc-claude-code --global
```

**Test it works:**
In Claude Code, type:
```
/tlc:help
```

---

## Your First Project

Now let's build something!

### Create a Project Folder

In VS Code terminal:
```
mkdir my-first-app
cd my-first-app
git init
```

### Start TLC

In Claude Code:
```
/tlc:new-project
```

Answer the questions:
- **What are you building?** "A simple to-do list app"
- **Who uses it?** "Just me"
- **Any constraints?** "None"

TLC will set everything up for you.

### Build Your First Feature

```
/tlc
```

This shows what to do next. Just follow the recommendations!

---

## Essential Commands

### Terminal (where you type commands)

| Command | What It Does |
|---------|--------------|
| `cd folder` | Go into a folder |
| `cd ..` | Go back one folder |
| `ls` (Mac/Linux) or `dir` (Windows) | List files |
| `mkdir name` | Create a folder |

### Git (save your work)

| Command | What It Does |
|---------|--------------|
| `git add .` | Prepare all changes to save |
| `git commit -m "message"` | Save changes with a note |
| `git status` | See what changed |

### TLC (build software)

| Command | What It Does |
|---------|--------------|
| `/tlc` | See what's next |
| `/tlc:build` | Build the current phase |
| `/tlc:verify` | Test your work |

---

## Common Mistakes (and Fixes)

### "command not found"

The program isn't installed or your computer can't find it.

**Fix:** Close and reopen VS Code, then try again.

### "permission denied"

You don't have access to do something.

**Fix (Mac/Linux):** Add `sudo` before the command
**Fix (Windows):** Run VS Code as administrator

### "npm ERR!"

Something went wrong with npm.

**Fix:** Try running `npm cache clean --force` then try again.

### Code doesn't run

Make sure you saved the file (Ctrl+S / Cmd+S).

---

## Glossary

| Term | Meaning |
|------|---------|
| **Terminal** | The text box where you type commands |
| **Repository (repo)** | A project folder tracked by Git |
| **Commit** | A saved snapshot of your code |
| **npm** | Tool that installs JavaScript packages |
| **Package** | Code someone else wrote that you can use |
| **Test** | Code that checks if other code works |
| **TDD** | Test-Driven Development - write tests first |

---

## What's Next?

1. **Build something small** - Start with `/tlc:new-project`
2. **Learn Git** - Try https://learngitbranching.js.org
3. **Learn JavaScript** - Try https://javascript.info
4. **Join a community** - Discord, Reddit r/learnprogramming

---

## Getting Help

Stuck? Here's where to get help:

- **TLC Issues:** Ask on [GitHub](https://github.com/jurgencalleja/TLC/issues)
- **Claude Code:** Check [Anthropic Docs](https://docs.anthropic.com)
- **General coding:** [Stack Overflow](https://stackoverflow.com)
- **Free learning:** [freeCodeCamp](https://www.freecodecamp.org)

---

**You've got this!** Everyone starts somewhere. Just keep building.
