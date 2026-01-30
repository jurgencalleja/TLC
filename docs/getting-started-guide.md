# Getting Started with Claude Code + TLC

A complete beginner's guide to setting up your development environment.

**Coming from Replit?** This guide will help you set up a local environment that's faster, more powerful, and yours to keep.

---

## What You'll Set Up

| Tool | What It Does |
|------|--------------|
| **VS Code** | Your code editor (like Replit's editor, but better) |
| **Terminal** | Run commands (built into VS Code) |
| **Git** | Track your code changes |
| **Node.js** | Run JavaScript/TypeScript projects |
| **Claude Code** | AI coding assistant in your terminal |
| **TLC** | Test-led development workflow |

---

## Step 1: Install VS Code

**VS Code** is a free code editor from Microsoft. It's what most developers use.

### Windows

1. Go to https://code.visualstudio.com
2. Click **Download for Windows**
3. Run the installer
4. Check "Add to PATH" during install

### Mac

1. Go to https://code.visualstudio.com
2. Click **Download for Mac**
3. Drag VS Code to your Applications folder
4. Open VS Code, press `Cmd+Shift+P`, type "shell command", select **Install 'code' command in PATH**

### Linux

```bash
sudo snap install code --classic
```

### Verify It Works

Open VS Code. You should see a welcome screen.

---

## Step 2: Install Git

**Git** tracks changes to your code and lets you collaborate.

### Windows

1. Go to https://git-scm.com/download/win
2. Download and run the installer
3. Use all default options
4. **Important:** Select "Use Git from the Windows Command Prompt"

### Mac

Open Terminal (Cmd+Space, type "Terminal") and run:

```bash
xcode-select --install
```

Click "Install" when prompted.

### Linux

```bash
sudo apt install git    # Ubuntu/Debian
sudo dnf install git    # Fedora
```

### Configure Git

Open VS Code, then open the terminal (`Ctrl+`` or `Cmd+``):

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Verify It Works

```bash
git --version
```

Should show something like `git version 2.40.0`.

---

## Step 3: Install Node.js

**Node.js** runs JavaScript outside the browser.

### All Platforms

1. Go to https://nodejs.org
2. Download the **LTS** version (not Current)
3. Run the installer with default options

### Verify It Works

```bash
node --version    # Should show v20.x.x or similar
npm --version     # Should show 10.x.x or similar
```

---

## Step 4: Install Claude Code

**Claude Code** is the AI assistant that runs in your terminal.

### Prerequisites

You need an Anthropic API key or Claude Max subscription.

### Install

Open VS Code terminal and run:

```bash
npm install -g @anthropic-ai/claude-code
```

### First Run

```bash
claude
```

It will ask you to:
1. Enter your API key (or log in to Claude Max)
2. Accept the terms

### Verify It Works

You should see the Claude Code prompt:

```
claude>
```

Type `/help` to see available commands.

---

## Step 5: Install TLC

**TLC** (Test-Led Coding) helps you build software the right way - tests first.

```bash
npx tlc-claude-code --global
```

This installs TLC commands into Claude Code.

### Verify It Works

In Claude Code, type:

```
/tlc:help
```

You should see the list of TLC commands.

---

## Step 6: Create Your First Project

Now let's create a project!

### Create a Folder

```bash
mkdir my-first-project
cd my-first-project
```

### Initialize Git

```bash
git init
```

### Start TLC

In Claude Code:

```
/tlc:new-project
```

TLC will ask you:
1. What are you building?
2. Who will use it?
3. What tech stack?

Answer the questions, and TLC will:
- Create a project structure
- Set up testing
- Create a roadmap

---

## Your Development Workflow

### Daily Workflow

1. **Open VS Code** in your project folder
2. **Open terminal** (`Ctrl+`` or `Cmd+``)
3. **Run Claude Code**: `claude`
4. **Check status**: `/tlc`
5. **Work on tasks**: Follow TLC's recommendations

### The TLC Way

```
/tlc                    # See what's next
/tlc:build              # Write tests, then implement
/tlc:verify             # Test your work
```

### Saving Your Work

```bash
git add .
git commit -m "Describe what you did"
```

---

## VS Code Tips for Beginners

### Essential Shortcuts

| Action | Windows | Mac |
|--------|---------|-----|
| Open terminal | `Ctrl+`` | `Cmd+`` |
| Open file | `Ctrl+P` | `Cmd+P` |
| Search in files | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| Command palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Save file | `Ctrl+S` | `Cmd+S` |

### Recommended Extensions

Open VS Code, click Extensions (or `Ctrl+Shift+X`), and install:

1. **ESLint** - Finds problems in your code
2. **Prettier** - Formats your code nicely
3. **GitLens** - See who changed what
4. **Error Lens** - Shows errors inline

---

## Common Problems

### "command not found: node"

Node.js isn't in your PATH. Try:
- Windows: Restart VS Code
- Mac/Linux: Run `source ~/.bashrc` or restart terminal

### "command not found: git"

Git isn't installed or not in PATH:
- Windows: Make sure you selected "Use Git from Command Prompt" during install
- Mac: Run `xcode-select --install`

### "npm ERR! EACCES permission denied"

Don't use `sudo npm`. Instead:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Claude Code won't start

1. Check you have an API key: https://console.anthropic.com
2. Try: `claude --reset`
3. Reinstall: `npm install -g @anthropic-ai/claude-code`

---

## Replit vs Local: What's Different?

| Replit | Local |
|--------|-------|
| Code runs on their servers | Code runs on YOUR computer |
| Limited resources | Use all your computer's power |
| Pay for more power | Free (you own the hardware) |
| Can't work offline | Works anywhere |
| Files on their cloud | Files on your machine |
| Auto-saves | You control saves |

### Key Differences

1. **No "Run" button** - You run commands in terminal
2. **No auto-save** - Press `Ctrl+S` / `Cmd+S` to save
3. **Git is manual** - You commit changes yourself
4. **More control** - You set up exactly what you need

---

## Next Steps

1. **Practice Git** - Try https://learngitbranching.js.org
2. **Learn the terminal** - Basic commands: `cd`, `ls`, `mkdir`, `rm`
3. **Build something** - Start with `/tlc:new-project`
4. **Join communities** - Discord, Stack Overflow, GitHub

---

## Quick Reference Card

```
# Terminal Basics
cd folder-name          # Go into a folder
cd ..                   # Go back one folder
ls                      # List files (Mac/Linux)
dir                     # List files (Windows)
mkdir folder-name       # Create a folder

# Git Basics
git init                # Start tracking a project
git add .               # Stage all changes
git commit -m "message" # Save changes
git status              # See what's changed
git log                 # See history

# Node.js
npm install             # Install dependencies
npm test                # Run tests
npm start               # Start your app

# Claude Code
claude                  # Start Claude Code
/help                   # See commands
/tlc                    # TLC status

# TLC Commands
/tlc:new-project        # Start new project
/tlc:build              # Write tests + implement
/tlc:verify             # Test your work
```

---

**You're ready!** Start with `/tlc:new-project` and build something.
