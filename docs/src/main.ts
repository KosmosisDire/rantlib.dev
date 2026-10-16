import { initCopy } from "../../src/copy";
import { localizeLinks } from "../../src/sites";
import { initSearch } from "./search";

localizeLinks();

// The $ before a command is drawn by CSS, so it is not in the copied text.
for (const button of document.querySelectorAll<HTMLButtonElement>(".code-block .copy")) {
  initCopy(button, () => button.previousElementSibling!.textContent ?? "");
}

initSearch({
  input: document.getElementById("search") as HTMLInputElement,
  results: document.getElementById("results")!,
});
