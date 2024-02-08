import {basicSetup, EditorView} from "codemirror"
import {javascript, javascriptLanguage, scopeCompletionSource} from "@codemirror/lang-javascript"
import {autocompletion} from "@codemirror/autocomplete"


function createEditor(parentEl, completionFn) {
  return new EditorView({
    extensions: [
      basicSetup,
      javascript(),
      autocompletion({
        activateOnTypingDelay: 500,
        override: [
          scopeCompletionSource(globalThis),
          async (context) => {
            const pos = context.pos;
            const prefix = context.state.doc.sliceString(0, pos);
            const suffix = context.state.doc.sliceString(pos + 1);
            const output = await completionFn(prefix, suffix);
            if (!output) {
              return null;
            }

            const lines = output.split("\n");
            const label = lines.length == 1 ? output : lines[0] + "...";
            return {
              filter: false,
              from: context.pos,
              options: [{label: label, apply: output}],
            };
          }
        ],
      }),
    ],
    parent: document.body
  });
}

window.createEditor = createEditor;
