# Contributing

This is a general contribution guide for all of the [FlyDrive](https://github.com/flydrive-js) repos. Please read this guide thoroughly before contributing to any of the repos 🙏

Code is not the only way to contribute. Following are also some ways to contribute and become part of the community.

- Fixing typos in the documentation
- Improving existing docs
- Writing cookbooks or blog posts to educate others in the community
- Triaging issues
- Sharing your opinion on existing issues
- Help the community in [discord](https://discord.gg/vDcEjq6) by answering their questions.

## Reporting bugs

Many issues reported on open source projects are usually questions or misconfiguration at the reporter's end. Therefore, we highly recommend you properly troubleshoot your issues before reporting them.

If you're reporting a bug, include as much information as possible with the code samples you have written. The scale of good to bad issues looks as follows.

- **PERFECT ISSUE**: You isolate the underlying bug. Create a failing test in the repo and open a Github issue around it.
- **GOOD ISSUE**: You isolate the underlying bug and provide a minimal reproduction of it as a Github repo. Antfu has written a great article on [Why Reproductions are Required](https://antfu.me/posts/why-reproductions-are-required).
- **OKAYISH ISSUE**: You correctly state your issue. Share the code that produces the issue in the first place. Also, include the related configuration files and the package version you use.

  Last but not least is to format every code block properly by following the [Github markdown syntax guide](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax).

- **POOR ISSUE**: You dump the question you have with the hope that the other person will ask the relevant questions and help you. These kinds of issues are closed automatically without any explanation.

## Having a discussion

You often want to discuss a topic or maybe share some ideas. In that case, create an issue and prefix it with the **Idea** keyword. For example: `Idea - Should we add support for X`.

## Creating pull requests

It is never a good experience to have your pull request declined after investing a lot of time and effort in writing the code. Therefore, we highly recommend you to [kick off a discussion](https://github.com/flydrive-js/core/issues/new?title=Discussion%20for%20a%20new%20feature%20-%20%3CYOUR%20FEATURE%20NAME%3E) before starting any new work on your side.

Just start a discussion and explain what are you planning to contribute?

- **Are you trying to create a PR to fix a bug**: PRs for bugs are mostly accepted once the bug has been confirmed.
- **Are you planning to add a new feature**: Please thoroughly explain why this feature is required and share links to the learning material we can read to educate ourselves.

> Note: You should also be available to open additional PRs for documenting the contributed feature or improvement.

## Repository setup

1. Start by cloning the repo on your local machine.

   ```sh
   git clone <REPO_URL>
   ```

2. Install dependencies on your local. Please do not update any dependencies along with a feature request. If you find stale dependencies, create a separate PR to update them.

   We use `npm` for managing dependencies, therefore do not use `yarn` or any other tool.

   ```sh
   npm install
   ```

3. Run tests by executing the following command.

   ```sh
   npm test
   ```

## Tools in use

Following is the list of tools in use.

| Tool                   | Usage                                                                                                                                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript             | All of the repos are authored in TypeScript. The compiled JavaScript and Type-definitions are published on npm.                                                                                                                                                        |
| TS Node                | We use [ts-node](https://typestrong.org/ts-node/) to run tests or scripts without compiling TypeScript. The main goal of ts-node is to have a faster feedback loop during development                                                                                  |
| SWC                    | [SWC](https://swc.rs/) is a Rust based TypeScript compiler. TS Node ships with first-class support for using SWC over the TypeScript official compiler. The main reason for using SWC is the speed gain.                                                               |
| NP                     | We use [np](https://github.com/sindresorhus/np) to publish our packages on npm. Np does all the heavy lifting of creating a release and publishes it on npm and Github. The np config is defined within the `package.json` file.                                       |
| ESLint                 | ESLint helps us enforce a consistent coding style across all the repos with multiple contributors. All our ESLint rules are published under the [eslint-plugin-adonis](https://github.com/adonisjs-community/eslint-plugin-adonis) package.                            |
| Prettier               | We use prettier to format the codebase for consistent visual output. If you are confused about why we are using ESLint and Prettier both, then please read [Prettier vs. Linters](https://prettier.io/docs/en/comparison.html) doc on the Prettier website.            |
| EditorConfig           | The `.editorconfig` file in the root of every project configures your Code editor to use a set of rules for indentation and whitespace management. Again, Prettier is used for post formatting your code, and Editorconfig is used to configure the editor in advance. |
| Conventional Changelog | All of the commits across all the repos uses [commitlint](https://github.com/conventional-changelog/commitlint/#what-is-commitlint) to enforce consistent commit messages.                                                                                             |
| Husky                  | We use [husky](https://typicode.github.io/husky/#/) to enforce commit conventions when committing the code. Husky is a git hooks system written in Node                                                                                                                |

## Commands

| Command               | Description                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run test`        | Run project tests using `ts-node`                                                                                      |
| `npm run compile`     | Compile the TypeScript project to JavaScript. The compiled output is written inside the `build` directory              |
| `npm run release`     | Start the release process using `np`                                                                                   |
| `npm run lint`        | Lint the codebase using ESlint                                                                                         |
| `npm run format`      | Format the codebase using Prettier                                                                                     |
| `npm run sync-labels` | Sync the labels defined inside the `.github/labels.json` file with Github. This command is for the project admin only. |

## Coding style

All of my (Harminder Virk) projects are written in TypeScript. Also, slowly, I am also moving everything to pure ESM.

- You can learn more about [my coding style here](https://github.com/thetutlage/meta/discussions/3)
- Check out the setup I follow for [ESM and TypeScript here](https://github.com/thetutlage/meta/discussions/2)

Also, make sure to run the following commands before pushing the code.

```sh
# Formats using prettier
npm run format

# Lints using Eslint
npm run lint
```

## Getting recognized as a contributor

We rely on Github to list all the repo contributors in the right-side panel of the repo. Following is an example of the same.

Also, we use the [auto generate release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes#about-automatically-generated-release-notes) feature of Github, which adds a reference to the contributor profile within the release notes.
