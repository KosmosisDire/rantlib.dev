// Wire a copy button from src/copy.html: it copies what text returns and shows a check for a moment.
export function initCopy(button: HTMLButtonElement, text: () => string) {
  const label = button.getAttribute("aria-label")!;
  let reset = 0;
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(text());
    button.classList.add("done");
    button.setAttribute("aria-label", "Copied");
    clearTimeout(reset);
    reset = setTimeout(() => {
      button.classList.remove("done");
      button.setAttribute("aria-label", label);
    }, 1500);
  });
}
