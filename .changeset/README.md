# Changesets

Run `node --run changeset` for every user-facing change, select the appropriate
semantic version bump, and commit the generated Markdown file with the change.

After changes land on `main`, the release workflow maintains a version pull
request. Merging that pull request publishes the package and creates a GitHub
Release.
