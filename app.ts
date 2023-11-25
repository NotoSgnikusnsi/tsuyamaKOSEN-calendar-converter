// deno-lint-ignore ban-types
const fetchHtmlSource = async (url: string): Promise<String> => {
  const response = await fetch(url);
  const html = await response.text();
  return html;
};

await fetchHtmlSource("https://www.tsuyama-ct.ac.jp/gyouji/gyouji.html").then(
  (html) => {
    console.log(html);
  },
);
