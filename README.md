# monkeywrench

Integrate Github's Copilot AI with Firefox's devtools! Have you ever wanted to
change the visibility of annoying elements on a website you were visiting but
didn't know how, or couldn't be bother to script it up in the console?
`monkeywrench` aims to make such tasks far more accessible by integrating Github
Copilot. Click on the picture below to see a demo video. Note that this project
is very much a work in progress.

[![blah](./example.png)](https://drive.google.com/file/d/1ilbsFBN79XrbGavJOUXeHEB_bYNO-_VK/view?usp=sharing)

The demo above shows usage of `ffcopilot` to generate code to hide blog posts
matching a certain string.

## Installation

This extension is still WIP so the process to install requires some manual
steps. Open `firefox` navigate to `about:debugging`, click on `This Firefox` and
then `Load Temporary Add-on`. Then click on `manifest.json` from your local
clone of this repo.


## Usage

You will then be able to open devtools on any page (right-click > Inspect), and
a panel labeled `CoPilot` should be visible.

copilot has limits on the maximum prompt size, so you will need to tweak the
query selector field to pick which elements are "visible" to the AI. You can
improve the quality of the suggestions by choosing a more restrictive selector.
While typing in the editor view, the AI will be activated whenever you stop
typing. You can manually request completions by pressing `Ctrl + Space`.

## Limitations

The context provided to the completions is very basic. There is an input field
where a query selector can be written to choose the elements that will be
"visible" to the AI. If the provided selector yields too large of a payload to
be used as context, a random sample of the selected node are sent. This sampling
process is far from ideal.
