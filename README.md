# firefox copilot

Integrate Github Copilot with Firefox devtools

## Usage

Open `firefox` navigate to `about:debugging`, click on `This Firefox` and then
`Load Temporary Add-on`. Then click on `manifest.json` from your local clone of
this repo.

You will then be able to open devtools on any page (right-click > Inspect), and
a panel labeled `CoPilot` should be visible.

Currently this extension is just an interface to editing JavaScript code, but
the goal is to be able to use the source of the current page as context to use
copilot to script actions against the current page. An example usecase might be
navigating to a webpage, then asking copilot to write code to parse a table on
the page and extract all links from it.
