import { localizeLinks } from "../../src/sites";
import { initSearch } from "./search";

localizeLinks();

initSearch({
  input: document.getElementById("search") as HTMLInputElement,
  results: document.getElementById("results")!,
});
